import React, { useState } from 'react';
import { UserRole } from '../types';
import { Card, Form, Input, Button, Alert, Row, Col, Typography, Space, Divider } from 'antd';
import { Key, Shield, User, Lock, ArrowRight, HelpCircle, Briefcase, Zap, Users } from 'lucide-react';

const { Title, Text } = Typography;

interface LoginPageProps {
  onLoginSuccess: (user: { id: string; role: UserRole; name: string; username?: string }) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [form] = Form.useForm();

  const demoAccounts = [
    {
      id: "admin",
      username: "admin",
      label: "Super Admin",
      role: UserRole.ADMIN,
      desc: "Global ISP Controller",
      icon: Shield,
      style: { border: '1px solid rgba(20, 184, 166, 0.2)', backgroundColor: 'rgba(20, 184, 166, 0.05)' }
    },
    {
      id: "res-1",
      username: "alpha.franchise@nexus.net",
      label: "Alpha Franchise",
      role: UserRole.FRANCHISE,
      desc: "Bulk reseller hub",
      icon: Briefcase,
      style: { border: '1px solid rgba(168, 85, 247, 0.2)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }
    },
    {
      id: "res-3",
      username: "kamran.saddar@alpha.net",
      label: "Saddar Dealer",
      role: UserRole.DEALER,
      desc: "Sub-network hub",
      icon: Users,
      style: { border: '1px solid rgba(59, 130, 246, 0.2)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }
    },
    {
      id: "res-5",
      username: "tariq.lanes@saddar-isp.net",
      label: "Lane 4 Sub-Dealer",
      role: UserRole.SUB_DEALER,
      desc: "Micro retail tier",
      icon: Zap,
      style: { border: '1px solid rgba(249, 115, 22, 0.2)', backgroundColor: 'rgba(249, 115, 22, 0.05)' }
    },
    {
      id: "cust-1",
      username: "zahid_fiber_home",
      label: "Zahid Ahmed Shah",
      role: UserRole.CUSTOMER,
      desc: "End Subscriber Client",
      icon: Key,
      style: { border: '1px solid rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }
    },
    {
      id: "dept-1",
      username: "staff@nexus.net",
      label: "HRM Staff (NOC)",
      role: UserRole.HRM_STAFF,
      desc: "Employee Access",
      icon: Users,
      style: { border: '1px solid rgba(16, 185, 129, 0.2)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }
    }
  ];

  const handleLogin = async (values: any) => {
    const { username, password } = values;
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
        });
      } else {
        setErrorCode(data.error || "Authentication failed. Incorrect username/email.");
      }
    } catch (err) {
      setErrorCode("Could not communicate with authentication subsystem.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demo: typeof demoAccounts[0]) => {
    form.setFieldsValue({
      username: demo.username,
      password: "password123"
    });
    
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
          });
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
    <div id="login-screen-view" className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans text-slate-100">
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        
        {/* Logo/Branding Section */}
        <div className="text-center mb-6">
          <div className="inline-flex bg-indigo-600 p-3.5 rounded-2xl text-white items-center justify-center shadow-2xl mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <Title level={2} className="m-0 text-slate-50 font-display font-extrabold" style={{ margin: 0, color: '#f8fafc' }}>
            Nexus Hub <span className="text-indigo-400 font-mono text-base font-bold px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">V3</span>
          </Title>
          <p className="text-slate-400 text-xs font-mono mt-1 mb-0">
            Enterprise Subscriber provisioning & Mikrotik Reseller AAA Gateway
          </p>
        </div>

        {/* Mainland Login Card (Antd Card) */}
        <Card 
          className="border border-slate-800/80 bg-slate-900/80 rounded-3xl backdrop-blur shadow-2xl overflow-hidden"
          styles={{ body: { padding: '32px' } }}
        >
          <div className="mb-6 text-left">
            <Title level={4} className="m-0 text-slate-50 font-semibold" style={{ margin: 0, color: '#f8fafc' }}>System Login</Title>
            <Text className="text-slate-400 text-xs block mt-1">Enter your assigned broadband identifier or parent reseller email.</Text>
          </div>

          {errorCode && (
            <Alert 
              message={errorCode} 
              type="error" 
              showIcon 
              className="mb-5 bg-rose-950/20 border-rose-900/50 text-rose-300 font-mono text-xs rounded-xl"
            />
          )}

          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleLogin}
            requiredMark={false}
          >
            <Form.Item 
              name="username" 
              label={<span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">Username or Registered Email</span>}
              rules={[{ required: true, message: 'Please input your username or email' }]}
            >
              <Input 
                prefix={<User className="h-4 w-4 text-slate-500 mr-1.5" />} 
                placeholder="e.g. zahid_fiber_home or admin@nexus.net" 
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl h-11 hover:border-indigo-500" 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item 
              name="password" 
              label={
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">Password Key</span>
                  <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1 normal-case font-normal">
                    <HelpCircle className="w-3 h-3" /> Any key matches
                  </span>
                </div>
              }
              rules={[{ required: true, message: 'Please input your password key' }]}
            >
              <Input.Password 
                prefix={<Lock className="h-4 w-4 text-slate-500 mr-1.5" />} 
                placeholder="••••••••" 
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-xl h-11 hover:border-indigo-500 password-field" 
                disabled={loading}
              />
            </Form.Item>

            <Form.Item className="mt-6 mb-0">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 border-none text-white font-extrabold uppercase font-mono tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                {!loading && (
                  <>
                    <span>Initialize Dashboard Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
                {loading && <span>Verifying Tunnel...</span>}
              </Button>
            </Form.Item>
          </Form>

          {/* Quick Access Simulator Panel */}
          <Divider className="border-slate-800/80 my-5" />
          
          <div className="space-y-3 text-left">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-slate-400 uppercase font-black tracking-wider">Quick Identity Tunnel (Simulator Bypass)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            
            <Row gutter={[8, 8]}>
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <Col xs={24} sm={12} key={account.id}>
                    <button
                      onClick={() => handleQuickLogin(account)}
                      disabled={loading}
                      style={account.style}
                      className="w-full flex items-start p-2 rounded-xl text-left cursor-pointer transition-all hover:brightness-110 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed border outline-none"
                    >
                      <Icon className="w-4 h-4 mr-2 mt-0.5 shrink-0 text-slate-300" />
                      <div className="overflow-hidden">
                        <div className="text-[10.5px] font-bold text-slate-200 leading-none">{account.label}</div>
                        <div className="text-[9px] text-slate-500 truncate mt-1">{account.desc}</div>
                      </div>
                    </button>
                  </Col>
                );
              })}
            </Row>
          </div>
        </Card>

        {/* Underfooter */}
        <p className="text-center text-[10px] text-slate-600 font-mono mt-6 mb-0">
          Nexus Core DB &copy; 2026. MicroTik-Radius transaction tunnel synced.
        </p>

      </div>
    </div>
  );
}
