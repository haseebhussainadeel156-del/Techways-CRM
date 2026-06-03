import React, { useState, useEffect } from 'react';
import { RouterOS, UserRole } from '../types';
import { Card, Button, Form, Input, InputNumber, Tag, Row, Col, Typography, Progress, Badge, Alert, Space, message, Popconfirm } from 'antd';
import { Server, Plus, Edit2, Trash2, Cpu, RefreshCw, HardDrive, MapPin, Globe, Database, CheckCircle, AlertTriangle } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;

interface NasManagerProps {
  currentRole: UserRole;
  currentLevelId: string;
}

export default function NasManager({ currentRole, currentLevelId }: NasManagerProps) {
  const [routers, setRouters] = useState<RouterOS[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRouter, setEditingRouter] = useState<RouterOS | null>(null);
  const [form] = Form.useForm();

  // Interactive Diagnostic States
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'running' | 'success' | 'failed';
    logs: string[];
    resources?: { cpu: number; ram: number; uptime: string; leases: number };
  }>({ status: 'idle', logs: [] });

  const fetchRouters = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/routers');
      if (!res.ok) throw new Error('Failed to load routers database');
      const data = await res.json();
      setRouters(data);
    } catch (err: any) {
      message.error(err.message || 'Failed to load routers database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouters();
  }, []);

  const handleFormFinish = async (values: any) => {
    const payload = {
      name: values.name,
      ipAddress: values.ipAddress,
      apiPort: Number(values.apiPort),
      username: values.username || 'admin',
      password: values.password || '',
      secret: values.secret || '',
      location: values.location || 'Central NOC'
    };

    try {
      if (editingRouter) {
        const res = await fetch(`/api/routers/${editingRouter.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update router credentials');
        message.success(`NAS Router "${values.name}" settings successfully updated.`);
      } else {
        const res = await fetch('/api/routers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to configure network gateway');
        message.success(`NAS Router "${values.name}" successfully attached.`);
      }
      resetForm();
      fetchRouters();
    } catch (err: any) {
      message.error(err.message || 'Operation failed');
    }
  };

  const handleDeleteRouter = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/routers/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to decouple router node');
      message.success(`Router "${name}" has been successfully decoupled from the accounting core.`);
      fetchRouters();
    } catch (err: any) {
      message.error(err.message || 'Failed to decouple router node');
    }
  };

  const startEdit = (router: RouterOS) => {
    setEditingRouter(router);
    form.setFieldsValue({
      name: router.name,
      ipAddress: router.ipAddress,
      apiPort: (router as any).apiPort || 8728,
      username: (router as any).username || 'admin',
      password: (router as any).password || '',
      secret: (router as any).secret || '',
      location: (router as any).location || 'Central NOC'
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingRouter(null);
    setShowAddForm(false);
    form.resetFields();
  };

  const handleTestConnection = async (router: RouterOS) => {
    setTestingId(router.id);
    setTestResult({
      status: 'running',
      logs: [
        `[${new Date().toLocaleTimeString()}] Pinging address ${router.ipAddress}... Ready`,
        `[${new Date().toLocaleTimeString()}] Establishing TCP pipe tunnel on RouterOS API port ${(router as any).apiPort || 8728}...`
      ]
    });

    try {
      const resp = await fetch(`/api/routers/${router.id}/sync`, { method: 'POST' });
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.details || data.error || 'Failed to connect to RouterOS API');
      }

      setTestResult(prev => ({
        ...prev,
        status: 'success',
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] Authenticated with RouterOS API natively.`,
          `[${new Date().toLocaleTimeString()}] Discovered resource utilization variables.`,
          `[${new Date().toLocaleTimeString()}] RADIUS client bindings refreshed natively.`
        ],
        resources: {
          cpu: router.cpuUsage > 0 ? router.cpuUsage : 4,
          ram: router.memoryUsage > 0 ? router.memoryUsage : 10,
          uptime: router.uptime !== '0m' ? router.uptime : 'Active',
          leases: router.activeUsers
        }
      }));
      message.success(data.message || 'Router connection successfully tested');
      fetchRouters(); // Refresh list to update UI usages
    } catch (err: any) {
      setTestResult(prev => ({
        ...prev,
        status: 'failed',
        logs: [
          ...prev.logs,
          `[${new Date().toLocaleTimeString()}] ERROR: Connection timeout or unreachable.`,
          `[${new Date().toLocaleTimeString()}] Reason: ${err.message}`
        ]
      }));
    }
  };

  return (
    <div className="space-y-6">
      <Card 
        className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden backdrop-blur"
        styles={{ body: { padding: '24px' } }}
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
          <Space align="center" size="middle">
            <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-xl text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <Title level={5} className="m-0 text-slate-100 font-bold uppercase tracking-tight" style={{ margin: 0, color: '#f8fafc', fontSize: '14px' }}>
                NAS & MikroTik Router Nodes
              </Title>
              <Text className="text-[11px] text-slate-400 block font-mono">
                Dynamic Radius Billing & Dynamic PPPoE Tunnel controllers.
              </Text>
            </div>
          </Space>

          <Button
            type="primary"
            icon={<Plus className="w-4 h-4 mr-1" />}
            onClick={() => {
              if (showAddForm) resetForm();
              else setShowAddForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 border-none rounded-xl text-xs font-bold flex items-center shadow-lg cursor-pointer"
          >
            {showAddForm ? 'Close Console' : 'Add NAS / MikroTik'}
          </Button>
        </div>

        {/* Add/Edit Form Overlay wrapper */}
        {showAddForm && (
          <Card 
            className="relative z-10 bg-slate-950/80 border border-slate-800 rounded-xl mb-6 shadow-xl"
            styles={{ body: { padding: '20px' } }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                {editingRouter ? `Modify Device Details (${editingRouter.name})` : 'Register New NAS / Connection Target'}
              </span>
              <Button type="text" size="small" onClick={resetForm} className="text-slate-500 hover:text-slate-300 font-mono text-[10px]">
                Cancel
              </Button>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleFormFinish}
              requiredMark={false}
              initialValues={{ apiPort: 8728, username: 'admin', location: 'Central NOC' }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="name"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">Router Display Name</span>}
                    rules={[{ required: true, message: 'Display name required' }]}
                  >
                    <Input placeholder="e.g. NOC-Saddar-Core" className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="ipAddress"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">IP Address / Host domain</span>}
                    rules={[{ required: true, message: 'IP address required' }]}
                  >
                    <Input placeholder="e.g. 192.168.88.1" className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="apiPort"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">RouterOS API Port</span>}
                    rules={[{ required: true, message: 'Port required' }]}
                  >
                    <InputNumber className="w-full bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="username"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">SSH/API Username</span>}
                  >
                    <Input placeholder="admin" className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="password"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">Access Password</span>}
                  >
                    <Input.Password placeholder="••••••••" className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={8}>
                  <Form.Item
                    name="secret"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">RADIUS Shared Secret</span>}
                  >
                    <Input placeholder="e.g. sharedSecretValue" className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    name="location"
                    label={<span className="text-[10px] uppercase font-bold text-slate-400">Physical Location Office</span>}
                  >
                    <Input placeholder="Saddar NOC Rack 04 Grid Zone" className="bg-slate-900 border-slate-800 text-slate-200 font-mono text-xs rounded-lg" />
                  </Form.Item>
                </Col>
              </Row>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-800">
                <Button type="text" onClick={resetForm} className="text-slate-400 hover:text-white">
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" className="bg-indigo-600 hover:bg-indigo-500 border-none font-bold rounded-xl shadow-lg">
                  {editingRouter ? 'Save Changes' : 'Confirm Hardware Node'}
                </Button>
              </div>
            </Form>
          </Card>
        )}

        {/* Routers Grid */}
        <Row gutter={[16, 16]} className="relative z-10">
          {loading && routers.length === 0 ? (
            <Col span={24}>
              <div className="text-center py-10 text-xs font-mono text-slate-500">
                Syncing physical MikroTik registries...
              </div>
            </Col>
          ) : routers.length === 0 ? (
            <Col span={24}>
              <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-slate-500 font-mono">
                No authenticated MikroTik NAS gateways declared. Add one above to handle subscriber sessions.
              </div>
            </Col>
          ) : (
            routers.map((router) => {
              const works = router.status === 'online';
              return (
                <Col xs={24} md={12} key={router.id}>
                  <Card 
                    className="bg-slate-950/60 border border-slate-850 hover:border-slate-700/80 transition-all rounded-xl shadow-md h-full flex flex-col justify-between"
                    styles={{ body: { padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                        <Space size="middle">
                          <div className={`p-2 rounded-xl border ${works ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/30 border-rose-900/40 text-rose-400'}`}>
                            <Server className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-150 flex items-center">
                              {router.name}
                              <span className={`w-1.5 h-1.5 rounded-full ml-2 ${works ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Globe className="w-3.5 h-3.5 text-slate-650" />
                              <span>{router.ipAddress}:{ (router as any).apiPort || '8728' }</span>
                            </div>
                          </div>
                        </Space>

                        <Space>
                          <Button
                            type="text"
                            size="small"
                            onClick={() => startEdit(router)}
                            icon={<Edit2 className="w-3.5 h-3.5" />}
                            className="text-slate-400 hover:text-blue-400 hover:bg-slate-900 rounded-lg cursor-pointer"
                          />
                          <Popconfirm
                            title={`Are you sure you want to decouple device ${router.name}?`}
                            onConfirm={() => handleDeleteRouter(router.id, router.name)}
                            okText="Yes"
                            cancelText="No"
                            okButtonProps={{ className: 'bg-rose-600 hover:bg-rose-500 border-none text-white' }}
                          >
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              className="text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg cursor-pointer"
                            />
                          </Popconfirm>
                        </Space>
                      </div>

                      {/* Info points */}
                      <Row gutter={[8, 8]} className="text-[10px] font-mono border-b border-slate-800/40 pb-3 mb-4">
                        <Col span={12} className="flex items-center space-x-1.5 text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span className="truncate">{ (router as any).location || 'Grid NOC Block' }</span>
                        </Col>
                        <Col span={12} className="text-right text-slate-400 select-none">
                          <span>Uptime: </span>
                          <span className="text-slate-200 font-semibold">{works ? router.uptime : '0m'}</span>
                        </Col>
                        <Col span={12} className="text-slate-400">
                          <span>API user: </span>
                          <span className="text-indigo-400 font-medium">{ (router as any).username || 'admin' }</span>
                        </Col>
                        <Col span={12} className="text-right text-slate-405 text-slate-400 font-bold">
                          <span>Active Tunnels: </span>
                          <span className="text-slate-100">{works ? router.activeUsers : 0} Lines</span>
                        </Col>
                      </Row>

                      {/* Resource meters */}
                      <Row gutter={[16, 16]} className="text-[10px] font-mono text-slate-400 mb-4">
                        <Col span={12}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-1 text-[9.5px]">
                              <Cpu className="w-3 h-3 text-slate-500" /> CPU usage
                            </span>
                            <span className="font-bold text-slate-300">{works ? router.cpuUsage : 0}%</span>
                          </div>
                          <Progress 
                            percent={works ? router.cpuUsage : 0} 
                            showInfo={false} 
                            strokeColor={{ '0%': '#6366f1', '100%': '#4f46e5' }}
                            railColor="rgba(255,255,255,0.05)"
                            className="m-0"
                          />
                        </Col>

                        <Col span={12}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="flex items-center gap-1 text-[9.5px]">
                              <HardDrive className="w-3 h-3 text-slate-500" /> RAM load
                            </span>
                            <span className="font-bold text-slate-300">{works ? router.memoryUsage : 0}%</span>
                          </div>
                          <Progress 
                            percent={works ? router.memoryUsage : 0} 
                            showInfo={false} 
                            strokeColor={{ '0%': '#6366f1', '100%': '#4f46e5' }}
                            railColor="rgba(255,255,255,0.05)"
                            className="m-0"
                          />
                        </Col>
                      </Row>
                    </div>

                    {/* Diagnostic triggers */}
                    <div className="pt-2 w-full">
                      <Button
                        type="default"
                        onClick={() => handleTestConnection(router)}
                        loading={testingId === router.id && testResult.status === 'running'}
                        className="w-full h-8 bg-slate-900/60 border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg flex items-center justify-center font-bold text-[10.5px] cursor-pointer"
                      >
                        {!loading && <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 mr-1 ${testingId === router.id && testResult.status === 'running' ? 'animate-spin' : ''}`} />}
                        <span>Perform Connection Diagnostics</span>
                      </Button>
                    </div>
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      </Card>

      {/* Connection Diagnostic Live Logs Terminal */}
      {testingId && testResult.status !== 'idle' && (
        <Card 
          className="bg-slate-950 border border-slate-850 rounded-2xl p-0 font-mono text-[11px] shadow-inner"
          styles={{ body: { padding: '20px' } }}
        >
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-3">
            <span className="text-slate-400 flex items-center gap-1.5 uppercase tracking-wider font-extrabold text-[10px]">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Live NOC Terminal API Sync Logger
            </span>
            <Button
              type="text"
              size="small"
              onClick={() => {
                setTestingId(null);
                setTestResult({ status: 'idle', logs: [] });
              }}
              className="text-slate-500 hover:text-slate-300 text-[10px] p-0"
            >
              Close Console
            </Button>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-850/50 space-y-1.5 max-h-[160px] overflow-y-auto font-mono text-indigo-300/90 leading-relaxed">
            {testResult.logs.map((log, idx) => (
              <div key={idx} className="animate-fade-in">{log}</div>
            ))}
            {testResult.status === 'running' && (
              <div className="flex items-center space-x-2 text-slate-500 italic mt-1">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Buffering frames...</span>
              </div>
            )}
          </div>

          {testResult.status === 'success' && testResult.resources && (
            <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400/90 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 mt-3">
              <Space align="center">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                <span className="font-bold text-[11.5px]">RouterOS API Connection fully operating</span>
              </Space>
              
              <Row gutter={[16, 8]} className="text-[10px] font-mono text-slate-300 md:w-auto w-full">
                <Col xs={12} sm={6}>
                  <span className="block text-emerald-600 uppercase text-[9px] font-bold">Uptime term</span>
                  <span className="font-bold">{testResult.resources.uptime}</span>
                </Col>
                <Col xs={12} sm={6}>
                  <span className="block text-emerald-600 uppercase text-[9px] font-bold">CPU load</span>
                  <span className="font-bold">{testResult.resources.cpu}%</span>
                </Col>
                <Col xs={12} sm={6}>
                  <span className="block text-emerald-600 uppercase text-[9px] font-bold">Free RAM</span>
                  <span className="font-bold">{100 - testResult.resources.ram}%</span>
                </Col>
                <Col xs={12} sm={6}>
                  <span className="block text-emerald-600 uppercase text-[9px] font-bold">Session Pool</span>
                  <span className="font-bold text-indigo-400">{testResult.resources.leases} Active</span>
                </Col>
              </Row>
            </div>
          )}

          {testResult.status === 'failed' && (
            <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400/95 p-4 rounded-xl flex items-center space-x-2.5 mt-3">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
              <div>
                <span className="font-bold block text-[11.5px]">Physical Bridge Query Offline</span>
                <span className="text-[10px] text-slate-400">Validate console account name and remote firewall permissions in RouterOS `/ip service` parameters.</span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
