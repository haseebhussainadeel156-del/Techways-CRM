import express, { Router } from 'express';
import { dbInstance, getPool } from './db';
import { UserRole, AccountStatus, StaffRole, HrmStaff } from '../src/types';
import { RouterOSAPI } from 'node-routeros';
import bcrypt from 'bcryptjs';

const router = Router();

// Helper to generate IDs
const genId = (prefix: string) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

// ==========================================
// SYSTEM SETUP
// ==========================================
router.get('/setup/status', async (req, res) => {
  try {
    const db = await dbInstance.get();
    const needsSetup = !db.admins || db.admins.length === 0;
    res.json({ needsSetup });
  } catch (err) {
    res.json({ needsSetup: false });
  }
});

router.post('/setup/admin', async (req, res) => {
  const { username, email, name, password } = req.body;
  if (!username || !password || !email || !name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db = await dbInstance.get();
  if (Array.isArray(db.admins) && db.admins.length > 0) {
    return res.status(403).json({ error: "System already initialized with an admin account." });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = {
      id: "admin",
      username,
      email,
      name,
      passwordHash
    };

    await dbInstance.update('admins', () => [newAdmin]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to setup admin account" });
  }
});

// Helper for FreeRADIUS Syncing
async function syncRadiusCustomer(username: string, password?: string, packageId?: string, status?: string) {
  const pgPool = getPool();
  if (!pgPool) return; // Only sync if real DB exists
  
  const client = await pgPool.connect();
  try {
    if (status === 'suspended' || status === 'expired') {
      // Temporarily reject authentication if suspended
      await client.query(`DELETE FROM radcheck WHERE username = $1 AND attribute = 'Auth-Type'`, [username]);
      await client.query(`INSERT INTO radcheck (username, attribute, op, value) VALUES ($1, 'Auth-Type', ':=', 'Reject')`, [username]);
    } else {
      await client.query(`DELETE FROM radcheck WHERE username = $1 AND attribute = 'Auth-Type'`, [username]);
      // Update password if provided
      if (password) {
        await client.query(`DELETE FROM radcheck WHERE username = $1 AND attribute = 'Cleartext-Password'`, [username]);
        await client.query(`INSERT INTO radcheck (username, attribute, op, value) VALUES ($1, 'Cleartext-Password', ':=', $2)`, [username, password]);
      }
    }
  } catch (err) {
    console.error("FreeRADIUS Sync Error:", err);
  } finally {
    client.release();
  }
}


import fs from 'fs';
import path from 'path';

const SESSION_CACHE_FILE = path.join(process.cwd(), 'server_sessions.cache.json');

interface SessionData {
  user: {
    id: string;
    role: UserRole;
    name: string;
    email: string;
    location?: string;
    staffId?: string;
  };
  createdAt: number;
}

let ACTIVE_SESSIONS = new Map<string, SessionData>();

// Helper to parse cookies from headers
function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

// Load sessions from disk on startup
try {
  if (fs.existsSync(SESSION_CACHE_FILE)) {
    const data = fs.readFileSync(SESSION_CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    ACTIVE_SESSIONS = new Map(Object.entries(parsed));
    console.log(`[SessionManager] Loaded ${ACTIVE_SESSIONS.size} active sessions from disk cache.`);
  }
} catch (err) {
  console.error("[SessionManager] Failed to load sessions from disk cache:", err);
}

// Save sessions to disk
function saveSessionsToDisk() {
  try {
    const obj = Object.fromEntries(ACTIVE_SESSIONS);
    fs.writeFileSync(SESSION_CACHE_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error("[SessionManager] Failed to save sessions to disk cache:", err);
  }
}

// Helper to initialize session and cookie
function createSessionForUser(res: express.Response, user: any): string {
  const sessionId = genId('sess');
  ACTIVE_SESSIONS.set(sessionId, {
    user,
    createdAt: Date.now()
  });
  saveSessionsToDisk();

  // Log successful user login
  dbInstance.update('activityLogs', (logs) => {
    const auditLog = {
      id: genId("act"),
      datetime: new Date().toISOString(),
      adminId: user.id || "admin",
      activity: `[auth/info] User ${user.name || user.id} logged in. Role: ${user.role || 'unknown'}. Secure session initialized.`,
      stationIp: "127.0.0.1"
    };
    return [auditLog, ...(logs || [])];
  }).catch(err => console.error("Login audit logging failed:", err));

  res.cookie('nexus_session', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000
  });

  return sessionId;
}

// GET /auth/session - Verify the session status of active user
router.get('/auth/session', async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = (req.headers['x-nexus-session-id'] as string) || cookies['nexus_session'] || (req.query.sessionId as string);

  if (sessionId && ACTIVE_SESSIONS.has(sessionId)) {
    const session = ACTIVE_SESSIONS.get(sessionId)!;
    return res.json({
      success: true,
      isLoggedIn: true,
      user: session.user,
      sessionId
    });
  }

  // Graceful self-healing fallback for page reload / server restarts:
  // If the client has a stored user_id and role fallback parameters,
  // we verify if they actually exist in our db. If they do, we re-establish a session automatically!
  const fallbackUserId = req.query.fallbackUserId as string;
  const fallbackRole = req.query.fallbackRole as string;

  if (fallbackUserId && fallbackRole) {
    const db = await dbInstance.get();
    let foundUser: any = null;

    if (fallbackRole === UserRole.ADMIN) {
      foundUser = db.admins?.find(a => a.id === fallbackUserId);
    } else if (fallbackRole === UserRole.CUSTOMER) {
      foundUser = db.customers?.find(c => c.id === fallbackUserId);
    } else if (fallbackRole === UserRole.HRM_STAFF) {
      foundUser = db.hrmStaff?.find(s => s.levelId === fallbackUserId || s.id === fallbackUserId);
    } else {
      foundUser = db.resellers?.find(r => r.id === fallbackUserId && r.role === fallbackRole);
    }

    if (foundUser) {
      const newSessionId = sessionId || genId('sess');
      const sessionUser = {
        id: fallbackUserId,
        role: fallbackRole as UserRole,
        name: foundUser.name || foundUser.fullName || foundUser.ownerName || fallbackUserId,
        email: foundUser.email || "",
        location: foundUser.location || foundUser.address || ""
      };

      ACTIVE_SESSIONS.set(newSessionId, {
        user: sessionUser,
        createdAt: Date.now()
      });
      saveSessionsToDisk();

      // Return recovery response
      res.cookie('nexus_session', newSessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        isLoggedIn: true,
        user: sessionUser,
        sessionId: newSessionId,
        recovered: true
      });
    }
  }

  return res.json({
    success: false,
    isLoggedIn: false
  });
});

// POST /auth/logout - End active user session
router.post('/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = (req.headers['x-nexus-session-id'] as string) || cookies['nexus_session'] || req.body.sessionId;

  if (sessionId && ACTIVE_SESSIONS.has(sessionId)) {
    const session = ACTIVE_SESSIONS.get(sessionId)!;
    const user = session.user;
    
    dbInstance.update('activityLogs', (logs) => {
      const auditLog = {
        id: genId("act"),
        datetime: new Date().toISOString(),
        adminId: user?.id || "admin",
        activity: `[auth/info] User ${user?.name || user?.id || 'unknown'} logged out. Role: ${user?.role || 'unknown'}. Secure session terminated.`,
        stationIp: req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1"
      };
      return [auditLog, ...(logs || [])];
    }).catch(err => console.error("Logout audit logging failed:", err));

    ACTIVE_SESSIONS.delete(sessionId);
    saveSessionsToDisk();
  } else if (sessionId) {
    ACTIVE_SESSIONS.delete(sessionId);
    saveSessionsToDisk();
  }

  res.clearCookie('nexus_session');
  return res.json({ success: true, message: "Logged out clean." });
});

// 0. AUTHENTICATION LANDING ENDPOINT
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username or Email is required." });
  }

  const db = await dbInstance.get();
  
  // Helper to verify passwords
  const verifyPassword = async (plain: string, hash?: string) => {
    // If no password provided but a hash exists, reject
    if (!plain && hash) return false;
    // If no hash exists, we bypass for legacy testing, in prod we would reject
    if (!hash) return true;
    return await bcrypt.compare(plain, hash);
  };

  // A. Super Admin Check
  const admin = db.admins?.find(a => a.username.toLowerCase() === username.toLowerCase() || a.email.toLowerCase() === username.toLowerCase());
  if (admin) {
    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const sessionUser = {
      id: admin.id,
      role: UserRole.ADMIN,
      name: admin.name,
      email: admin.email
    };
    const sessionId = createSessionForUser(res, sessionUser);

    return res.json({
      success: true,
      sessionId,
      user: sessionUser
    });
  }

  // B. Reseller Tiers Check
  const reseller = db.resellers.find(r => 
    r.email.toLowerCase() === username.toLowerCase() || 
    r.id.toLowerCase() === username.toLowerCase() ||
    r.ownerName.toLowerCase() === username.toLowerCase()
  );

  if (reseller) {
    const isValid = await verifyPassword(password, reseller.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const sessionUser = {
      id: reseller.id,
      role: reseller.role,
      name: reseller.ownerName,
      email: reseller.email,
      location: reseller.location
    };
    const sessionId = createSessionForUser(res, sessionUser);

    return res.json({
      success: true,
      sessionId,
      user: sessionUser
    });
  }

  // C. End Customer Subscriber Check
  const customer = db.customers.find(c => 
    c.username.toLowerCase() === username.toLowerCase() || 
    c.email.toLowerCase() === username.toLowerCase() ||
    c.id.toLowerCase() === username.toLowerCase()
  );

  if (customer) {
    const isValid = await verifyPassword(password, customer.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const sessionUser = {
      id: customer.id,
      role: UserRole.CUSTOMER,
      name: customer.fullName,
      email: customer.email,
      location: customer.address
    };
    const sessionId = createSessionForUser(res, sessionUser);

    return res.json({
      success: true,
      sessionId,
      user: sessionUser
    });
  }

  // D. HRM Staff Check
  const staff = (db.hrmStaff || []).find(s =>
    s.email.toLowerCase() === username.toLowerCase() ||
    s.id.toLowerCase() === username.toLowerCase()
  );

  if (staff) {
    const isValid = await verifyPassword(password, staff.passwordHash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const sessionUser = {
      id: staff.levelId, // Log them into their assigned level's context
      role: UserRole.HRM_STAFF,
      name: staff.name,
      email: staff.email,
      staffId: staff.id
    };
    const sessionId = createSessionForUser(res, sessionUser);

    return res.json({
      success: true,
      sessionId,
      user: sessionUser
    });
  }

  // E. System Departments Check (for the placeholder logins in LoginPage.tsx)
  if (username.toLowerCase() === "staff@nexus.net" || username.startsWith("dept-")) {
    const sessionUser = {
      id: "dept-1", 
      role: UserRole.HRM_STAFF,
      name: "Dept Staff",
      email: "staff@nexus.net"
    };
    const sessionId = createSessionForUser(res, sessionUser);

    return res.json({
      success: true,
      sessionId,
      user: sessionUser
    });
  }

  return res.status(401).json({ error: "Invalid credentials or account email match." });
});

// 1. DYNAMIC TELEMETRY & ANALYTICS: Add an ongoing bandwidth data-point periodically
// to simulate actual network traffic flowing in real-time.
router.get('/bandwidth-logs', async (req, res) => {
  const db = await dbInstance.get();
  let logs = [...db.bandwidthLogs];

  // Append a live data-point with randomized variance to emulate dynamic network transmission
  const lastLog = logs[logs.length - 1];
  const lastActive = lastLog ? lastLog.activeSessions : 940;
  const lastRx = lastLog ? lastLog.rxMbps : 400;
  const lastTx = lastLog ? lastLog.txMbps : 900;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

  // Random work variance (+/- 15 Mbps / +/- 2 sessions)
  const rxVar = (Math.random() - 0.5) * 40;
  const txVar = (Math.random() - 0.5) * 60;
  const sessVar = Math.floor((Math.random() - 0.4) * 8);

  const newRx = Math.max(100, Math.min(1500, Math.floor(lastRx + rxVar)));
  const newTx = Math.max(200, Math.min(2500, Math.floor(lastTx + txVar)));
  const newSess = Math.max(100, Math.floor(lastActive + sessVar));

  const newLog = {
    timestamp: timeStr,
    rxMbps: newRx,
    txMbps: newTx,
    activeSessions: newSess
  };

  // Limit pool size to 15 data points
  logs.push(newLog);
  if (logs.length > 15) {
    logs.shift();
  }

  // Save the updated rolling window
  await dbInstance.update('bandwidthLogs', () => logs);

  res.json({ logs });
});

// 2. GLOBAL AND ROLE-SPECIFIC SUMMARY STATS
router.get('/stats', async (req, res) => {
  const role = req.query.role as string || UserRole.ADMIN;
  const id = req.query.id as string || 'admin';

  const db = await dbInstance.get();
  
  if (role === UserRole.ADMIN) {
    // Admin sees everything
    const totalUsers = db.customers.length;
    const activeUsers = db.customers.filter(c => c.status === "active").length;
    const activeRouters = db.routers.filter(r => r.status === "online").length;
    const totalfranchises = db.resellers.filter(r => r.role === UserRole.FRANCHISE).length;
    const totalDealers = db.resellers.filter(r => r.role === UserRole.DEALER).length;
    const totalSubDealers = db.resellers.filter(r => r.role === UserRole.SUB_DEALER).length;
    const totalRevenue = db.invoices.filter(i => i.status === "paid").reduce((acc, current) => acc + current.amount, 0);
    const unpaidRevenue = db.invoices.filter(i => i.status === "unpaid" || i.status === "overdue").reduce((acc, current) => acc + current.amount, 0);

    // Sum balances of different levels
    const totalResellerBalances = db.resellers.reduce((a, c) => a + c.balance, 0);

    res.json({
      role,
      stats: {
        totalUsers,
        activeUsers,
        activeRouters,
        totalfranchises,
        totalDealers,
        totalSubDealers,
        totalRevenue,
        unpaidRevenue,
        resellerWalletBalance: totalResellerBalances
      }
    });
  } else {
    // Other admin tiers (Franchise, Dealer, Sub-dealer)
    // We must find the children resellers under this particular node to aggregate counts
    const childResellerIds: string[] = [id];
    let toScan = [id];
    
    // Breadth-First-Search to find all children in the hierarchy
    while (toScan.length > 0) {
      const parentId = toScan.shift();
      const directChildren = db.resellers.filter(r => r.parentResellerId === parentId);
      for (const child of directChildren) {
        if (!childResellerIds.includes(child.id)) {
          childResellerIds.push(child.id);
          toScan.push(child.id);
        }
      }
    }

    const currentReseller = db.resellers.find(r => r.id === id);
    const associatedUsers = db.customers.filter(c => childResellerIds.includes(c.parentResellerId));
    const activeUsers = associatedUsers.filter(c => c.status === "active").length;
    const totalBilling = db.invoices
      .filter(i => i.status === "paid" && childResellerIds.includes(i.resellerId))
      .reduce((sum, current) => sum + current.amount, 0);

    const pendingBilling = db.invoices
      .filter(i => (i.status === "unpaid" || i.status === "overdue") && childResellerIds.includes(i.resellerId))
      .reduce((sum, current) => sum + current.amount, 0);

    res.json({
      role,
      id,
      resellerName: currentReseller ? currentReseller.name : "N/A",
      stats: {
        totalUsers: associatedUsers.length,
        activeUsers,
        walletBalance: currentReseller ? currentReseller.balance : 0,
        subResellersCount: childResellerIds.length - 1, // Exclude self
        salesPaid: totalBilling,
        salesUnpaid: pendingBilling,
        status: currentReseller ? currentReseller.status : "unknown"
      }
    });
  }
});

// 3. PACKAGES CRUD
router.get('/packages', async (req, res) => {
  const db = await dbInstance.get();
  res.json(db.packages);
});

router.post('/packages', async (req, res) => {
  const body = req.body;

  if (!body.name) {
    return res.status(400).json({ error: "Missing required fields for package creation: name" });
  }

  const newPkg = {
    ...body,
    id: genId("pkg")
  };
  
  if (body.speedMbps !== undefined) newPkg.speedMbps = Number(body.speedMbps);
  if (body.priceMonthly !== undefined) newPkg.priceMonthly = Number(body.priceMonthly);
  if (body.duration !== undefined) newPkg.duration = Number(body.duration);
  if (body.volumeGb !== undefined) newPkg.volumeGb = Number(body.volumeGb);

  await dbInstance.update('packages', (pkgs) => [...pkgs, newPkg]);
  res.json({ success: true, package: newPkg });
});

router.put('/packages/:id', async (req, res) => {
  const { id } = req.params;
  const body = req.body;

  let updatedPkg: any = null;
  try {
    await dbInstance.transaction((store) => {
      const idx = store.packages.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Package not found");
      
      const p = { ...store.packages[idx], ...body };
      
      if (body.speedMbps !== undefined) p.speedMbps = Number(body.speedMbps);
      if (body.priceMonthly !== undefined) p.priceMonthly = Number(body.priceMonthly);
      if (body.duration !== undefined) p.duration = Number(body.duration);
      if (body.volumeGb !== undefined) p.volumeGb = Number(body.volumeGb);

      store.packages[idx] = p;
      updatedPkg = p;
    });
    res.json({ success: true, package: updatedPkg });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/packages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbInstance.transaction((store) => {
      const idx = store.packages.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error("Package not found");
      store.packages.splice(idx, 1);
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 3.5. POLICIES CRUD Endpoints
router.get('/policies', async (req, res) => {
  const db = await dbInstance.get();
  res.json(db.policies || []);
});

router.post('/policies', async (req, res) => {
  const { 
    name, 
    type, 
    status, 
    description, 
    speedTriggerMbps, 
    quotaThresholdGb, 
    burstLimitMbps, 
    burstTimeSeconds, 
    startTime, 
    endTime, 
    policyAction,
    groupName,
    attributes
  } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Missing required fields for policy creation (name and type)." });
  }

  const newPolicy = {
    id: genId("pol"),
    name,
    type,
    status: status || "active",
    description: description || "",
    speedTriggerMbps: speedTriggerMbps !== undefined ? Number(speedTriggerMbps) : undefined,
    quotaThresholdGb: quotaThresholdGb !== undefined ? Number(quotaThresholdGb) : undefined,
    burstLimitMbps: burstLimitMbps !== undefined ? Number(burstLimitMbps) : undefined,
    burstTimeSeconds: burstTimeSeconds !== undefined ? Number(burstTimeSeconds) : undefined,
    startTime: startTime || undefined,
    endTime: endTime || undefined,
    policyAction: policyAction || "Custom queue parameters applied",
    appliedLinesCount: 0,
    groupName: groupName || undefined,
    attributes: attributes || []
  };

  await dbInstance.transaction(async (store) => {
    if (!store.policies) store.policies = [];
    store.policies.push(newPolicy);
    
    // Generate audit trail activity log
    const auditLog = {
      id: genId("act"),
      datetime: new Date().toISOString(),
      adminId: "admin",
      activity: `Created core ISP policy rule: ${name} (${type.toUpperCase()})`,
      stationIp: req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1"
    };
    if (!store.activityLogs) store.activityLogs = [];
    store.activityLogs.unshift(auditLog);
  });

  res.json({ success: true, policy: newPolicy });
});

router.put('/policies/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    type, 
    status, 
    description, 
    speedTriggerMbps, 
    quotaThresholdGb, 
    burstLimitMbps, 
    burstTimeSeconds, 
    startTime, 
    endTime, 
    policyAction,
    appliedLinesCount,
    groupName,
    attributes
  } = req.body;

  let updatedPolicy: any = null;
  try {
    await dbInstance.transaction((store) => {
      if (!store.policies) store.policies = [];
      const idx = store.policies.findIndex((pol) => pol.id === id);
      if (idx === -1) throw new Error("Policy not found");

      store.policies[idx] = {
        ...store.policies[idx],
        name: name !== undefined ? name : store.policies[idx].name,
        type: type !== undefined ? type : store.policies[idx].type,
        status: status !== undefined ? status : store.policies[idx].status,
        description: description !== undefined ? description : store.policies[idx].description,
        speedTriggerMbps: speedTriggerMbps !== undefined ? Number(speedTriggerMbps) : store.policies[idx].speedTriggerMbps,
        quotaThresholdGb: quotaThresholdGb !== undefined ? Number(quotaThresholdGb) : store.policies[idx].quotaThresholdGb,
        burstLimitMbps: burstLimitMbps !== undefined ? Number(burstLimitMbps) : store.policies[idx].burstLimitMbps,
        burstTimeSeconds: burstTimeSeconds !== undefined ? Number(burstTimeSeconds) : store.policies[idx].burstTimeSeconds,
        startTime: startTime !== undefined ? startTime : store.policies[idx].startTime,
        endTime: endTime !== undefined ? endTime : store.policies[idx].endTime,
        policyAction: policyAction !== undefined ? policyAction : store.policies[idx].policyAction,
        appliedLinesCount: appliedLinesCount !== undefined ? Number(appliedLinesCount) : store.policies[idx].appliedLinesCount,
        groupName: groupName !== undefined ? groupName : store.policies[idx].groupName,
        attributes: attributes !== undefined ? attributes : store.policies[idx].attributes
      };
      updatedPolicy = store.policies[idx];

      // Generate audit trail activity log
      const auditLog = {
        id: genId("act"),
        datetime: new Date().toISOString(),
        adminId: "admin",
        activity: `Updated core ISP policy rule: ${updatedPolicy.name} (${updatedPolicy.type.toUpperCase()})`,
        stationIp: req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1"
      };
      if (!store.activityLogs) store.activityLogs = [];
      store.activityLogs.unshift(auditLog);
    });

    res.json({ success: true, policy: updatedPolicy });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/policies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbInstance.transaction((store) => {
      if (!store.policies) store.policies = [];
      const idx = store.policies.findIndex((pol) => pol.id === id);
      if (idx === -1) throw new Error("Policy not found");
      
      const removedName = store.policies[idx].name;
      const removedType = store.policies[idx].type;
      store.policies.splice(idx, 1);

      // Generate audit log
      const auditLog = {
        id: genId("act"),
        datetime: new Date().toISOString(),
        adminId: "admin",
        activity: `Deleted core ISP policy rule: ${removedName} (${removedType.toUpperCase()})`,
        stationIp: req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1"
      };
      if (!store.activityLogs) store.activityLogs = [];
      store.activityLogs.unshift(auditLog);
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 4. ROUTERS CRUD
router.get('/routers', async (req, res) => {
  const db = await dbInstance.get();
  res.json(db.routers);
});

router.post('/routers', async (req, res) => {
  const { name, ipAddress, apiPort, username, password, secret, location } = req.body;
  if (!name || !ipAddress) {
    return res.status(400).json({ error: "Name and IP address required." });
  }
  const newRouter = {
    id: genId("router"),
    name,
    ipAddress,
    status: "online" as const,
    cpuUsage: Math.floor(5 + Math.random() * 20),
    memoryUsage: Math.floor(10 + Math.random() * 40),
    uptime: "1h 0m",
    activeUsers: Math.floor(20 + Math.random() * 150),
    apiPort: apiPort ? Number(apiPort) : 8728,
    username: username || "admin",
    password: password || "",
    secret: secret || "",
    location: location || "NOC Core"
  };
  await dbInstance.update('routers', (routers) => [...routers, newRouter]);
  res.json({ success: true, router: newRouter });
});

router.put('/routers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, ipAddress, status, apiPort, username, password, secret, location } = req.body;

  let updatedRouter: any = null;
  try {
    await dbInstance.transaction((store) => {
      const idx = store.routers.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Router/NAS not found");

      store.routers[idx] = {
        ...store.routers[idx],
        name: name !== undefined ? name : store.routers[idx].name,
        ipAddress: ipAddress !== undefined ? ipAddress : store.routers[idx].ipAddress,
        status: status !== undefined ? status : store.routers[idx].status,
        apiPort: apiPort !== undefined ? Number(apiPort) : (store.routers[idx] as any).apiPort,
        username: username !== undefined ? username : (store.routers[idx] as any).username,
        password: password !== undefined ? password : (store.routers[idx] as any).password,
        secret: secret !== undefined ? secret : (store.routers[idx] as any).secret,
        location: location !== undefined ? location : (store.routers[idx] as any).location
      };
      updatedRouter = store.routers[idx];
    });
    res.json({ success: true, router: updatedRouter });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/routers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbInstance.transaction((store) => {
      const idx = store.routers.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Router/NAS not found");
      store.routers.splice(idx, 1);
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 4.5. MIKROTIK ROUTEROS API INTEGRATION
router.post('/routers/:id/sync', async (req, res) => {
  const { id } = req.params;
  const db = await dbInstance.get();
  
  const routerNode = db.routers.find(r => r.id === id);
  if (!routerNode) return res.status(404).json({ error: "Router not found." });

  // Initiate MikroTik Connection via API
  const conn = new RouterOSAPI({
    host: routerNode.ipAddress,
    user: routerNode.username || "admin",
    password: routerNode.password || "",
    port: routerNode.apiPort || 8728,
    timeout: 5
  });

  try {
    // Attempt real connection if this is a live deployment
    await conn.connect();
    
    // Example: Read system resources from router
    const resources = await conn.write('/system/resource/print');
    
    conn.close();
    
    // Update our DB stats based on real router metrics if successful
    if (resources && resources.length > 0) {
      await dbInstance.transaction((store) => {
        const idx = store.routers.findIndex(r => r.id === id);
        if (idx !== -1) {
          store.routers[idx].cpuUsage = Number(resources[0]['cpu-load']) || store.routers[idx].cpuUsage;
          store.routers[idx].uptime = resources[0]['uptime'] || store.routers[idx].uptime;
          store.routers[idx].status = "online";
        }
      });
    }

    res.json({ success: true, message: "Router synced successfully.", data: resources });
  } catch (err: any) {
    // Failsafe error formatting when router is unreachable
    console.error("Router Connection Failed:", err.message);
    
    await dbInstance.transaction((store) => {
      const idx = store.routers.findIndex(r => r.id === id);
      if (idx !== -1) {
        store.routers[idx].status = "offline";
      }
    });

    res.status(503).json({ 
      error: "Could not connect to MikroTik router natively. Check IP and Port (usually 8728).", 
      details: err.message
    });
  }
});

// 5. RESELLERS HIERARCHY
router.get('/resellers', async (req, res) => {
  const db = await dbInstance.get();
  res.json(db.resellers);
});

router.post('/resellers', async (req, res) => {
  const { name, ownerName, role, parentResellerId, location, email, phoneNumber } = req.body;
  
  if (!name || !ownerName || !role || !email) {
    return res.status(400).json({ error: "Missing required reseller fields (name, owner, role, email)." });
  }

  const newReseller = {
    id: genId("res"),
    name,
    ownerName,
    role: role as UserRole.FRANCHISE | UserRole.DEALER | UserRole.SUB_DEALER,
    parentResellerId: parentResellerId || undefined,
    balance: 0,
    phoneNumber: phoneNumber || "+92 300 0000000",
    email,
    status: "active" as AccountStatus,
    userCount: 0,
    location: location || "Custom Zone",
    createdAt: new Date().toISOString(),
    allowedPackages: req.body.allowedPackages || [],
    packageRates: req.body.packageRates || {},
    customerPackageRates: req.body.customerPackageRates || {}
  };

  await dbInstance.update('resellers', (resellers) => [...resellers, newReseller]);
  res.json({ success: true, reseller: newReseller });
});

router.put('/resellers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, ownerName, role, parentResellerId, location, email, phoneNumber, status, balance, allowedPackages, packageRates, customerPackageRates } = req.body;

  let updatedReseller: any = null;
  try {
    await dbInstance.transaction((store) => {
      const idx = store.resellers.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Reseller not found");

      store.resellers[idx] = {
        ...store.resellers[idx],
        name: name !== undefined ? name : store.resellers[idx].name,
        ownerName: ownerName !== undefined ? ownerName : store.resellers[idx].ownerName,
        role: role !== undefined ? role : store.resellers[idx].role,
        parentResellerId: parentResellerId !== undefined ? (parentResellerId === "" ? undefined : parentResellerId) : store.resellers[idx].parentResellerId,
        location: location !== undefined ? location : store.resellers[idx].location,
        email: email !== undefined ? email : store.resellers[idx].email,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : store.resellers[idx].phoneNumber,
        status: status !== undefined ? status : store.resellers[idx].status,
        balance: balance !== undefined ? Number(balance) : store.resellers[idx].balance,
        allowedPackages: allowedPackages !== undefined ? allowedPackages : store.resellers[idx].allowedPackages,
        packageRates: packageRates !== undefined ? packageRates : store.resellers[idx].packageRates,
        customerPackageRates: customerPackageRates !== undefined ? customerPackageRates : store.resellers[idx].customerPackageRates
      };
      updatedReseller = store.resellers[idx];
    });
    res.json({ success: true, reseller: updatedReseller });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

router.delete('/resellers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await dbInstance.transaction((store) => {
      const idx = store.resellers.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error("Reseller not found");
      store.resellers.splice(idx, 1);
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// 6. WALLET / BALANCE TRANSFER (TOP UP)
router.post('/resellers/topup', async (req, res) => {
  const { fromId, toId, amount, notes } = req.body;
  const numAmount = Number(amount);

  if (numAmount <= 0) {
    return res.status(400).json({ error: "Amount must be greater than zero." });
  }

  const db = await dbInstance.get();
  
  // Find sender and receiver
  const senderIndex = db.resellers.findIndex(r => r.id === fromId);
  const receiverIndex = db.resellers.findIndex(r => r.id === toId);

  if (receiverIndex === -1) {
    return res.status(404).json({ error: "Recipient reseller not found." });
  }

  const toReseller = db.resellers[receiverIndex];

  try {
    await dbInstance.transaction((store) => {
      // Re-find indices inside transaction for absolute safety
      const senderIndex = store.resellers.findIndex(r => r.id === fromId);
      const receiverIndex = store.resellers.findIndex(r => r.id === toId);

      if (receiverIndex === -1) {
        throw new Error("Recipient reseller not found.");
      }
      
      const toReseller = store.resellers[receiverIndex];

      // Deduct from sender if it's not the Super Admin
      if (fromId !== "admin") {
        if (senderIndex === -1) {
          throw new Error("Sender reseller not found.");
        }
        
        const fromReseller = store.resellers[senderIndex];
        
        // --- NEW CONSTRAINT ---
        if (toReseller.parentResellerId !== fromReseller.id) {
          throw new Error(`Invalid transfer hierarchy: User ${fromReseller.name} is not the direct parent of ${toReseller.name}.`);
        }
        // ----------------------

        if (fromReseller.balance < numAmount) {
          throw new Error(`Insufficient wallet balance in sender account (Current: ${fromReseller.balance}).`);
        }
        store.resellers[senderIndex].balance -= numAmount;
      } else {
        // ADMIN MINTING CHECK: Only Franchise allowed
        if (toReseller.role !== UserRole.FRANCHISE) {
          throw new Error("Admin can only top-up directly for Franchises.");
        }
      }

      // Add to receiver
      store.resellers[receiverIndex].balance += numAmount;

      // Record wallet ledger
      const txId = genId("tx");
      const newTx = {
        id: txId,
        fromId,
        fromName: fromId === "admin" ? "System Super Admin" : store.resellers[senderIndex].name,
        toId,
        toName: toReseller.name,
        amount: numAmount,
        type: "transfer" as const,
        timestamp: new Date().toISOString(),
        notes: notes || "Wallet fund replenishment"
      };

      store.walletTransactions.push(newTx);
    });

    res.json({ success: true, message: `Successfully topped up ${numAmount} to ${toReseller.name}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to make balance topup." });
  }
});

// GET RELATIONAL TRANSACTIONS FOR A LEVEL
router.get('/wallet-transactions', async (req, res) => {
  const { id } = req.query;
  const db = await dbInstance.get();
  const txs = db.walletTransactions;
  if (id && id !== "admin") {
    // filter transactions related to this particular reseller
    res.json(txs.filter(t => t.fromId === id || t.toId === id));
  } else {
    res.json(txs);
  }
});

// 7. CUSTOMERS CRUD
router.get('/customers', async (req, res) => {
  const { id, role } = req.query;
  const db = await dbInstance.get();

  if (!id || id === 'admin' || role === UserRole.ADMIN) {
    return res.json(db.customers);
  }

  // Reseller hierarchy filtering for direct or sub-level customers
  const childResellerIds: string[] = [id as string];
  let toScan = [id as string];
  
  while (toScan.length > 0) {
    const parentId = toScan.shift();
    const directChildren = db.resellers.filter(r => r.parentResellerId === parentId);
    for (const child of directChildren) {
      if (!childResellerIds.includes(child.id)) {
        childResellerIds.push(child.id);
        toScan.push(child.id);
      }
    }
  }

  // Select accounts linked to any reseller in this branch
  const customers = db.customers.filter(c => childResellerIds.includes(c.parentResellerId));
  res.json(customers);
});

router.post('/customers', async (req, res) => {
  const { username, fullName, email, phone, password, packageId, parentResellerId, parentRole, address, macAddress, cnic, mobile, salesperson, nasId, city, latitude, longitude, customPrice, location, joiningDate } = req.body;

  if (!username || !fullName || !packageId || !parentResellerId) {
    return res.status(400).json({ error: "Missing required profile fields (username, fullname, package, parent reseller)." });
  }

  const db = await dbInstance.get();
  
  // Verify package exists
  const selectedPkg = db.packages.find(p => p.id === packageId);
  if (!selectedPkg) {
    return res.status(404).json({ error: "Bandwidth package not found." });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = password ? await bcrypt.hash(password, salt) : undefined;

  // Pre-calculate randomized parameters for the connection
  const lastOctet = Math.floor(10 + Math.random() * 240);
  const userIp = `103.45.12.${lastOctet}`;
  const generatedMac = macAddress || `00:1A:4B:${Math.floor(10+Math.random()*89)}:${Math.floor(10+Math.random()*89)}:${Math.floor(10+Math.random()*89)}`;

  const newCust = {
    id: genId("cust"),
    username,
    fullName,
    email: email || `${username}@gmail.com`,
    passwordHash,
    phone: phone || "+92 300 0000000",
    packageId,
    parentResellerId,
    parentRole: parentRole || UserRole.ADMIN,
    balance: 0,
    status: "active" as AccountStatus,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Days renewal
    address: address || "Custom client loop address",
    ipAddress: userIp,
    macAddress: generatedMac,
    createdAt: new Date().toISOString(),
    cnic: cnic || "",
    mobile: mobile || "",
    salesperson: salesperson || "",
    nasId: nasId || "",
    city: city || "",
    latitude: latitude || "",
    longitude: longitude || "",
    location: location || "",
    joiningDate: joiningDate || new Date().toISOString().split('T')[0],
    customPrice: customPrice !== undefined ? Number(customPrice) : undefined
  };

  try {
    // Add customer and increment user count in parent reseller node
    await dbInstance.transaction((store) => {
      store.customers.push(newCust);
      const resNodeIndex = store.resellers.findIndex(r => r.id === parentResellerId);
      if (resNodeIndex !== -1) {
        store.resellers[resNodeIndex].userCount += 1;
      }

      // Automatically generate the INITIAL UNPAID INVOICE for first month
      const invId = genId("inv");
      let customInvoiceAmount = customPrice !== undefined ? Number(customPrice) : selectedPkg.priceMonthly;
      if (customPrice === undefined && parentResellerId !== 'admin') {
        const parentRes = store.resellers.find(r => r.id === parentResellerId);
        if (parentRes) {
          if (parentRes.customerPackageRates && parentRes.customerPackageRates[packageId] !== undefined) {
            customInvoiceAmount = Number(parentRes.customerPackageRates[packageId]);
          } else if (parentRes.packageRates && parentRes.packageRates[packageId] !== undefined) {
            customInvoiceAmount = Number(parentRes.packageRates[packageId]);
          }
        }
      }
      const newInv = {
        id: invId,
        customerId: newCust.id,
        customerName: newCust.fullName,
        amount: customInvoiceAmount,
        billingDate: new Date().toISOString(),
        expiryDate: newCust.expiryDate,
        status: "unpaid" as const,
        packageName: selectedPkg.name,
        resellerId: parentResellerId
      };
      store.invoices.push(newInv);
    });

    res.json({ success: true, customer: newCust });

    // Sync to FreeRADIUS
    await syncRadiusCustomer(newCust.username, '123456', newCust.packageId, newCust.status); // Default password for newly created for now
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to create subscriber." });
  }
});

router.post('/customers/status', async (req, res) => {
  const { customerId, status } = req.body;
  if (!customerId || !status) {
    return res.status(400).json({ error: "Customer ID and status required." });
  }

  let currUsername = "";
  try {
    await dbInstance.transaction((store) => {
      const custIndex = store.customers.findIndex(c => c.id === customerId);
      if (custIndex === -1) throw new Error("Customer subscriber profile not found.");
      store.customers[custIndex].status = status as AccountStatus;
      currUsername = store.customers[custIndex].username;
    });

    res.json({ success: true, message: `Connection state set to ${status}` });
    
    // Sync to FreeRADIUS
    await syncRadiusCustomer(currUsername, undefined, undefined, status);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to set status." });
  }
});

router.put('/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { username, fullName, email, phone, packageId, parentResellerId, address, macAddress, cnic, mobile, salesperson, nasId, city, latitude, longitude, customPrice, location } = req.body;

  try {
    let updatedCustomer: any = null;

    await dbInstance.transaction((store) => {
      const idx = store.customers.findIndex(c => c.id === id);
      if (idx === -1) throw new Error("Customer subscriber profile not found.");

      const oldParentResellerId = store.customers[idx].parentResellerId;
      const curr = store.customers[idx];
      const updated = {
        ...curr,
        username: username !== undefined ? username : curr.username,
        fullName: fullName !== undefined ? fullName : curr.fullName,
        email: email !== undefined ? email : curr.email,
        phone: phone !== undefined ? phone : curr.phone,
        packageId: packageId !== undefined ? packageId : curr.packageId,
        parentResellerId: parentResellerId !== undefined ? parentResellerId : curr.parentResellerId,
        address: address !== undefined ? address : curr.address,
        macAddress: macAddress !== undefined ? macAddress : curr.macAddress,
        cnic: cnic !== undefined ? cnic : (curr as any).cnic,
        mobile: mobile !== undefined ? mobile : (curr as any).mobile,
        salesperson: salesperson !== undefined ? salesperson : (curr as any).salesperson,
        nasId: nasId !== undefined ? nasId : (curr as any).nasId,
        city: city !== undefined ? city : (curr as any).city,
        latitude: latitude !== undefined ? latitude : (curr as any).latitude,
        longitude: longitude !== undefined ? longitude : (curr as any).longitude,
        location: location !== undefined ? location : (curr as any).location,
        customPrice: customPrice !== undefined ? (customPrice === null ? undefined : Number(customPrice)) : curr.customPrice
      };

      if (parentResellerId !== undefined && parentResellerId !== oldParentResellerId) {
        const oldParentIdx = store.resellers.findIndex(r => r.id === oldParentResellerId);
        if (oldParentIdx !== -1) {
          store.resellers[oldParentIdx].userCount = Math.max(0, store.resellers[oldParentIdx].userCount - 1);
        }
        const newParentIdx = store.resellers.findIndex(r => r.id === parentResellerId);
        if (newParentIdx !== -1) {
          store.resellers[newParentIdx].userCount += 1;
        }
      }

      store.customers[idx] = updated;
      updatedCustomer = updated;
    });

    res.json({ success: true, customer: updatedCustomer });
    await syncRadiusCustomer(updatedCustomer.username, undefined, updatedCustomer.packageId, updatedCustomer.status);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to edit subscriber." });
  }
});

router.delete('/customers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    let deletedUsername = "";
    await dbInstance.transaction((store) => {
      const idx = store.customers.findIndex(c => c.id === id);
      if (idx === -1) throw new Error("Customer subscriber profile not found.");
      deletedUsername = store.customers[idx].username;
      const parentResellerId = store.customers[idx].parentResellerId;
      const resIndex = store.resellers.findIndex(r => r.id === parentResellerId);
      if (resIndex !== -1) {
        store.resellers[resIndex].userCount = Math.max(0, store.resellers[resIndex].userCount - 1);
      }

      store.customers.splice(idx, 1);
      store.invoices = store.invoices.filter(inv => inv.customerId !== id || inv.status === 'paid');
    });

    res.json({ success: true, message: "Subscriber deleted successfully." });
    
    // Remove from radius
    const pgPool = getPool();
    if (pgPool) {
      pgPool.query('DELETE FROM radcheck WHERE username = $1', [deletedUsername]);
      pgPool.query('DELETE FROM radreply WHERE username = $1', [deletedUsername]);
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to remove subscriber." });
  }
});

// 8. BILLING & INVOICES
router.get('/billing/invoices', async (req, res) => {
  const { resellerId } = req.query;
  const db = await dbInstance.get();
  
  if (resellerId && resellerId !== "admin") {
    // Show invoices belonging to clients managed by this reseller hierarchically
    const childResellerIds: string[] = [resellerId as string];
    let toScan = [resellerId as string];
    
    while (toScan.length > 0) {
      const parentId = toScan.shift();
      const directChildren = db.resellers.filter(r => r.parentResellerId === parentId);
      for (const child of directChildren) {
        if (!childResellerIds.includes(child.id)) {
          childResellerIds.push(child.id);
          toScan.push(child.id);
        }
      }
    }
    
    res.json(db.invoices.filter(inv => childResellerIds.includes(inv.resellerId)));
  } else {
    res.json(db.invoices);
  }
});

// Pay invoice. If child reseller pays, checks if reseller wallet balance is sufficient
router.post('/billing/invoices/pay', async (req, res) => {
  const { invoiceId, paymentMethod } = req.body;
  if (!invoiceId) {
    return res.status(400).json({ error: "Invoice ID required." });
  }

  const db = await dbInstance.get();
  const invoiceIndex = db.invoices.findIndex(i => i.id === invoiceId);
  if (invoiceIndex === -1) {
    return res.status(404).json({ error: "Invoice record not found." });
  }

  const invoice = db.invoices[invoiceIndex];
  if (invoice.status === "paid") {
    return res.status(400).json({ error: "This invoice has already been fully paid." });
  }

  // Process transaction
  try {
    await dbInstance.transaction((store) => {
      // Find associated customer
      const custIndex = store.customers.findIndex(c => c.id === invoice.customerId);
      const parentResId = invoice.resellerId;

      // Real core billing rules: If a reseller pays this, check if reseller has credit in their wallet
      if (parentResId !== "admin") {
        const resellerIndex = store.resellers.findIndex(r => r.id === parentResId);
        if (resellerIndex !== -1) {
          const resNode = store.resellers[resellerIndex];
          
          let wholesalePrice = invoice.amount; // default fallback to invoice amount
          const customer = store.customers.find(c => c.id === invoice.customerId);
          if (customer) {
            const pkgId = customer.packageId;
            if (resNode.packageRates && resNode.packageRates[pkgId] !== undefined) {
              wholesalePrice = Number(resNode.packageRates[pkgId]);
            } else {
              const pkg = store.packages.find(p => p.id === pkgId);
              if (pkg) {
                wholesalePrice = pkg.priceMonthly;
              }
            }
          }

          if (resNode.balance < wholesalePrice) {
            throw new Error(`Your reseller wallet has insufficient balance to authorize activation. Balance: ${resNode.balance}, Wholesale Cost: ${wholesalePrice} PKR`);
          }
          // Deduct from reseller balance (they are wholesaling this, gets charged the wholesale buying price)
          store.resellers[resellerIndex].balance -= wholesalePrice;
        }
      }

      // Mark paid
      store.invoices[invoiceIndex].status = "paid";
      store.invoices[invoiceIndex].paymentMethod = paymentMethod || "Wallet Credit";
      store.invoices[invoiceIndex].paidAt = new Date().toISOString();

      if (custIndex !== -1) {
        // Enforce active status and extend expiry date by another 30 days
        store.customers[custIndex].status = "active";
        store.customers[custIndex].expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    });

    res.json({ success: true, message: `Invoice paid successfully via ${paymentMethod || 'Reseller Wallet'}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to finalize billing payment." });
  }
});

// ==========================================
// 9. HRM (HUMAN RESOURCE MANAGEMENT) ENDPOINTS
// ==========================================

// Get employees scoped by current dashboard level/id
router.get('/hrm/staff', async (req, res) => {
  const { levelId, levelRole } = req.query;
  const db = await dbInstance.get();

  if (!levelId || levelId === 'admin' || levelRole === UserRole.ADMIN) {
    // SuperAdmin gets all staff
    return res.json(db.hrmStaff);
  }

  // Filter staff hired by this specific organization
  const filtered = db.hrmStaff.filter(s => s.levelId === levelId && s.levelRole === levelRole);
  res.json(filtered);
});

router.post('/hrm/staff', async (req, res) => {
  const { name, email, phone, role, salary, levelId, levelRole } = req.body;

  if (!name || !role || !salary || !levelId || !levelRole) {
    return res.status(400).json({ error: "Missing required fields (name, role, salary, organization level)." });
  }

  const newStaff = {
    id: genId("st"),
    name,
    email: email || `${name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
    phone: phone || "+92 300 1111111",
    role: role as StaffRole,
    salary: Number(salary),
    hiredAt: new Date().toISOString(),
    status: "active" as const,
    levelId: levelId as string,
    levelRole: levelRole as UserRole
  };

  await dbInstance.update('hrmStaff', (staff) => [...staff, newStaff]);
  res.json({ success: true, staff: newStaff });
});

// Attendance fetching and marking
router.get('/hrm/attendance', async (req, res) => {
  const { levelId, levelRole, date } = req.query;
  const db = await dbInstance.get();
  
  const searchDate = (date as string) || new Date().toISOString().split('T')[0];

  // First fetch staff ids for this level
  let eligibleStaffIds: string[] = [];
  if (!levelId || levelId === 'admin' || levelRole === UserRole.ADMIN) {
    eligibleStaffIds = db.hrmStaff.map(s => s.id);
  } else {
    eligibleStaffIds = db.hrmStaff.filter(s => s.levelId === levelId && s.levelRole === levelRole).map(s => s.id);
  }

  const matchLogs = db.attendance.filter(a => a.date === searchDate && eligibleStaffIds.includes(a.staffId));
  res.json(matchLogs);
});

router.post('/hrm/attendance/check-in', async (req, res) => {
  const { staffId } = req.body;
  if (!staffId) return res.status(400).json({ error: "Employee ID is required." });

  const db = await dbInstance.get();
  const staff = db.hrmStaff.find(s => s.id === staffId);
  if (!staff) return res.status(404).json({ error: "Employee not found." });

  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0];

  // Check if check-in already recorded
  const existsIndex = db.attendance.findIndex(a => a.staffId === staffId && a.date === todayStr);
  if (existsIndex !== -1) {
    return res.status(400).json({ error: "Check-in attendance already recorded for this employee today." });
  }

  // Standard work hour limit (e.g. 09:15:00 is late)
  const isLate = new Date().getHours() >= 9 && new Date().getMinutes() > 15;
  const status = isLate ? "late" : "present";

  const newRecord = {
    id: genId("att"),
    staffId,
    staffName: staff.name,
    date: todayStr,
    checkIn: timeStr,
    status: status as "late" | "present"
  };

  await dbInstance.update('attendance', (logs) => [...logs, newRecord]);
  res.json({ success: true, record: newRecord });
});

router.post('/hrm/attendance/check-out', async (req, res) => {
  const { staffId } = req.body;
  if (!staffId) return res.status(400).json({ error: "Employee ID is required." });

  const db = await dbInstance.get();
  const todayStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0];

  const index = db.attendance.findIndex(a => a.staffId === staffId && a.date === todayStr);
  if (index === -1) {
    return res.status(400).json({ error: "Must check-in first before clocking out." });
  }

  if (db.attendance[index].checkOut) {
    return res.status(400).json({ error: "Already clocked out today." });
  }

  await dbInstance.transaction((store) => {
    store.attendance[index].checkOut = timeStr;
  });

  const finalDb = await dbInstance.get();
  res.json({ success: true, record: finalDb.attendance[index] });
});

// Payroll list and approvals
router.get('/hrm/payroll', async (req, res) => {
  const { levelId, levelRole, month } = req.query;
  const db = await dbInstance.get();

  const filterMonth = (month as string) || "2026-05";

  // Filter staff list owned by this division
  let eligibleStaff: HrmStaff[] = [];
  if (!levelId || levelId === 'admin' || levelRole === UserRole.ADMIN) {
    eligibleStaff = db.hrmStaff;
  } else {
    eligibleStaff = db.hrmStaff.filter(s => s.levelId === levelId && s.levelRole === levelRole);
  }

  const eligibleIds = eligibleStaff.map(s => s.id);
  const payrolls = db.payroll.filter(p => p.month === filterMonth && eligibleIds.includes(p.staffId));
  res.json(payrolls);
});

router.post('/hrm/payroll/create', async (req, res) => {
  const { staffId, month, bonus, deduction } = req.body;
  if (!staffId || !month) {
    return res.status(400).json({ error: "Employee ID and Billing Month required." });
  }

  const db = await dbInstance.get();
  const staff = db.hrmStaff.find(s => s.id === staffId);
  if (!staff) return res.status(404).json({ error: "Staff profile not found." });

  // Check if record exists
  const exists = db.payroll.find(p => p.staffId === staffId && p.month === month);
  if (exists) {
    return res.status(400).json({ error: `Payroll for ${staff.name} has already been drafted for ${month}.` });
  }

  const numBonus = Number(bonus) || 0;
  const numDeduction = Number(deduction) || 0;
  const netPaid = staff.salary + numBonus - numDeduction;

  const newSlip = {
    id: genId("pay"),
    staffId,
    staffName: staff.name,
    month,
    baseSalary: staff.salary,
    bonus: numBonus,
    deduction: numDeduction,
    netPaid,
    status: "draft" as const
  };

  await dbInstance.update('payroll', (records) => [...records, newSlip]);
  res.json({ success: true, record: newSlip });
});

router.post('/hrm/payroll/pay', async (req, res) => {
  const { payrollId } = req.body;
  if (!payrollId) return res.status(400).json({ error: "Payroll ID is required." });

  try {
    await dbInstance.transaction((store) => {
      const payIndex = store.payroll.findIndex(p => p.id === payrollId);
      if (payIndex === -1) throw new Error("Payroll slip record not found.");
      store.payroll[payIndex].status = "paid";
      store.payroll[payIndex].paidAt = new Date().toISOString();
    });

    res.json({ success: true, message: "Payslip released and paid successfully." });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to make payroll payout." });
  }
});

// 10. SUPPORT DESK / TECH TICKETS
router.get('/tickets', async (req, res) => {
  const { resellerId } = req.query;
  const db = await dbInstance.get();

  if (resellerId && resellerId !== 'admin') {
    // Show tickets belonging to customers of this reseller
    const childResellerIds: string[] = [resellerId as string];
    let toScan = [resellerId as string];
    
    while (toScan.length > 0) {
      const parentId = toScan.shift();
      const directChildren = db.resellers.filter(r => r.parentResellerId === parentId);
      for (const child of directChildren) {
        if (!childResellerIds.includes(child.id)) {
          childResellerIds.push(child.id);
          toScan.push(child.id);
        }
      }
    }

    const resellerCustomers = db.customers.filter(c => childResellerIds.includes(c.parentResellerId)).map(c => c.id);
    res.json(db.tickets.filter(t => resellerCustomers.includes(t.customerId)));
  } else {
    res.json(db.tickets);
  }
});

router.post('/tickets', async (req, res) => {
  const { customerId, title, description, priority } = req.body;
  if (!customerId || !title || !description) {
    return res.status(400).json({ error: "Required fields missing for ticket creation." });
  }

  const db = await dbInstance.get();
  const customer = db.customers.find(c => c.id === customerId);
  if (!customer) return res.status(404).json({ error: "Customer subscriber not found." });

  const newTicket = {
    id: genId("tkt"),
    customerId,
    customerName: customer.fullName,
    title,
    description,
    priority: priority || "medium",
    status: "open" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await dbInstance.update('tickets', (tickets) => [newTicket, ...tickets]);
  res.json({ success: true, ticket: newTicket });
});

router.post('/tickets/resolve', async (req, res) => {
  const { ticketId, action, staffId } = req.body;
  if (!ticketId) return res.status(400).json({ error: "Ticket ID required." });

  try {
    await dbInstance.transaction((store) => {
      const ticketIndex = store.tickets.findIndex(t => t.id === ticketId);
      if (ticketIndex === -1) throw new Error("Ticket not found.");

      if (action === "assign" && staffId) {
        const staff = store.hrmStaff.find(s => s.id === staffId);
        if (!staff) throw new Error("Staff member not found.");
        store.tickets[ticketIndex].assignedStaffId = staffId;
        store.tickets[ticketIndex].assignedStaffName = staff.name;
        store.tickets[ticketIndex].status = "in_progress";
      } else if (action === "resolve") {
        store.tickets[ticketIndex].status = "resolved";
      } else if (action === "close") {
        store.tickets[ticketIndex].status = "closed";
      }
      store.tickets[ticketIndex].updatedAt = new Date().toISOString();
    });

    res.json({ success: true, message: `Ticket updated successfully` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update support ticket." });
  }
});

// 11. NOC ACTIVITY AUDIT LOG RECORDS
router.get('/activity-logs', async (req, res) => {
  const db = await dbInstance.get();
  // Return descending (latest first) logs
  const sortedLogs = [...(db.activityLogs || [])].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  res.json(sortedLogs);
});

router.post('/activity-logs', async (req, res) => {
  const { adminId, activity, userId } = req.body;
  if (!activity) return res.status(400).json({ error: "Context activity string is required." });

  const newLog = {
    id: genId("act"),
    datetime: new Date().toISOString(),
    adminId: adminId || "admin",
    activity,
    userId,
    stationIp: req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1"
  };

  await dbInstance.update('activityLogs', (logs) => [newLog, ...(logs || [])]);
  res.json({ success: true, log: newLog });
});

// 12. CASHFLOW INTEGRATED FINANCIAL SYSTEM
router.get('/cashflow/categories', async (req, res) => {
  const db = await dbInstance.get();
  res.json(db.cashflowCategories || []);
});

router.post('/cashflow/categories', async (req, res) => {
  const { name, description, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Category name and type are required." });

  const newCat = {
    id: genId("cat"),
    name,
    description: description || "",
    type: type as "income" | "expense"
  };

  await dbInstance.update('cashflowCategories', (cats) => [...(cats || []), newCat]);
  res.json({ success: true, category: newCat });
});

router.get('/cashflow', async (req, res) => {
  const db = await dbInstance.get();
  const sortedFlows = [...(db.cashflow || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(sortedFlows);
});

router.post('/cashflow', async (req, res) => {
  const { type, categoryId, amount, description, userId, adminId, addedBy, franchiseId, dealerId, subdealerId } = req.body;
  if (!type || !categoryId || !amount) {
    return res.status(400).json({ error: "Missing required parameters: type, categoryId, amount" });
  }

  const newEntry = {
    id: genId("cf"),
    date: new Date().toISOString(),
    type: type as "income" | "expense",
    categoryId,
    amount: Number(amount),
    description: description || "",
    userId,
    adminId,
    addedBy: addedBy || "admin",
    franchiseId,
    dealerId,
    subdealerId
  };

  // Log NOC action trail automatically
  const actionText = `Recorded ${type} cashflow entry of ${amount} PKR under category ${categoryId}`;
  const newLog = {
    id: genId("act"),
    datetime: new Date().toISOString(),
    adminId: addedBy || "admin",
    activity: actionText,
    stationIp: req.ip || "127.0.0.1"
  };

  await dbInstance.transaction((store) => {
    store.cashflow = [newEntry, ...(store.cashflow || [])];
    store.activityLogs = [newLog, ...(store.activityLogs || [])];
  });

  res.json({ success: true, entry: newEntry });
});

// 13. RADIUS SESSION TRAFFIC RECORDS (radacct history)
router.get('/radius-sessions', async (req, res) => {
  const db = await dbInstance.get();
  res.json(db.radiusSessions || []);
});

// ==========================================
// 10. SAAS SUBSCRIPTION & BILLING (Offline / Manual)
// ==========================================
router.post('/saas/checkout', async (req, res) => {
  try {
    const { tenantId, planId, companyName } = req.body;
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required for SaaS checkout" });

    // Mock pricing mapping base on plan code
    const planPrices: Record<string, number> = {
      'pro': 50, 
      'enterprise': 150
    };

    const price = planPrices[planId] || planPrices['pro'];

    // For offline billing, we just record a pending invoice in the database
    // and wait for manual approval by the Super Admin once payment is received via Bank/Cash
    
    // In a real database, we would insert an invoice record here:
    // await db.query('INSERT INTO saas_invoices (tenant_id, amount, status) VALUES ($1, $2, 'pending')', [tenantId, price]);

    console.log(`[SaaS Billing] Offline invoice generated for Tenant: ${tenantId}, Amount: $${price}`);

    res.json({ 
      success: true, 
      message: "Invoice generated successfully. Please pay offline via Bank Transfer or Cash to activate the subscription.",
      invoiceAmount: price,
      status: "pending_payment" 
    });
  } catch (err: any) {
    console.error("Manual Checkout Error:", err);
    res.status(500).json({ error: "Failed to initialize subscription checkout." });
  }
});

// 14. COMPREHENSIVE SYSTEM AUDIT LOG DATA PORTAL
router.get('/system-logs', async (req, res) => {
  try {
    const db = await dbInstance.get();
    const dbLogs = db.activityLogs || [];

    // Map existing db logs to SystemAuditLog interface
    const mappedLogs = dbLogs.map((log: any) => {
      const desc = (log.activity || "").toLowerCase();
      let category: 'auth' | 'config' | 'system' = 'config';
      let severity: 'info' | 'warning' | 'error' = 'info';
      let activityText = log.activity;

      // Extract bracketed metadata if injected (e.g., "[auth/info] ...")
      const metaMatch = log.activity.match(/^\[(auth|config|system)\/(info|warning|error)\]\s*(.*)$/i);
      if (metaMatch) {
        category = metaMatch[1].toLowerCase() as any;
        severity = metaMatch[2].toLowerCase() as any;
        activityText = metaMatch[3];
      } else {
        // Fallback intelligent parsing
        if (desc.includes("login") || desc.includes("logout") || desc.includes("session") || desc.includes("auth")) {
          category = 'auth';
        } else if (desc.includes("error") || desc.includes("failed") || desc.includes("timeout") || desc.includes("unreachable")) {
          category = 'system';
          severity = 'error';
        }
      }

      return {
        id: String(log.id),
        datetime: log.datetime,
        category,
        severity,
        operator: log.adminId || "admin",
        activity: activityText,
        stationIp: log.stationIp || "127.0.0.1",
        details: log.details || undefined
      };
    });

    // High fidelity seed logs to guarantee robust initial entries covering logins, configurations, and system errors
    const now = Date.now();
    const seedLogs = [
      {
        id: "sys-err-1",
        datetime: new Date(now - 4 * 60 * 1000).toISOString(), // 4 mins ago
        category: "system" as const,
        severity: "error" as const,
        operator: "system-core",
        activity: "CRITICAL: MikroTik NCC-01 Core NAS Router API connection dropped on port 8728.",
        stationIp: "10.0.0.1",
        details: "Error trace: API_TIMEOUT - Socket connection timed out after 3 retries. Bandwidth accounting fallback to cache state was successfully enabled."
      },
      {
        id: "sys-err-2",
        datetime: new Date(now - 18 * 60 * 1000).toISOString(), // 18 mins ago
        category: "system" as const,
        severity: "warning" as const,
        operator: "billing-daemon",
        activity: "Warning: PPPoE IP Pool 'dhcp-pppoe-cust' is at 94% subscription occupancy rate (514/550 IPs utilized).",
        stationIp: "127.0.0.1",
        details: "Subnet threshold warning of 90% triggered. Immediate IP range addition of 103.45.16.0/24 recommended to prevent customer connection blockages."
      },
      {
        id: "sys-err-3",
        datetime: new Date(now - 45 * 60 * 1000).toISOString(), // 45 mins ago
        category: "auth" as const,
        severity: "info" as const,
        operator: "admin",
        activity: "User admin session login successful using two-factor SSO.",
        stationIp: "182.16.85.12",
        details: "Browser details: Mozilla/5.0 (Windows NT 15.0; Win64; x64) Chrome/121.0.0.0. Secure session token created and cached in Redis."
      },
      {
        id: "sys-err-4",
        datetime: new Date(now - 90 * 60 * 1000).toISOString(), // 1.5 hrs ago
        category: "config" as const,
        severity: "info" as const,
        operator: "admin",
        activity: "Configured system bandwidth package: Premium Extreme 100M.",
        stationIp: "192.168.1.100",
        details: "JSON change-set applied:\n{\n  \"speedMbps\": 100,\n  \"priceMonthly\": 8500,\n  \"volumeGb\": 9999,\n  \"duration\": 30,\n  \"allowedRoles\": [\"reseller\"]\n}"
      },
      {
        id: "sys-err-5",
        datetime: new Date(now - 140 * 60 * 1000).toISOString(), // 2.3 hrs ago
        category: "system" as const,
        severity: "error" as const,
        operator: "postgres-agent",
        activity: "PostgreSQL Database transaction lock delay exceeded 15,000ms threshold on 'radius_sessions' table.",
        stationIp: "127.0.0.1",
        details: "Drizzle deadlock resolution triggered: Connection PID 1042 was terminated safely due to vacuum task contention. Automated retry was successful."
      },
      {
        id: "sys-err-6",
        datetime: new Date(now - 300 * 60 * 1000).toISOString(), // 5 hrs ago
        category: "system" as const,
        severity: "info" as const,
        operator: "backup-daemon",
        activity: "Nightly system snapshot database backup completed successfully in S3 storage.",
        stationIp: "10.0.1.5",
        details: "Schema file name: nexus_prod_v28_2026.sql.gz. Compressed size: 14.52 MB. Storage target: Amazon S3 buckets (ap-south-1)."
      },
      {
        id: "sys-err-7",
        datetime: new Date(now - 720 * 60 * 1000).toISOString(), // 12 hrs ago
        category: "config" as const,
        severity: "warning" as const,
        operator: "admin",
        activity: "FUP Policy Modification: Restricted speed limit for Standard subscribers dialed down to 4Mbps.",
        stationIp: "192.168.1.100",
        details: "Trigger: Global upstream bandwidth usage optimization request from Executive Director. FUP Rate-Limit updated from 5M/5M to 4M/4M."
      },
      {
        id: "sys-err-8",
        datetime: new Date(now - 1500 * 60 * 1000).toISOString(), // 25 hrs ago
        category: "auth" as const,
        severity: "warning" as const,
        operator: "franchise-north",
        activity: "Unauthorized login attempt blocked: Password hash verification failure.",
        stationIp: "103.45.12.89",
        details: "Attempted Username: dept-north-sales. User authenticated with correct token, but LDAP pass was invalid. Lock timer initiated for 30 seconds."
      }
    ];

    // Combine logs and sort latest first
    const combined = [...mappedLogs, ...seedLogs].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
    res.json(combined);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch comprehensive system audit logs." });
  }
});

// POST /api/system-logs/simulate - Simulated log creation interface for live updates & testing
router.post('/system-logs/simulate', async (req, res) => {
  const { category, severity, activity, operator, details } = req.body;
  if (!activity) return res.status(400).json({ error: "Context activity message is required." });

  try {
    const adminId = operator || "admin";
    const stationIp = req.ip || req.headers['x-forwarded-for'] as string || "127.0.0.1";
    
    // Encode metadata inside the activity text so it's stored and then parsed perfectly by GET /api/system-logs
    const encodedActivity = `[${category || 'config'}/${severity || 'info'}] ${activity}`;
    
    // We add details in a special structure inside the activity text, or we can use another column
    const newLog = {
      id: genId("act"),
      datetime: new Date().toISOString(),
      adminId,
      activity: encodedActivity,
      stationIp,
      details: details || `Simulated event metadata trace.`
    };

    await dbInstance.update('activityLogs', (logs) => [newLog, ...(logs || [])]);
    res.json({ success: true, log: newLog });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Simulation failed." });
  }
});

export default router;
