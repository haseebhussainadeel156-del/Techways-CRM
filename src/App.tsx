import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserRole, AccountStatus, BandwidthPackage, BandwidthDataPoint, HrmStaff, RouterOS, ResellerNode } from './types';
import RoleSelector from './components/RoleSelector';
import AnalyticsPanel from './components/AnalyticsPanel';
import FinancialChart from './components/FinancialChart';
import CustomerManager from './components/CustomerManager';
import HrmManager from './components/HrmManager';
import TicketDesk from './components/TicketDesk';
import AccountingManager from './components/AccountingManager';
import NasManager from './components/NasManager';
import PackageManager from './components/PackageManager';
import PolicyManager from './components/PolicyManager';
import LoginPage from './components/LoginPage';
import FranchiseManager from './components/FranchiseManager';
import DealerManager from './components/DealerManager';
import SubDealerManager from './components/SubDealerManager';
import ReportsManager from './components/ReportsManager';
import PermissionsManager from './components/PermissionsManager';
import ProfileManager from './components/ProfileManager';
import GlobalSearchBar from './components/GlobalSearchBar';
import ResellerWallet from './components/ResellerWallet';

import { Card as AntCard, Row as AntRow, Col as AntCol, Space as AntSpace, Button as AntButton, Progress as AntProgress, Badge as AntBadge, Statistic as AntStatistic, Typography as AntTypography, Divider as AntDivider, Alert as AntAlert, message as antMessage, Layout, Menu, Drawer, Spin, ConfigProvider, theme, Tabs as AntTabs, Table as AntTable, Tag as AntTag, App as AntApp } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';

const { Title: AntTitle, Text: AntText } = AntTypography;

import {
  Shield,
  Briefcase,
  Users,
  Zap,
  Tag,
  MessageSquare,
  Activity,
  LogOut,
  ChevronRight,
  Wifi,
  DollarSign,
  Wallet,
  Plus,
  PlayCircle,
  HelpCircle,
  Clock,
  Send,
  Download,
  Upload,
  RefreshCw,
  Award,
  Server,
  LayoutDashboard,
  Lock,
  Edit2,
  Trash2,
  Info,
  CheckCircle,
  AlertTriangle,
  Sliders,
  BarChart,
  User,
  Menu as LucideMenu,
  X
} from 'lucide-react';

const darkThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6366f1', // Indigo-500
    colorBgBase: '#020617',  // slate-950
    colorBgContainer: '#0b1329', // slate-900 / dark slate
    colorBorder: '#1e293b', // slate-800
    colorTextBase: '#f8fafc', // slate-50
    borderRadius: 12,
  },
  components: {
    Card: {
      colorBgContainer: '#0b1329',
      colorBorderSecondary: '#1d2433',
    },
    Table: {
      colorBgContainer: '#0b1329',
      colorHeaderBg: '#0f172a',
      colorRowHover: '#1e243b',
    },
    Input: {
      colorBgContainer: '#0b1329',
      colorActiveBorder: '#6366f1',
    },
    Select: {
      colorBgContainer: '#0b1329',
    },
    Modal: {
      colorBgElevated: '#0b1329',
    },
    Drawer: {
      colorBgElevated: '#0b1329',
    }
  }
};

const lightThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#4f46e5', // Indigo-600
    colorBgBase: '#ffffff',  // White/Slate-50
    colorBgContainer: '#f1f5f9', // Slate-100
    colorBorder: '#cbd5e1', // Slate-300
    colorTextBase: '#0f172a', // Slate-900
    borderRadius: 12,
  },
  components: {
    Card: {
      colorBgContainer: '#f1f5f9',
      colorBorderSecondary: '#e2e8f0',
    },
    Table: {
      colorBgContainer: '#f1f5f9',
      colorHeaderBg: '#e2e8f0',
      colorRowHover: '#cbd5e1',
    },
    Input: {
      colorBgContainer: '#ffffff',
      colorActiveBorder: '#4f46e5',
    },
    Select: {
      colorBgContainer: '#ffffff',
    },
    Modal: {
      colorBgElevated: '#ffffff',
    },
    Drawer: {
      colorBgElevated: '#ffffff',
    }
  }
};

export default function App() {
  const [messageApi, contextHolder] = antMessage.useMessage();
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem("nexus_theme") as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    localStorage.setItem("nexus_theme", newTheme);
  };
  
  const currentThemeConfig = themeMode === 'dark' ? darkThemeConfig : lightThemeConfig;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  // Authentication & session state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("nexus_logged_in") === "true";
  });
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem("nexus_role") as UserRole;
    return savedRole || UserRole.ADMIN;
  });
  const [currentId, setCurrentId] = useState<string>(() => {
    return localStorage.getItem("nexus_user_id") || "admin";
  });
  const [loggedInName, setLoggedInName] = useState<string>(() => {
    return localStorage.getItem("nexus_username") || "Super Admin";
  });

  // Core global data states
  const [packages, setPackages] = useState<BandwidthPackage[]>([]);
  const [logs, setLogs] = useState<BandwidthDataPoint[]>([]);
  const [staff, setStaff] = useState<HrmStaff[]>([]);
  const [routers, setRouters] = useState<RouterOS[]>([]);
  const [currentResellerNode, setCurrentResellerNode] = useState<ResellerNode | null>(null);
  const [workspaceStats, setWorkspaceStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Tab configurations - Computed dynamically from URL path for multipage experience
  const rawPath = location.pathname.substring(1) || "";
  const activeTab = rawPath === "" ? (currentRole === UserRole.CUSTOMER ? "portal" : "dashboard") : rawPath;

  const setActiveTab = (tabId: string) => {
    if (tabId === 'telemetry') {
      setNotifications([]);
    }
    navigate(`/${tabId}`);
  };

  // Customer Dashboard values
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [clientBill, setClientBill] = useState<any[]>([]);

  // Speed test simulation states
  const [testingSpeed, setTestingSpeed] = useState(false);
  const [pingSpeed, setPingSpeed] = useState<number | null>(null);
  const [downSpeed, setDownSpeed] = useState<number | null>(null);
  const [upSpeed, setUpSpeed] = useState<number | null>(null);

  // Dynamic system permissions state
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({
    [UserRole.FRANCHISE]: ["telemetry", "subscribers", "wallet", "tickets", "hrm", "dealers", "subdealers", "reporting"],
    [UserRole.DEALER]: ["telemetry", "subscribers", "wallet", "tickets", "subdealers", "reporting"],
    [UserRole.SUB_DEALER]: ["telemetry", "subscribers", "wallet", "tickets"],
    [UserRole.CUSTOMER]: ["portal"],
    'dept-1': [],
    'dept-2': [],
    'dept-3': []
  });

  const [hrmDepartments, setHrmDepartments] = useState([
    { id: 'dept-1', name: 'NOC Operations', description: 'Network Operations Center', staffCount: 0 },
    { id: 'dept-2', name: 'Field Technicians', description: 'On-ground fiber splicing and maintenance', staffCount: 0 },
    { id: 'dept-3', name: 'Billing & ACC', description: 'Customer billing support', staffCount: 0 },
  ]);

  const [notifications, setNotifications] = useState<string[]>([
    "Alpha Franchise requested credit transfer authorization of 50k PKR.",
    "Critical alarm: RouterBackup-Core disconnected at 18:01:00.",
    "System automated backup finalized securely on cloud SQL replication logs."
  ]);

  const handleTogglePermission = (roleId: string, pageId: string) => {
    setRolePermissions(prev => {
      const currentPerms = prev[roleId] || [];
      const updated = currentPerms.includes(pageId)
        ? currentPerms.filter(p => p !== pageId)
        : [...currentPerms, pageId];
      return {
        ...prev,
        [roleId]: updated
      };
    });
  };

  // Handle subscriber profile reload
  const fetchClientProfile = async () => {
    try {
      const res = await fetch('/api/customers?id=admin&role=admin');
      const data = await res.json();
      // Match active customer simulator record (e.g. cust-1)
      const found = data.find((c: any) => c.id === currentId) || data[0];
      setClientInfo(found);

      // Grab custom statements
      const billsRes = await fetch(`/api/billing/invoices?adminId=admin`);
      const billsData = await billsRes.json();
      setClientBill(billsData.filter((b: any) => b.customerId === (found ? found.id : 'cust-1')));
    } catch (e) {
      console.error("Failed to fetch client profile", e);
    }
  };

  // Fetch package metrics
  const loadPackages = async () => {
    try {
      const res = await fetch('/api/packages');
      const data = await res.json();
      setPackages(data);
    } catch (err) {
      console.error("Packages load error", err);
    }
  };

  // Refresh data telemetry feed
  const loadTelemetry = async () => {
    try {
      const res = await fetch('/api/bandwidth-logs');
      const data = await res.json();
      setLogs(data.logs);
    } catch (e) {
      console.error("Telemetry failed to load", e);
    }
  };

  // Fetch active MikroTik Router lists
  const loadRouters = async () => {
    try {
      const res = await fetch('/api/routers');
      const data = await res.json();
      setRouters(data);
    } catch (e) {
      console.error("Routers load error", e);
    }
  };

  // Fetch staff list for assignment dropdown
  const loadStaff = async () => {
    try {
      const res = await fetch(`/api/hrm/staff?levelId=${currentId}&levelRole=${currentRole}`);
      const data = await res.json();
      setStaff(data);
    } catch (e) {
      console.error("HRM staff fetch failure", e);
    }
  };

  // Fetch scoped stats
  const loadWorkspaceStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/stats?role=${currentRole}&id=${currentId}`);
      const data = await res.json();
      setWorkspaceStats(data);
    } catch (e) {
      console.error("Stats aggregation failed", e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch reseller node for wallet
  const loadResellerNode = async () => {
    if (currentRole === UserRole.ADMIN || currentRole === UserRole.CUSTOMER) return;
    try {
      const res = await fetch('/api/resellers');
      const data: ResellerNode[] = await res.json();
      const node = data.find(r => r.id === currentId);
      setCurrentResellerNode(node || null);
    } catch (e) {
      console.error("Failed to load reseller node.", e);
    }
  };

  const handleLogout = (message?: string) => {
    localStorage.removeItem("nexus_logged_in");
    localStorage.removeItem("nexus_role");
    localStorage.removeItem("nexus_user_id");
    localStorage.removeItem("nexus_username");
    setIsLoggedIn(false);
    setCurrentRole(UserRole.ADMIN);
    setCurrentId("admin");
    navigate("/");
    if (message) {
      messageApi.info(message);
    }
  };

  // Activity timer logic
  useEffect(() => {
    if (!isLoggedIn) return;

    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeout);
      // 30 minutes in milliseconds
      timeout = setTimeout(() => {
        handleLogout("You have been logged out due to inactivity.");
      }, 30 * 60 * 1000);
    };

    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('mousemove', resetTimer);

    resetTimer(); // Initialize timer

    return () => {
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      clearTimeout(timeout);
    };
  }, [isLoggedIn]);

  // Synchronize component data feeds
  useEffect(() => {
    loadPackages();
    loadTelemetry();
    loadWorkspaceStats();
    loadStaff();
    loadRouters();
    loadResellerNode();

    if (currentRole === UserRole.CUSTOMER) {
      fetchClientProfile();
      setActiveTab("portal");
    } else {
      // Dynamic boundary switch when changing simulation lens
      if (activeTab === "portal") {
        setActiveTab("dashboard");
      } else {
        const lookupKey = currentRole === UserRole.HRM_STAFF ? currentId : currentRole;
        const allowed = rolePermissions[lookupKey] || [];
        const isProfile = activeTab.startsWith("profile");
        if (activeTab !== "dashboard" && activeTab !== "permissions" && !isProfile && currentRole !== UserRole.ADMIN && !allowed.includes(activeTab)) {
          setActiveTab("dashboard");
        }
      }
    }
  }, [currentRole, currentId]);

  // Interval trigger for ticking telemetry graphs in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      if ((activeTab === "telemetry" || activeTab === "dashboard") && currentRole !== UserRole.CUSTOMER) {
        loadTelemetry();
      }
    }, 4500);
    return () => clearInterval(timer);
  }, [activeTab, currentRole]);

  const handleRoleChange = (role: UserRole, id: string) => {
    // Graceful routing when role simulation switches
    setCurrentRole(role);
    setCurrentId(id);

    if (role === UserRole.CUSTOMER) {
      setActiveTab("portal");
    } else if (role === UserRole.ADMIN) {
      setActiveTab("dashboard");
    } else {
      const lookupKey = role === UserRole.HRM_STAFF ? id : role;
      const allowed = rolePermissions[lookupKey] || [];
      const isProfile = activeTab.startsWith("profile");
      if (activeTab !== "dashboard" && !isProfile && !allowed.includes(activeTab)) {
        setActiveTab("dashboard");
      }
    }
  };

  // Speed test dial simulation for Subscriber
  const runSpeedTest = () => {
    setTestingSpeed(true);
    setPingSpeed(null);
    setDownSpeed(null);
    setUpSpeed(null);

    setTimeout(() => setPingSpeed(Math.floor(8 + Math.random() * 8)), 1000);
    setTimeout(() => {
      const cap = clientInfo ? (packages.find(p => p.id === clientInfo.packageId)?.speedMbps || 50) : 50;
      setDownSpeed(Math.floor(cap * 0.96 - Math.random() * 2));
    }, 2800);
    setTimeout(() => {
      const cap = clientInfo ? (packages.find(p => p.id === clientInfo.packageId)?.speedMbps || 50) : 50;
      setUpSpeed(Math.floor(cap * 0.85 - Math.random() * 4));
      setTestingSpeed(false);
    }, 4500);
  };

  // Customer online bill authorization topup
  const payClientInvoice = async (invId: string) => {
    try {
      const res = await fetch('/api/billing/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invId, paymentMethod: "Online JazzCash Gateway" })
      });
      if (res.ok) {
        fetchClientProfile();
        loadWorkspaceStats(); // reload balance inside dashboard stats
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Global horizontal navbar tabs schema
  const menuItems = [
    { id: "dashboard", label: "Dashboard Hub", icon: LayoutDashboard },
    { id: "telemetry", label: "Real-time Telemetry", icon: Activity },
    { id: "subscribers", label: "Customers", icon: Users },
    { id: "wallet", label: "My Wallet", icon: Wallet },
    { id: "profile", label: "My Profile", icon: User },
    { id: "tickets", label: "Support Dispatch Desk", icon: MessageSquare },
    { id: "hrm", label: "Multi-level HRM Portal", icon: Briefcase },
    { id: "franchises", label: "Franchises", icon: Shield },
    { id: "dealers", label: "Dealers", icon: Zap },
    { id: "subdealers", label: "Sub-Dealers", icon: Briefcase },
    { id: "accounting", label: "Accounting", icon: DollarSign },
    { id: "reporting", label: "Reports Module", icon: BarChart },
    { id: "packages", label: "Plan Catalogue", icon: Tag },
    { id: "policies", label: "ISP Rule Policies", icon: Sliders },
    { id: "permissions", label: "Role Permissions", icon: Shield },
    { id: "nas", label: "NAS & MikroTiks", icon: Server },
    { id: "portal", label: "Client Portal", icon: Wifi }
  ];

  // Dynamic filter according to active simulated account ACL
  const allowedTabs = menuItems.filter(item => {
    if (currentRole === UserRole.ADMIN) {
      return item.id !== "portal"; // admin is executive operator, not regular consumer
    }
    if (currentRole === UserRole.CUSTOMER) {
      return item.id === "portal" || item.id === "profile"; // customers only access subscriber sub-portal and profile
    }
    
    // Franchise, Dealer, Sub-dealer, and HRM_STAFF
    if (item.id === "dashboard" || item.id === "profile") return true; // always show Dashboard as default
    if (item.id === "portal" || item.id === "permissions") return false; // restricted panels

    const lookupKey = currentRole === UserRole.HRM_STAFF ? currentId : currentRole;
    const rolePerms = rolePermissions[lookupKey] || [];
    return rolePerms.includes(item.id);
  });

  const hasSubscribers = allowedTabs.some(t => t.id === 'subscribers') || currentRole === UserRole.ADMIN;
  const hasTickets = allowedTabs.some(t => t.id === 'tickets') || currentRole === UserRole.ADMIN;
  const hasTelemetry = allowedTabs.some(t => t.id === 'telemetry') || currentRole === UserRole.ADMIN;
  const hasNas = allowedTabs.some(t => t.id === 'nas') || currentRole === UserRole.ADMIN;
  const hasPackages = allowedTabs.some(t => t.id === 'packages') || currentRole === UserRole.ADMIN;
  const hasHrm = allowedTabs.some(t => t.id === 'hrm') || currentRole === UserRole.ADMIN;



  // Latest Telemetry rates for dashboard core card
  const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const downloadSpeed = lastLog ? (lastLog.rxMbps ?? 1450) : 1450;
  const uploadSpeed = lastLog ? (lastLog.txMbps ?? 980) : 980;

  if (!isLoggedIn) {
    return (
      <ConfigProvider theme={currentThemeConfig}>
        <LoginPage
          onLoginSuccess={(user) => {
            localStorage.setItem("nexus_logged_in", "true");
            localStorage.setItem("nexus_role", user.role);
            localStorage.setItem("nexus_user_id", user.id);
            localStorage.setItem("nexus_username", user.name);
            setIsLoggedIn(true);
            setCurrentRole(user.role);
            setCurrentId(user.id);
            setLoggedInName(user.name);
            if (user.role === UserRole.CUSTOMER) {
              navigate("/portal");
            } else {
              navigate("/dashboard");
            }
          }}
        />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={currentThemeConfig}>
      <AntApp>
        {contextHolder}
        <Layout className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased flex flex-col relative overflow-hidden" style={{ minHeight: '100vh', background: '#020617' }}>
      {/* Dynamic top bar header */}
      <Layout.Header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur px-6 flex items-center justify-between h-16 relative z-20 shrink-0 mb-0 select-none" style={{ position: 'relative', top: 0, width: '100%', display: 'flex', zIndex: 1000, height: '64px', minHeight: '64px', background: '#090d1a', padding: '0 24px' }}>
        <div className="flex items-center justify-between w-full md:w-auto">
          <AntSpace size="middle">
            <div className="bg-indigo-600 p-2 rounded-xl text-slate-50 flex items-center justify-center shadow-lg shadow-indigo-600/35">
              <Wifi className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold font-display text-slate-50 tracking-tight flex items-center m-0 leading-tight">
                Nexus Hub
                <span className="text-[9px] bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-1.5 py-0.5 rounded ml-2 uppercase font-mono tracking-wider font-semibold">
                  V3 Core
                </span>
              </h1>
              <p className="hidden xs:block text-[10px] md:text-[11px] text-slate-400 font-mono m-0 mt-0.5">MicroTik Reseller Node & Relational PSQL Billing Engine</p>
            </div>
          </AntSpace>
          
          {/* Mobile menu toggle burger menu */}
          {currentRole !== UserRole.CUSTOMER && (
            <AntButton
              type="text"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden ml-3 p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-slate-100 cursor-pointer transition-all flex items-center justify-center w-9 h-9 border-none"
              icon={isMobileMenuOpen ? <X className="w-5 h-5" /> : <LucideMenu className="w-5 h-5" />}
            />
          )}
        </div>

        {/* Dynamic consolidated premium user menu controls */}
        <div className="flex items-center gap-3 select-none">
          <GlobalSearchBar onSelect={(customer) => {
            setActiveTab("subscribers");
            // Optionally try to trigger search inside CustomerManager if possible, 
            // but for now, just navigating to the tab is fine.
          }} />

          {/* Notification Badge */}
          <AntBadge count={notifications.length} offset={[-2, 2]} className="cursor-pointer">
            <div className="bg-slate-900/60 border border-slate-800/80 p-2.5 rounded-xl backdrop-blur text-slate-400">
              <Activity className="w-5 h-5" />
            </div>
          </AntBadge>

          {/* User profile capsule */}
          <div className="flex items-center gap-2.5 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-xl backdrop-blur">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-xs select-none">
              {loggedInName ? loggedInName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <div className="text-[12px] font-bold text-slate-100 flex items-center gap-1.5 leading-none">
                {loggedInName}
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider font-mono">
                  {currentRole.replace('_', ' ')}
                </span>
              </div>
              <div className="text-[9.5px] text-slate-500 font-mono mt-0.5 leading-none">ID: {currentId}</div>
            </div>
          </div>

          <AntButton
            id="header-logout-btn"
            onClick={() => handleLogout()}
            danger
            type="primary"
            className="flex items-center justify-center w-8.5 h-8.5 bg-rose-950/20 border border-rose-900/30 hover:border-rose-500/50 hover:bg-rose-900/40 text-rose-400 cursor-pointer rounded-xl transition-all p-0 h-8.5 w-8.5 shrink-0"
            icon={<LogOut className="w-4 h-4" />}
            title="Sign Out"
          />
        </div>
      </Layout.Header>

      {/* Primary Simulator Workspace Switch */}
      <Layout className="flex flex-1 overflow-hidden relative" style={{ background: 'transparent', flexDirection: 'row' }}>
        
        {/* MOBILE SIDEBAR DRAWERS */}
        <Drawer
          title={
            <span className="font-bold tracking-tight text-slate-100 flex items-center gap-1.5 font-display text-sm">
              <Wifi className="w-4 h-4 text-indigo-400" />
              NEXUS MOBILE MENU
            </span>
          }
          placement="left"
          onClose={() => setIsMobileMenuOpen(false)}
          open={isMobileMenuOpen}
          styles={{
            wrapper: { width: 280 },
            header: { borderBottom: '1px solid #1e293b', padding: '16px', background: '#020617' },
            body: { padding: '12px', background: '#020617', display: 'flex', flexDirection: 'column', gap: '4px' }
          }}
        >
          {allowedTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id || activeTab.startsWith(`${item.id}:`);
            return (
              <AntButton
                key={item.id}
                type={isActive ? "primary" : "text"}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left justify-start flex items-center space-x-3 px-4 py-5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-150 h-auto ${
                  isActive
                    ? "bg-indigo-600 border-none text-slate-100 shadow-md"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-none"
                }`}
                icon={<Icon className="w-4 h-4" />}
              >
                <span>{item.label}</span>
              </AntButton>
            );
          })}
        </Drawer>

        {/* DESKTOP SIDEBAR NAVIGATION */}
        {currentRole !== UserRole.CUSTOMER && (
          <Layout.Sider
            width={260}
            className="hidden md:block shrink-0 bg-slate-900/40 border-r border-slate-800 overflow-y-auto p-4 z-10 backdrop-blur"
            style={{ minHeight: 'calc(100vh - 64px)', background: 'transparent' }}
          >
            <div className="flex flex-col gap-1.5 p-1">
              {allowedTabs.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id || activeTab.startsWith(`${item.id}:`);
                return (
                  <AntButton
                    key={item.id}
                    type={isActive ? "primary" : "text"}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left justify-start flex items-center space-x-3 px-4 py-4 rounded-xl text-sm font-semibold tracking-tight transition-all duration-150 h-auto ${
                      isActive
                        ? "bg-indigo-600 border-none text-slate-100 shadow-lg"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border-none"
                    }`}
                    icon={<Icon className="w-5 h-5 inline" />}
                  >
                    <span>{item.label}</span>
                  </AntButton>
                );
              })}
            </div>
          </Layout.Sider>
        )}

        <Layout.Content className="flex-1 overflow-y-auto p-6 flex flex-col relative z-20" style={{ background: '#020617' }}>
          <div className="max-w-[1400px] w-full mx-auto space-y-6 pb-20">
            {/* DYNAMIC SCREEN VIEWPORT */}
            <div className="w-full">
          
          {/* TAB 0: UNIFIED HOME DASHBOARD (Dynamic Summarized Operational Cards) */}
          {activeTab === "dashboard" && currentRole !== UserRole.CUSTOMER && (
            <div className="space-y-6">
              
              {/* Core Stats Bar */}
              {workspaceStats && (
                <AntRow gutter={[16, 16]}>
                  {/* Stats 1: Balance - Only show if allowed */}
                  {hasSubscribers && currentRole !== UserRole.ADMIN && currentRole !== UserRole.HRM_STAFF && (
                    <AntCol xs={24} sm={12} lg={6}>
                      <AntCard className="bg-slate-900/40 border-slate-800 rounded-2xl relative overflow-hidden group shadow-md" styles={{ body: { padding: '20px' } }}>
                        <div className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <AntStatistic 
                          title={<span className="text-[10px] font-mono text-slate-500 uppercase font-black">Authorized Margin</span>}
                          value={workspaceStats?.stats?.walletBalance || workspaceStats?.stats?.resellerWalletBalance || 150000}
                          precision={0}
                          suffix="PKR"
                          styles={{ content: { color: '#f8fafc', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' } }}
                        />
                        <p className="text-[9.5px] text-slate-500 font-mono m-0 mt-1">Dynamic cash reserve limit.</p>
                      </AntCard>
                    </AntCol>
                  )}

                  {/* Stats 2: Total subscriber count - Only show if allowed */}
                  {hasSubscribers && (
                    <AntCol xs={24} sm={12} lg={6}>
                      <AntCard className="bg-slate-900/40 border-slate-800 rounded-2xl relative overflow-hidden group shadow-md" styles={{ body: { padding: '20px' } }}>
                        <div className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                          <Users className="w-4 h-4" />
                        </div>
                        <AntStatistic 
                          title={<span className="text-[10px] font-mono text-slate-500 uppercase font-black">Subscribers Database</span>}
                          value={workspaceStats.stats.totalUsers || 2400}
                          precision={0}
                          suffix="lines"
                          styles={{ content: { color: '#f8fafc', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' } }}
                        />
                        <p className="text-[9.5px] text-slate-500 font-mono m-0 mt-1">Declared PPPoE / Static nodes.</p>
                      </AntCard>
                    </AntCol>
                  )}

                  {/* Stats 3: Active users count - Only show if allowed */}
                  {hasTelemetry && (
                    <AntCol xs={24} sm={12} lg={6}>
                      <AntCard className="bg-slate-900/40 border-slate-800 rounded-2xl relative overflow-hidden group shadow-md" styles={{ body: { padding: '20px' } }}>
                        <div className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-emerald-400">
                          <Wifi className="w-4 h-4 animate-pulse" />
                        </div>
                        <AntStatistic 
                          title={<span className="text-[10px] font-mono text-slate-500 uppercase font-black">Tunnels Online</span>}
                          value={workspaceStats.stats.activeUsers || 1980}
                          precision={0}
                          suffix="lines IP"
                          styles={{ content: { color: '#34d399', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' } }}
                        />
                        <p className="text-[9.5px] text-slate-500 font-mono m-0 mt-1">Dynamically active Radius leases.</p>
                      </AntCard>
                    </AntCol>
                  )}

                  {/* Stats 4: Pending Tickets complaints - Only show if allowed */}
                  {hasTickets && (
                    <AntCol xs={24} sm={12} lg={6}>
                      <AntCard className="bg-slate-900/40 border-slate-800 rounded-2xl relative overflow-hidden group shadow-md" styles={{ body: { padding: '20px' } }}>
                        <div className="absolute right-4 top-4 w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-rose-400">
                          <MessageSquare className="w-4 h-4 animate-bounce" />
                        </div>
                        <AntStatistic 
                          title={<span className="text-[10px] font-mono text-slate-500 uppercase font-black">Open Red Complaints</span>}
                          value={workspaceStats.stats.openTickets !== undefined ? workspaceStats.stats.openTickets : 4}
                          precision={0}
                          suffix="pending"
                          styles={{ content: { color: '#f43f5e', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '18px' } }}
                        />
                        <p className="text-[9.5px] text-slate-500 font-mono m-0 mt-1">Assigned Tech team deployments.</p>
                      </AntCard>
                    </AntCol>
                  )}
                </AntRow>
              )}

              {/* Financial Insights */}
              <div className="w-full">
                <FinancialChart role={currentRole} />
              </div>

              {/* Grid of central panels for Quick-Monitoring */}
              <AntRow gutter={[24, 24]}>

                {/* Operations 1: Real-time Telemetry Mini Graph Card */}
                {hasTelemetry && (
                  <AntCol xs={24} md={12} lg={8}>
                    <AntCard
                      title={
                        <AntSpace className="font-bold text-slate-200 font-mono text-xs uppercase">
                          <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                          <span>Live Node Telemetry</span>
                        </AntSpace>
                      }
                      extra={<Tag color="processing" className="font-mono text-[9px] m-0">4.5s Intervals</Tag>}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden group shadow-md h-full flex flex-col justify-between"
                      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '230px', flex: 1 } }}
                    >
                      <div className="space-y-4 w-full">
                        {/* Live Speeds Row */}
                        <AntRow gutter={16} className="text-center font-mono py-2 bg-slate-950/40 rounded-xl border border-slate-850 m-0">
                          <AntCol span={12} className="border-r border-slate-800">
                            <span className="block text-[9px] text-slate-500 uppercase">Downstream Rate</span>
                            <span className="text-sm text-indigo-400 font-extrabold flex items-center justify-center gap-1 mt-0.5">
                              <Download className="w-3.5 h-3.5 text-indigo-505 animate-bounce inline" />
                              {downloadSpeed.toLocaleString()}M
                            </span>
                          </AntCol>
                          <AntCol span={12}>
                            <span className="block text-[9px] text-slate-500 uppercase">Upstream Rate</span>
                            <span className="text-sm text-orange-400 font-extrabold flex items-center justify-center gap-1 mt-0.5">
                              <Upload className="w-3.5 h-3.5 text-orange-500 inline" />
                              {uploadSpeed.toLocaleString()}M
                            </span>
                          </AntCol>
                        </AntRow>

                        <p className="text-[11px] text-slate-400 font-normal leading-relaxed m-0">
                          Continuous live replication telemetry checking Core-BGP rings. Bandwidth spikes reflect peak evening times (6 PM to 11 PM Saddar region).
                        </p>
                      </div>

                      <AntButton
                        type="default"
                        onClick={() => setActiveTab("telemetry")}
                        className="w-full mt-4 bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-9"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Launch Analytics Desk
                      </AntButton>
                    </AntCard>
                  </AntCol>
                )}

                {/* Operations 2: Connected NAS and API Ports status */}
                {hasNas && (
                  <AntCol xs={24} md={12} lg={8}>
                    <AntCard
                      title={
                        <AntSpace className="font-bold text-slate-200 font-mono text-xs uppercase">
                          <Server className="w-4 h-4 text-indigo-400 animate-pulse" />
                          <span>NAS & MikroTik Cores</span>
                        </AntSpace>
                      }
                      extra={<Tag color="purple" className="font-mono text-[9px] m-0">Auto-radius</Tag>}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden group shadow-md h-full flex flex-col justify-between"
                      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '230px', flex: 1 } }}
                    >
                      <div className="space-y-2.5 w-full">
                        {routers.length === 0 ? (
                          <div className="text-center text-slate-500 text-[10px] font-mono py-4">
                            No active NAS elements attached.
                          </div>
                        ) : (
                          routers.slice(0, 3).map((r) => {
                            const isOnline = r.status === 'online';
                            return (
                              <div key={r.id} className="flex items-center justify-between text-[11px] font-mono bg-slate-950/40 border border-slate-850 p-2.5 rounded-lg">
                                <div className="flex items-center space-x-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                                  <span className="text-slate-200 font-medium">{r.name}</span>
                                </div>
                                <span className="text-indigo-400 text-[10px]">{r.ipAddress}</span>
                              </div>
                            );
                          })
                        )}
                        {routers.length > 3 && (
                          <div className="text-[9.5px] text-slate-500 text-center italic mt-1.5">
                            + {routers.length - 3} more physical core routers connected.
                          </div>
                        )}
                      </div>

                      <AntButton
                        type="default"
                        onClick={() => setActiveTab("nas")}
                        className="w-full mt-4 bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-9"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Manage Physical NAS Nodes
                      </AntButton>
                    </AntCard>
                  </AntCol>
                )}

                {/* Operations 3: Client complaints ledger summaries */}
                {hasTickets && (
                  <AntCol xs={24} md={12} lg={8}>
                    <AntCard
                      title={
                        <AntSpace className="font-bold text-slate-200 font-mono text-xs uppercase">
                          <MessageSquare className="w-4 h-4 text-indigo-400" />
                          <span>Dispatched Complaints</span>
                        </AntSpace>
                      }
                      extra={<Tag color="warning" className="font-mono text-[9px] m-0">Live SLA</Tag>}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden group shadow-md h-full flex flex-col justify-between"
                      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '230px', flex: 1 } }}
                    >
                      <div className="space-y-3 w-full">
                        {/* Interactive summary rows */}
                        <div className="text-[11px] font-mono bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-yellow-400 font-bold border-b border-slate-800 pb-1 text-[10px] m-0 leading-tight">
                            <span>Ticket 3218 (High)</span>
                            <span>Assigned: Junaid</span>
                          </div>
                          <p className="text-slate-355 text-slate-300 text-[10.5px] m-0 pt-1 leading-normal">Frequent dial disconnects Saddar NOC Sector 4.</p>
                        </div>

                        <div className="text-[11px] font-mono bg-slate-950/60 border border-slate-850 p-2.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between text-rose-400 font-bold border-b border-slate-800 pb-1 text-[10px] m-0 leading-tight">
                            <span>Ticket 3219 (Critical)</span>
                            <span>Assigned: Kamal</span>
                          </div>
                          <p className="text-slate-355 text-slate-300 text-[10.5px] m-0 pt-1 leading-normal">Main Fiber Core cuts reported on Lane 12 bridge.</p>
                        </div>
                      </div>

                      <AntButton
                        type="default"
                        onClick={() => setActiveTab("tickets")}
                        className="w-full mt-4 bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-9"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Launch Complaint Desk
                      </AntButton>
                    </AntCard>
                  </AntCol>
                )}

                {/* Operations 4: Bandwidth Speed Plan Profiles catalogs */}
                {hasPackages && (
                  <AntCol xs={24} md={12} lg={8}>
                    <AntCard
                      title={
                        <AntSpace className="font-bold text-slate-200 font-mono text-xs uppercase">
                          <Tag className="w-4 h-4 text-indigo-400" />
                          <span>Plan Profiles list</span>
                        </AntSpace>
                      }
                      extra={<Tag color="blue" className="font-mono text-[9px] m-0">broadband</Tag>}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden group shadow-md h-full flex flex-col justify-between"
                      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '230px', flex: 1 } }}
                    >
                      <div className="space-y-2 w-full">
                        {packages.length === 0 ? (
                          <div className="text-slate-500 text-[10px] font-mono py-4 text-center">
                            Syncing broadband tariff catalog...
                          </div>
                        ) : (
                          <AntRow gutter={[8, 8]} className="m-0">
                            {packages.slice(0, 4).map((p) => (
                              <AntCol span={12} key={p.id}>
                                <div className="bg-slate-950/40 border border-slate-850 p-2 rounded-xl text-[10px] font-mono text-zinc-300">
                                  <span className="font-bold text-slate-100 block truncate">{p.name}</span>
                                  <span className="text-[9px] text-indigo-455 text-indigo-400 mt-0.5 block">{p.speedMbps} Mbps</span>
                                </div>
                              </AntCol>
                            ))}
                          </AntRow>
                        )}
                      </div>

                      <AntButton
                        type="default"
                        onClick={() => setActiveTab("packages")}
                        className="w-full mt-4 bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-9"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Configure Pricing catalog
                      </AntButton>
                    </AntCard>
                  </AntCol>
                )}

                {/* Operations 5: Live alerts and historical NOC events list */}
                {hasTelemetry && (
                  <AntCol xs={24} md={12} lg={8}>
                    <AntCard
                      title={
                        <AntSpace className="font-bold text-slate-200 font-mono text-xs uppercase">
                          <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
                          <span>NOC Live Notifications stream</span>
                        </AntSpace>
                      }
                      extra={
                        <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1 select-none">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-ping"></span> Online
                        </span>
                      }
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden group shadow-md h-full flex flex-col justify-between"
                      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '230px', flex: 1 } }}
                    >
                      <div className="space-y-2 w-full max-h-[140px] overflow-y-auto pr-1">
                        {notifications.map((notif, index) => (
                          <div key={index} className="bg-slate-950/50 border border-slate-850 p-2.5 rounded-xl text-[10.5px] font-mono leading-relaxed text-slate-300 flex items-start gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5 inline-block" />
                            <span>{notif}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 text-[9.5px] font-mono text-slate-500 italic text-right mt-2 w-full">
                        💡 System synchronized with replica log.
                      </div>
                    </AntCard>
                  </AntCol>
                )}

                {/* Operations 6: HRM Quick Directory */}
                {hasHrm && (
                  <AntCol xs={24} md={12} lg={8}>
                    <AntCard
                      title={
                        <AntSpace className="font-bold text-slate-200 font-mono text-xs uppercase">
                          <Briefcase className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span>HRM Directory</span>
                        </AntSpace>
                      }
                      extra={<Tag color="success" className="font-mono text-[9px] m-0">Active Staff</Tag>}
                      className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden group shadow-md h-full flex flex-col justify-between"
                      styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '230px', flex: 1 } }}
                    >
                      <div className="space-y-2 w-full max-h-[140px] overflow-y-auto pr-1">
                        {staff.length === 0 ? (
                          <div className="text-slate-500 text-[10px] font-mono py-4 text-center">
                            Loading HR Directory...
                          </div>
                        ) : (
                          staff.slice(0, 3).map((s) => (
                            <div key={s.id} className="text-[11px] font-mono bg-slate-950/60 border border-slate-850 p-2.5 rounded-lg flex items-center justify-between">
                              <div>
                                <span className="font-bold text-slate-200 block">{s.name}</span>
                                <span className="text-[9px] text-slate-400">{s.role}</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono">{s.status}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <AntButton
                        type="default"
                        onClick={() => setActiveTab("hrm")}
                        className="w-full mt-4 bg-slate-900 border-slate-800 text-slate-350 hover:bg-slate-800 text-slate-300 rounded-xl text-[10px] font-bold uppercase font-mono tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5 h-9"
                        icon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Open HRM Portal
                      </AntButton>
                    </AntCard>
                  </AntCol>
                )}

              </AntRow>
            </div>
          )}

          {/* TAB 11: ACCOUNTING MODULE */}
          {activeTab === "accounting" && currentRole !== UserRole.CUSTOMER && (
            <AccountingManager />
          )}

          {/* TAB 1: TELEMETRY & TRAFFIC ANALYTICS */}
          {activeTab === "telemetry" && currentRole !== UserRole.CUSTOMER && (
            <AnalyticsPanel
              logs={logs}
              loading={false}
              onRefresh={loadTelemetry}
            />
          )}

          {/* TAB 2: SUBSCRIBERS BILLING MANAGER */}
          {activeTab === "subscribers" && currentRole !== UserRole.CUSTOMER && (
            <CustomerManager
              currentLevelId={currentId}
              currentRole={currentRole}
              packages={packages}
              setActiveTab={setActiveTab}
            />
          )}

          {/* TAB 2.5: RESELLER WALLET */}
          {activeTab === "wallet" && currentResellerNode && (
            <ResellerWallet
              currentReseller={currentResellerNode}
            />
          )}

          {/* TAB 3: HRM EMPLOYEES DIRECTORY & PAYROLL */}
          {activeTab === "hrm" && currentRole !== UserRole.CUSTOMER && (
            <HrmManager
              currentLevelId={currentId}
              currentRole={currentRole}
              departments={hrmDepartments}
              setDepartments={setHrmDepartments}
              rolePermissions={rolePermissions}
              onViewProfile={(staffId: string) => setActiveTab("profile:" + staffId)}
            />
          )}

          {/* TAB 4: TICKETS CENTER */}
          {activeTab === "tickets" && currentRole !== UserRole.CUSTOMER && (
            <TicketDesk
              currentLevelId={currentId}
              currentRole={currentRole}
              staff={staff}
            />
          )}

          {/* FRANCHISE MANAGER */}
          {activeTab === "franchises" && currentRole !== UserRole.CUSTOMER && (
            <FranchiseManager
              currentLevelId={currentId}
              currentRole={currentRole}
              onViewProfile={(resellerId: string) => setActiveTab("profile:" + resellerId)}
            />
          )}

          {/* DEALER MANAGER */}
          {activeTab === "dealers" && currentRole !== UserRole.CUSTOMER && (
            <DealerManager
              currentLevelId={currentId}
              currentRole={currentRole}
              onViewProfile={(resellerId: string) => setActiveTab("profile:" + resellerId)}
            />
          )}

          {/* SUB DEALER MANAGER */}
          {activeTab === "subdealers" && currentRole !== UserRole.CUSTOMER && (
            <SubDealerManager
              currentLevelId={currentId}
              currentRole={currentRole}
              onViewProfile={(resellerId: string) => setActiveTab("profile:" + resellerId)}
            />
          )}

          {/* PERMISSIONS MANAGER */}
          {activeTab === "permissions" && currentRole !== UserRole.CUSTOMER && (
            <PermissionsManager
              currentRole={currentRole}
              permissions={rolePermissions}
              onTogglePermission={handleTogglePermission}
              hrmDepartments={hrmDepartments}
            />
          )}

          {/* TAB 8: REPORTS MODULE */}
          {activeTab === "reporting" && currentRole !== UserRole.CUSTOMER && (
            <ReportsManager
              currentLevelId={currentId}
              currentRole={currentRole}
            />
          )}

          {/* TAB 6: PLAN PACKAGES CATALOGUE */}
          {activeTab === "packages" && currentRole !== UserRole.CUSTOMER && (
            <PackageManager
              currentLevelId={currentId}
              currentRole={currentRole}
            />
          )}

          {/* TAB 7: NAS & MIKROTIKS MANAGER */}
          {activeTab === "nas" && currentRole !== UserRole.CUSTOMER && (
            <NasManager
              currentLevelId={currentId}
              currentRole={currentRole}
            />
          )}

          {/* TAB 7.5: POLICIES AUTO-THROTTLER */}
          {activeTab === "policies" && currentRole !== UserRole.CUSTOMER && (
            <PolicyManager
              currentLevelId={currentId}
              currentRole={currentRole}
            />
          )}

          {/* MY PROFILE */}
          {activeTab.startsWith("profile") && (
            <ProfileManager
              profileId={activeTab.split(":")[1] || currentId}
              profileRole={
                activeTab.includes(":") 
                  ? (activeTab.split(":")[1].startsWith("cust") 
                      ? UserRole.CUSTOMER 
                      : (activeTab.split(":")[1].startsWith("st-") 
                          ? UserRole.HRM_STAFF 
                          : UserRole.FRANCHISE)) 
                  : currentRole
              }
              viewerId={currentId}
              viewerRole={currentRole}
              loggedInName={loggedInName}
              themeMode={themeMode}
              toggleTheme={toggleTheme}
            />
          )}

          {/* TAB 8: ACCESS CONTROL MATRIX */}
          {/* TAB 9: END SUBSCRIBER CLIENT PORTAL DASHBOARD */}
          {activeTab === "portal" && currentRole === UserRole.CUSTOMER && clientInfo && (
            <AntTabs
              defaultActiveKey="1"
              className="portal-tabs"
              items={[
                {
                  key: '1',
                  label: 'Overview',
                  children: (
                    <div className="space-y-6 animate-fade-in animate-duration-300">
              {/* User Info banner */}
              <AntCard
                className="bg-gradient-to-r from-slate-950 via-zinc-900 to-indigo-950/20 border border-slate-800 rounded-2xl relative overflow-hidden shadow-lg"
                styles={{ body: { padding: '24px' } }}
              >
                <div className="absolute top-4 right-4 flex items-center">
                  <Tag color="success" className="font-mono text-[9px] px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1.5 m-0 border-none bg-emerald-950/40 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                    <span>ONLINE CONNECTED</span>
                  </Tag>
                </div>

                <div className="space-y-2">
                  <Tag color="blue" className="text-[9px] font-mono m-0">PPPoE Subscriber Portal</Tag>
                  <h2 className="text-xl font-bold font-display text-neutral-100 tracking-tight m-0 pt-1">
                    Salam, {clientInfo.fullName}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono m-0 pt-0.5">
                    Your fiber line is active and stable. IP leased from Saddar NOC pool is <span className="text-indigo-400 font-bold">{clientInfo.ipAddress}</span>.
                  </p>
                </div>

                <AntDivider className="my-5 border-slate-800" />

                <AntRow gutter={[16, 16]} className="font-mono text-zinc-300">
                  <AntCol xs={12} sm={6}>
                    <span className="text-[9px] block text-zinc-500 uppercase tracking-widest font-black leading-none">Broadband Plan</span>
                    <span className="text-xs text-zinc-100 font-bold block mt-1">
                      {packages.find(p => p.id === clientInfo.packageId)?.name || "Gold Speed"}
                    </span>
                  </AntCol>
                  <AntCol xs={12} sm={6}>
                    <span className="text-[9px] block text-zinc-500 uppercase tracking-widest font-black leading-none">Bandwidth Rate</span>
                    <span className="text-xs text-indigo-455 text-indigo-400 font-bold block mt-1">
                      {packages.find(p => p.id === clientInfo.packageId)?.speedMbps || 50} Mbps
                    </span>
                  </AntCol>
                  <AntCol xs={12} sm={6}>
                    <span className="text-[9px] block text-zinc-500 uppercase tracking-widest font-black leading-none">Prepaid Balance</span>
                    <span className="text-xs text-emerald-400 font-bold block mt-1">{clientInfo.balance} PKR</span>
                  </AntCol>
                  <AntCol xs={12} sm={6}>
                    <span className="text-[9px] block text-zinc-500 uppercase tracking-widest font-black leading-none">Dynamic Renewal</span>
                    <span className="text-xs text-zinc-205 text-zinc-200 font-bold block mt-1">
                      {new Date(clientInfo.expiryDate).toLocaleDateString()}
                    </span>
                  </AntCol>
                </AntRow>
              </AntCard>

              {/* Sub-panels Grid (Speed Test / Interactive ledger) */}
              <AntRow gutter={[24, 24]}>
                
                {/* HIGH-FIDELITY LIVE SPEED TEST SIMULATION DIAGRAM */}
                <AntCol xs={24} md={12}>
                  <AntCard
                    title={
                      <AntSpace size="small" className="text-zinc-100">
                        <Wifi className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <div>
                          <h3 className="text-sm font-semibold m-0 text-slate-100">Broadband Speed Diagnostics</h3>
                          <p className="text-[11px] text-zinc-500 m-0">Benchmark your raw copper/fiber ISP link live.</p>
                        </div>
                      </AntSpace>
                    }
                    className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-lg h-full flex flex-col justify-between"
                    styles={{ body: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', flex: 1, padding: '24px' } }}
                  >
                    <div className="flex flex-col items-center justify-center py-4 w-full">
                      {/* Using real Ant Design Progress with type="dashboard" */}
                      <div className="relative flex flex-col items-center justify-center">
                        <AntProgress
                          type="dashboard"
                          percent={downSpeed ? Math.min(100, Math.floor((downSpeed / 300) * 100)) : (testingSpeed ? 45 : 0)}
                          status={testingSpeed ? "active" : "success"}
                          strokeColor={{ '0%': '#6366f1', '100%': '#10b981' }}
                          railColor="rgba(255,255,255,0.05)"
                          width={140}
                          format={() => null}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest leading-none">Speed Band</span>
                          <span className="text-2xl font-bold text-neutral-100 mt-1 block">
                            {testingSpeed && !downSpeed ? (
                              <Spin size="small" />
                            ) : (
                              <span>{downSpeed || "--"}</span>
                            )}
                          </span>
                          {downSpeed && <span className="text-[9px] text-zinc-500 mt-0.5">Mbps</span>}
                        </div>
                      </div>

                      {/* Benchmark ratings inside Ant Design gutter Row */}
                      <AntRow gutter={12} className="w-full text-center mt-6 font-mono text-[9.5px] text-zinc-400 m-0">
                        <AntCol span={8}>
                          <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl">
                            <span className="block text-zinc-500 uppercase text-[8px] leading-none">Ping</span>
                            <span className="text-xs text-emerald-400 font-bold block mt-1 leading-none">
                              {pingSpeed ? `${pingSpeed} ms` : "--"}
                            </span>
                          </div>
                        </AntCol>
                        <AntCol span={8}>
                          <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl">
                            <span className="block text-zinc-500 uppercase text-[8px] leading-none">Download</span>
                            <span className="text-xs text-indigo-400 font-bold block mt-1 leading-none">
                              {downSpeed ? `${downSpeed} Mbps` : "--"}
                            </span>
                          </div>
                        </AntCol>
                        <AntCol span={8}>
                          <div className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl">
                            <span className="block text-zinc-500 uppercase text-[8px] leading-none">Upload</span>
                            <span className="text-xs text-orange-400 font-bold block mt-1 leading-none">
                              {upSpeed ? `${upSpeed} Mbps` : "--"}
                            </span>
                          </div>
                        </AntCol>
                      </AntRow>
                    </div>

                    <AntButton
                      type="primary"
                      onClick={runSpeedTest}
                      disabled={testingSpeed}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 border-none rounded-xl text-xs font-bold h-10 mt-6 flex items-center justify-center space-x-1 shadow-lg"
                      icon={<PlayCircle className="w-4 h-4 text-slate-100 inline" />}
                    >
                      <span>{testingSpeed ? "Tunnelling..." : "Run Speed Diagnostics"}</span>
                    </AntButton>
                  </AntCard>
                </AntCol>



              </AntRow>

              {/* TECH COMPLAINT PORTAL */}
              <TicketDesk
                currentLevelId={currentId}
                currentRole={currentRole}
                staff={staff}
              />
            </div>
          ),
        },
        {
          key: '2',
          label: 'Billing History',
          children: (
            <AntCard className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-lg">
              <AntTable
                dataSource={clientBill}
                columns={[
                  { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
                  { title: 'Type', dataIndex: 'type', key: 'type', render: (type: string) => <AntTag>{type || 'Invoice'}</AntTag> },
                  { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (a: number) => <span className="font-mono font-bold text-zinc-300">{a} PKR</span> },
                  { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <AntTag color={s === 'paid' ? 'success' : 'error'}>{s}</AntTag> }
                ]}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                className="billing-table"
              />
            </AntCard>
          ),
        },
      ]}
    />
          )}

        </div>
          </div>
        </Layout.Content>
      </Layout>

      {/* Footer */}
      <Layout.Footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-[10px] font-mono text-slate-500 relative z-20" style={{ background: '#020617', borderTop: '1px solid #0f172a' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1400px] w-full mx-auto">
          <span>&copy; 2026 Nexus ISP Reseller Network. All rights reserved.</span>
          <span>Secure PostgreSQL backend relational simulation running live.</span>
        </div>
      </Layout.Footer>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}
