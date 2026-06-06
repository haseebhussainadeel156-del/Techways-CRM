import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Key, Shield, User, Lock, ArrowRight, Briefcase, Zap, Users, Loader2, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; role: UserRole; name: string; username?: string }, sessionId?: string) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Setup fields
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");

  useEffect(() => {
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        setNeedsSetup(data.needsSetup);
      })
      .catch(() => setNeedsSetup(false));
  }, []);

  const demoAccounts = [
    {
      id: "admin",
      username: "admin",
      label: "Super Admin",
      role: UserRole.ADMIN,
      desc: "Global Controller",
      icon: Shield,
    },
    {
      id: "res-1",
      username: "alpha.franchise@nexus.net",
      label: "Alpha Franchise",
      role: UserRole.FRANCHISE,
      desc: "Bulk reseller",
      icon: Briefcase,
    },
    {
      id: "res-3",
      username: "kamran.saddar@alpha.net",
      label: "Saddar Dealer",
      role: UserRole.DEALER,
      desc: "Sub-network hub",
      icon: Users,
    },
    {
      id: "res-5",
      username: "tariq.lanes@saddar-isp.net",
      label: "Lane 4 Sub-Dealer",
      role: UserRole.SUB_DEALER,
      desc: "Micro retail",
      icon: Zap,
    },
    {
      id: "cust-1",
      username: "zahid_fiber_home",
      label: "Zahid Ahmed",
      role: UserRole.CUSTOMER,
      desc: "Subscriber",
      icon: Key,
    },
    {
      id: "dept-1",
      username: "staff@nexus.net",
      label: "HRM NOC",
      role: UserRole.HRM_STAFF,
      desc: "Employee",
      icon: Users,
    }
  ];

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username?.trim()) {
      setErrorCode("Username or account email cannot be empty.");
      return;
    }

    setLoading(true);
    setErrorCode(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onLoginSuccess({
          id: data.user.id,
          role: data.user.role,
          name: data.user.name,
          username: username
        }, data.sessionId);
      } else {
        setErrorCode(data.error || "Authentication failed. Incorrect username/email.");
      }
    } catch (err) {
      setErrorCode("Could not communicate with authentication subsystem.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !setupName || !setupEmail) {
      setErrorCode("All fields are required.");
      return;
    }
    setLoading(true);
    setErrorCode(null);
    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email: setupEmail, name: setupName })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setNeedsSetup(false);
        setErrorCode("Setup complete! Please log in.");
        setTimeout(() => setErrorCode(null), 3000);
      } else {
        setErrorCode(data.error || "Setup failed.");
      }
    } catch (err) {
      setErrorCode("Could not communicate with setup subsystem.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demo: typeof demoAccounts[0]) => {
    setUsername(demo.username);
    setPassword("password123");
    
    setLoading(true);
    setErrorCode(null);
    setTimeout(async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: demo.username, password: "password123" })
        });
        const data = await response.json();
        if (response.ok && data.success) {
          onLoginSuccess({
            id: data.user.id,
            role: data.user.role,
            name: data.user.name,
            username: demo.username
          }, data.sessionId);
        } else {
          setErrorCode(data.error || "Demo selection auth sync error.");
        }
      } catch (err) {
        setErrorCode("Subsystem response timed out.");
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans text-slate-100 overflow-hidden">
      
      {/* Left Panel: Graphic / Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 border-r border-slate-800/80 p-12 flex-col justify-between overflow-hidden">
        {/* Decorative Grid and Gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex bg-indigo-500/10 p-4 rounded-2xl text-indigo-400 items-center justify-center border border-indigo-500/20 mb-8 backdrop-blur-sm">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-5xl font-display font-bold tracking-tight text-white mb-6">
            Nexus Hub <span className="text-indigo-400">V3</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md leading-relaxed font-light">
            The next-generation ISP Management platform. Integrated AAA, native MikroTik RouterOS automation, and seamless Reseller hierarchy.
          </p>
        </div>

        <div className="relative z-10 mt-auto">
          <div className="bg-slate-950/50 backdrop-blur-md border border-slate-800/50 p-6 rounded-2xl max-w-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="font-mono text-xs uppercase tracking-widest text-slate-300">System Status Online</span>
            </div>
            <p className="text-sm text-slate-500">
              Radius servers are responsive. PostgreSQL clustering is optimal. Ready for authentication.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        {/* Mobile Background Elements */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none lg:hidden"></div>
        
        <div className="w-full max-w-md relative z-10 mt-10 lg:mt-0">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-10 text-center lg:text-left"
          >
            <div className="lg:hidden inline-flex bg-indigo-500/10 p-3 rounded-xl text-indigo-400 mb-6 border border-indigo-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-display font-semibold text-white mb-2">
              {needsSetup ? "System Initialization" : "Welcome Back"}
            </h2>
            <p className="text-slate-400 text-sm">
              {needsSetup 
                ? "First time setup. Create the master administrative account." 
                : "Sign in to your broadband management dashboard"}
            </p>
          </motion.div>

          {needsSetup === true ? (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              onSubmit={handleSetup} 
              className="space-y-6"
            >
              {errorCode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3"
                >
                  <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-indigo-400 flex items-center justify-center pb-0.5 text-xs">i</div></div>
                  {errorCode}
                </motion.div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 pl-1 block">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><User className="h-5 w-5" /></div>
                    <input type="text" value={setupName} onChange={(e) => setSetupName(e.target.value)} disabled={loading} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600" placeholder="Super Admin" required />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 pl-1 block">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Mail className="h-5 w-5" /></div>
                    <input type="email" value={setupEmail} onChange={(e) => setSetupEmail(e.target.value)} disabled={loading} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600" placeholder="admin@nexus.net" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 pl-1 block">Username</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><User className="h-5 w-5" /></div>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600" placeholder="admin" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 pl-1 block">Master Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500"><Lock className="h-5 w-5" /></div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600" placeholder="••••••••" required />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Setting up...</span></>
                ) : (
                  <><Shield className="w-5 h-5" /><span>Initialize System</span></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              onSubmit={handleLogin} 
              className="space-y-6"
            >
              {errorCode && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3"
                >
                  <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-rose-400 flex items-center justify-center pb-0.5 text-xs">!</div></div>
                  {errorCode}
                </motion.div>
              )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 pl-1 block">
                  Identity
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                    placeholder="Username or Email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest font-semibold text-slate-400 pl-1 block">
                  Access Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-slate-600"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 group disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.form>
          )}

          {needsSetup === false && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              className="mt-12 pt-8 border-t border-slate-800/80"
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-semibold flex-1">Demo Access Portal</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {demoAccounts.map((account) => {
                  const Icon = account.icon;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleQuickLogin(account)}
                      disabled={loading}
                      className="flex flex-col items-start text-left p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700 transition-all group disabled:opacity-50"
                    >
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors mb-2" />
                      <span className="text-xs font-medium text-slate-300 group-hover:text-white truncate w-full">{account.label}</span>
                      <span className="text-[10px] text-slate-500 truncate w-full">{account.role}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
          
        </div>
      </div>
    </div>
  );
}
