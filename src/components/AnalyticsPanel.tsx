import React, { useState, useEffect } from 'react';
import { BandwidthDataPoint } from '../types';
import { Card, Row, Col, Typography, Space, Statistic, Tabs, Button, Form, Input, Select, InputNumber, Table, Tag, Alert, message, Divider, Skeleton } from 'antd';
import { Activity, Server, ArrowDownLeft, ArrowUpRight, TrendingUp, RefreshCw, Wallet, Terminal, Database, Calendar, Plus, Info, Clock, CheckCircle } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface AnalyticsPanelProps {
  logs: BandwidthDataPoint[];
  loading: boolean;
  onRefresh: () => void;
}

export default function AnalyticsPanel({ logs, loading, onRefresh }: AnalyticsPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<string>("throughput");
  
  // Custom fetched states
  const [cashflowList, setCashflowList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activePanelLoading, setActivePanelLoading] = useState(false);

  // Form toggles
  const [showFlowForm, setShowFlowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);

  const [formFlow] = Form.useForm();
  const [formCat] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAllTelemetry = async () => {
    setActivePanelLoading(true);
    try {
      const fc = await fetch('/api/cashflow');
      setCashflowList(await fc.json());
      const fcat = await fetch('/api/cashflow/categories');
      const catsData = await fcat.json();
      setCategories(catsData);
      const fact = await fetch('/api/activity-logs');
      setActivityLogs(await fact.json());
      const frad = await fetch('/api/radius-sessions');
      setSessions(await frad.json());
    } catch (e) {
      console.error("Failed to fetch additional telemetry records", e);
    } finally {
      setActivePanelLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTelemetry();
  }, [activeSubTab]);

  const handleAddCategory = async (values: any) => {
    try {
      const res = await fetch('/api/cashflow/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, description: values.description, type: values.type })
      });
      if (res.ok) {
        message.success("Expense category defined successfully!");
        formCat.resetFields();
        setShowCatForm(false);
        fetchAllTelemetry();
      }
    } catch (err) {
      message.error("Failed to definition category");
    }
  };

  const handleAddCashflow = async (values: any) => {
    try {
      const res = await fetch('/api/cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: values.type,
          categoryId: values.categoryId,
          amount: Number(values.amount),
          description: values.description,
          addedBy: localStorage.getItem("nexus_username") || "admin"
        } as any)
      });
      if (res.ok) {
        message.success("Cash flow item posted successfully!");
        formFlow.resetFields();
        setShowFlowForm(false);
        fetchAllTelemetry();
      }
    } catch (err) {
      message.error("Failed to post entry");
    }
  };

  // Throughput chart calculations
  const txValues = logs.map(l => l.txMbps);
  const rxValues = logs.map(l => l.rxMbps);
  const maxTx = Math.max(...txValues, 1000);
  const maxRx = Math.max(...rxValues, 500);
  const maxVal = Math.max(maxTx, maxRx) * 1.15; // padding headroom

  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 20;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const getPointsStr = (values: number[]) => {
    if (values.length < 2) return "";
    return values.map((val, idx) => {
      const x = paddingX + (idx / (values.length - 1)) * chartWidth;
      const y = height - paddingY - (val / maxVal) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  const rxPoints = getPointsStr(rxValues);
  const txPoints = getPointsStr(txValues);

  const rxAreaPoints = rxPoints ? `${paddingX},${height - paddingY} ${rxPoints} ${width - paddingX},${height - paddingY}` : "";
  const txAreaPoints = txPoints ? `${paddingX},${height - paddingY} ${txPoints} ${width - paddingX},${height - paddingY}` : "";

  const latest = logs[logs.length - 1] || { rxMbps: 0, txMbps: 0, activeSessions: 0, timestamp: "N/A" };

  // Financial aggregates calculations
  const totalIncome = cashflowList
    .filter(c => c.type === 'income')
    .reduce((sum, current) => sum + Number(current.amount), 0);

  const totalExpense = cashflowList
    .filter(c => c.type === 'expense')
    .reduce((sum, current) => sum + Number(current.amount), 0);

  const netBalance = totalIncome - totalExpense;

  // Filters application
  const filteredActivities = activityLogs.filter(act => {
    const term = searchQuery.toLowerCase();
    return (
      act.activity.toLowerCase().includes(term) ||
      act.adminId.toLowerCase().includes(term) ||
      act.stationIp.toLowerCase().includes(term)
    );
  });

  return (
    <Card 
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-0 mb-6 relative overflow-hidden backdrop-blur"
      styles={{ body: { padding: '24px' } }}
    >
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
      
      {/* Upper header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
        <Space align="center" size="middle">
          <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-600/20 text-indigo-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <Title level={5} className="m-0 text-slate-100 font-bold uppercase tracking-tight" style={{ margin: 0, color: '#f8fafc', fontSize: '14px' }}>
              Nexus Terminal & Audit Telemetry
            </Title>
            <Text className="text-[11px] text-slate-400 block">
              Continuous network analysis alongside ledger overhead tracking and actions trace auditing.
            </Text>
          </div>
        </Space>

        {/* Unified Subnavigation tabs using Ant Design segmented style Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <Tabs
            size="small"
            activeKey={activeSubTab}
            onChange={setActiveSubTab}
            className="custom-tabs border-none"
            items={[
              { label: 'BGP Throughput', key: 'throughput' },
              { label: 'Nexus Accounting Ledger', key: 'cashflow' },
              { label: 'Activity Audit', key: 'activity' },
              { label: 'Radius Sessions', key: 'radius' },
            ]}
          />
        </div>
      </div>

      {activePanelLoading ? (
        <Card className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : (
        <div className="relative z-10">
          {activeSubTab === "throughput" && (
            <Row gutter={[24, 24]} className="animate-fade-in">
              {/* Statistics Highlights */}
              <Col xs={24} lg={8} className="space-y-4">
                <Card className="bg-slate-950/40 border-slate-800 rounded-xl shadow-inner" styles={{ body: { padding: '20px' } }}>
                  <Row align="middle" justify="space-between">
                    <div>
                      <Text className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center font-bold">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                        Aggregate Download
                      </Text>
                      <Title level={3} className="m-0 text-slate-100 font-mono font-bold mt-1.5" style={{ margin:0, color: '#fff' }}>
                        {latest.rxMbps} <span className="text-xs text-slate-500 font-normal">Mbps</span>
                      </Title>
                    </div>
                    <Tag color="green" className="m-0 font-mono font-bold px-2.5 border-none">Live RX</Tag>
                  </Row>
                </Card>

                <Card className="bg-slate-950/40 border-slate-800 rounded-xl shadow-inner" styles={{ body: { padding: '20px' } }}>
                  <Row align="middle" justify="space-between">
                    <div>
                      <Text className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center font-bold">
                        <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 mr-1.5" />
                        Aggregate Upload
                      </Text>
                      <Title level={3} className="m-0 text-slate-100 font-mono font-bold mt-1.5" style={{ margin:0, color: '#fff' }}>
                        {latest.txMbps} <span className="text-xs text-slate-500 font-normal">Mbps</span>
                      </Title>
                    </div>
                    <Tag color="blue" className="m-0 font-mono font-bold px-2.5 border-none">Live TX</Tag>
                  </Row>
                </Card>

                <Card className="bg-slate-950/40 border-slate-800 rounded-xl shadow-inner" styles={{ body: { padding: '20px' } }}>
                  <Row align="middle" justify="space-between">
                    <div>
                      <Text className="text-[10px] font-mono text-slate-500 uppercase tracking-widest flex items-center font-bold">
                        <Server className="w-3.5 h-3.5 text-orange-400 mr-1.5" />
                        Active Sessions
                      </Text>
                      <Title level={3} className="m-0 text-slate-100 font-mono font-bold mt-1.5" style={{ margin:0, color: '#fff' }}>
                        {latest.activeSessions} <span className="text-xs text-slate-400 font-normal">Lines</span>
                      </Title>
                    </div>
                    <Tag color="orange" className="m-0 font-mono font-bold px-2.5 border-none">PPPoE Online</Tag>
                  </Row>
                </Card>
              </Col>

              {/* MicroTik Vector Graph rendering section */}
              <Col xs={24} lg={16}>
                <Card className="bg-slate-950/40 border-slate-800 rounded-xl" styles={{ body: { padding: '20px' } }}>
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-3.5 mb-4">
                    <span className="text-xs uppercase font-extrabold text-slate-350 text-slate-300 font-mono">Bilateral Carrier Symmetrical Interface</span>
                    <div className="text-[9.5px] font-mono flex items-center space-x-3 text-slate-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-indigo-500 inline-block"></span> Uplink Octets
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-emerald-400 inline-block"></span> Downlink Octets
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-900 rounded-xl overflow-hidden shadow-inner p-3 relative">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-indigo-400">
                      <defs>
                        <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#34d399" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Matrix grid lines */}
                      <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      <line x1={paddingX} y1={(paddingY + height) / 2} x2={width - paddingX} y2={(paddingY + height) / 2} stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                      {/* Area charts */}
                      {rxAreaPoints && <polygon points={rxAreaPoints} fill="url(#rxGrad)" />}
                      {txAreaPoints && <polygon points={txAreaPoints} fill="url(#txGrad)" />}

                      {/* Line charts */}
                      {rxPoints && <polyline points={rxPoints} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                      {txPoints && <polyline points={txPoints} fill="none" stroke="#6366f1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Chart labels info */}
                      <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" fontSize="8" fill="#475569" fontFamily="monospace">{(maxVal / 1.15).toFixed(0)}M</text>
                      <text x={paddingX - 10} y={height - paddingY + 2} textAnchor="end" fontSize="8" fill="#475569" fontFamily="monospace">0M</text>

                      {logs.length > 0 && (
                        <text x={width - paddingX} y={height - paddingY + 12} textAnchor="end" fontSize="7" fill="#475569" fontFamily="monospace">Latest polling frame: {logs[logs.length-1].timestamp.split('T')[1]?.substring(0,8) || "N/A"}</text>
                      )}
                    </svg>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-3 font-mono leading-relaxed mb-0">
                    Continuous live graphing of virtual BGP connections synchronized securely with PostgreSQL sessions state engine.
                  </p>
                </Card>
              </Col>
            </Row>
          )}

          {/* VIEW 2: ACCOUNTING LEDGER */}
          {activeSubTab === "cashflow" && (
            <div className="space-y-6 animate-fade-in">
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card className="bg-emerald-950/20 border-emerald-900/30 rounded-xl" styles={{ body: { padding: '16px' } }}>
                    <Statistic 
                      title={<span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Subscriber Collections</span>}
                      value={totalIncome}
                      precision={0}
                      suffix="PKR"
                      styles={{ content: { color: '#10b981', fontWeight: 'bold' } }}
                    />
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card className="bg-rose-950/20 border-rose-900/30 rounded-xl" styles={{ body: { padding: '16px' } }}>
                    <Statistic 
                      title={<span className="text-[10px] text-rose-450 uppercase font-bold tracking-wider">Lineman & Overheads</span>}
                      value={totalExpense}
                      precision={0}
                      suffix="PKR"
                      styles={{ content: { color: '#f43f5e', fontWeight: 'bold' } }}
                    />
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card className="bg-indigo-950/20 border-indigo-900/30 rounded-xl" styles={{ body: { padding: '16px' } }}>
                    <Statistic 
                      title={<span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">Net Cash Flow Adjustments</span>}
                      value={netBalance}
                      precision={0}
                      suffix="PKR"
                      styles={{ content: { color: '#818cf8', fontWeight: 'bold' } }}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Inline Action Triggers */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="primary"
                  icon={<Plus className="w-4 h-4 mr-1" />}
                  onClick={() => { setShowFlowForm(!showFlowForm); setShowCatForm(false); }}
                  className="bg-indigo-600 hover:bg-indigo-505 border-none rounded-xl text-xs font-bold"
                >
                  Log Office Overheads
                </Button>

                <Button
                  type="default"
                  icon={<Plus className="w-4 h-4 mr-1" />}
                  onClick={() => { setShowCatForm(!showCatForm); setShowFlowForm(false); }}
                  className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold"
                >
                  Create Expense Category
                </Button>
              </div>

              {/* Category Form */}
              {showCatForm && (
                <Card className="bg-slate-950/50 border-slate-800 max-w-md rounded-xl" styles={{ body: { padding: '20px' } }}>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono block mb-4 border-b border-slate-800 pb-2">
                    Define New Overhead Category
                  </span>
                  
                  <Form
                    form={formCat}
                    layout="vertical"
                    onFinish={handleAddCategory}
                    requiredMark={false}
                    initialValues={{ type: 'expense' }}
                  >
                    <Form.Item name="name" label={<span className="text-[11px] text-slate-400">Category Title</span>} rules={[{ required: true, message: 'Specify title' }]}>
                      <Input placeholder="e.g. Lineman Splicing Machinery" className="bg-slate-900 border-slate-800 text-slate-100" />
                    </Form.Item>
                    <Form.Item name="description" label={<span className="text-[11px] text-slate-400">Category Purpose</span>}>
                      <Input placeholder="e.g. Lineman toolkits and emergency deployments" className="bg-slate-900 border-slate-800 text-slate-100" />
                    </Form.Item>
                    <Form.Item name="type" label={<span className="text-[11px] text-slate-400">Flow Direction</span>}>
                      <Select className="bg-slate-900 border-slate-800 text-slate-100 custom-select">
                        <Option value="expense">Expense (Office / Field Outward)</Option>
                        <Option value="income">Income (Corporate Entry / Inward)</Option>
                      </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" className="bg-indigo-600 border-none font-bold rounded-lg text-white">
                      Save Category
                    </Button>
                  </Form>
                </Card>
              )}

              {/* Financial Overhead Input Form */}
              {showFlowForm && (
                <Card className="bg-slate-950/50 border-slate-850 max-w-md rounded-xl" styles={{ body: { padding: '20px' } }}>
                  <span className="text-xs font-bold text-slate-305 text-slate-320 font-mono block mb-4 border-b border-slate-800 pb-2 uppercase text-slate-300">
                    Record Cash Ledger Overheads
                  </span>
                  
                  <Form
                    form={formFlow}
                    layout="vertical"
                    onFinish={handleAddCashflow}
                    requiredMark={false}
                    initialValues={{ type: 'expense' }}
                  >
                    <Row gutter={[12, 12]}>
                      <Col span={12}>
                        <Form.Item name="type" label={<span className="text-[11px] text-slate-400">Accounting Type</span>}>
                          <Select className="bg-slate-900 border-slate-800 text-slate-100 custom-select">
                            <Option value="expense">Expense (Debit/Out)</Option>
                            <Option value="income">Office Profit (Credit/In)</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        <Form.Item name="categoryId" label={<span className="text-[11px] text-slate-400">Target Category</span>} rules={[{ required: true, message: 'Selector target class' }]}>
                          <Select className="bg-slate-900 border-slate-800 text-slate-100 custom-select">
                            {categories.map((c) => (
                              <Option key={c.id} value={c.id}>{c.name} ({c.type})</Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item name="amount" label={<span className="text-[11px] text-slate-400">Amount (PKR)</span>} rules={[{ required: true, message: 'Amount required' }]}>
                          <InputNumber className="w-full bg-slate-900 border-slate-850 text-slate-100" placeholder="e.g. 5000" />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item name="description" label={<span className="text-[11px] text-slate-400">Description / Memo Notes</span>}>
                          <Input className="bg-slate-900 border-slate-800 text-slate-100" placeholder="e.g. Rent adjustment for sector NOC division" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Button type="primary" htmlType="submit" className="bg-indigo-600 border-none font-bold rounded-lg text-white mt-1">
                      Post Entry
                    </Button>
                  </Form>
                </Card>
              )}

              {/* List Table of transactions using Ant Design Table component */}
              <Card className="bg-slate-950/40 border-slate-800 rounded-xl" styles={{ body: { padding: '20px' } }}>
                <span className="text-xs font-bold uppercase text-slate-300 block mb-4 border-b border-slate-800 pb-2">
                  Posted Statements Ledger History
                </span>

                <Table
                  dataSource={cashflowList}
                  rowKey="id"
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: true }}
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'date',
                      key: 'date',
                      render: (date) => <Text className="font-mono text-zinc-400 text-xs">{new Date(date).toLocaleDateString()}</Text>
                    },
                    {
                      title: 'Overhead ID',
                      dataIndex: 'id',
                      key: 'id',
                      render: (id) => <Text className="font-mono text-indigo-400 text-xs font-semibold">{id}</Text>
                    },
                    {
                      title: 'Flow Type',
                      dataIndex: 'type',
                      key: 'type',
                      render: (type) => {
                        const isIncome = type === 'income';
                        return (
                          <Tag color={isIncome ? 'green' : 'volcano'} style={{ fontWeight: 'bold', textTransform: 'uppercase' }} className="font-mono">
                            {type}
                          </Tag>
                        );
                      }
                    },
                    {
                      title: 'Overhead Class',
                      dataIndex: 'categoryId',
                      key: 'categoryId',
                      render: (catId) => {
                        const matched = categories.find(c => c.id === catId);
                        return <Text className="font-mono text-slate-200 text-xs">{matched ? matched.name : catId}</Text>;
                      }
                    },
                    {
                      title: 'Amount',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (amount) => <Text className="font-mono text-slate-100 font-bold text-xs">{Number(amount).toLocaleString()} PKR</Text>
                    },
                    {
                      title: 'Auditor Memo',
                      dataIndex: 'description',
                      key: 'description',
                      render: (desc) => <Text className="font-mono text-slate-400 text-xs">{desc || "N/A"}</Text>
                    },
                    {
                      title: 'Operator',
                      dataIndex: 'addedBy',
                      key: 'addedBy',
                      render: (addedBy) => <Text className="font-mono text-zinc-400 text-xs">{addedBy}</Text>
                    }
                  ]}
                />
              </Card>
            </div>
          )}

          {/* VIEW 3: MULTI-USER AUDIT STREAM */}
          {activeSubTab === "activity" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-100 flex items-center space-x-1.5 uppercase text-xs">
                    <Terminal className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>NOC Security Audit Log Trail</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Continuous actions log tracing multi-level admin & reseller configuration modifications.</p>
                </div>

                {/* Filtering search bar */}
                <Input
                  placeholder="Filter log activity..."
                  prefix={<Info className="w-4 h-4 text-slate-550" />}
                  className="bg-slate-950 border-slate-800 text-slate-100 max-w-xs h-9 text-xs rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Audits terminal */}
              <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl max-h-[300px] overflow-y-auto space-y-2 text-[11px] leading-relaxed">
                {filteredActivities.length === 0 ? (
                  <div className="text-slate-500 text-center py-8 italic font-mono">No security log actions match the filters.</div>
                ) : (
                  filteredActivities.map((act) => (
                    <div key={act.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/60 hover:border-slate-800/80 font-mono">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-indigo-400 font-bold">[{act.adminId}]</span>
                        <span className="text-slate-200">{act.activity}</span>
                      </div>

                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 shrink-0">
                        <span>IP: <span className="text-zinc-400 font-bold">{act.stationIp}</span></span>
                        <span>•</span>
                        <span>{new Date(act.datetime).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: ACTIVE RADIUS SESSIONS LEASES */}
          {activeSubTab === "radius" && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="font-bold text-slate-100 flex items-center space-x-1.5 uppercase text-xs">
                  <Database className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Authorized Active Radius Tunnels (radacct)</span>
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">Real-time leased customer tunnel connections querying traffic octets directly from CCR nas units.</p>
              </div>

              <Card className="bg-slate-950/40 border-slate-800 rounded-xl" styles={{ body: { padding: '0px' } }}>
                <Table
                  dataSource={sessions}
                  rowKey="radacctId"
                  pagination={{ pageSize: 6 }}
                  scroll={{ x: true }}
                  columns={[
                    {
                      title: 'Subscriber',
                      dataIndex: 'username',
                      key: 'username',
                      render: (username) => (
                        <Space size="small">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                          <Text className="font-mono text-slate-100 font-bold text-xs">{username}</Text>
                        </Space>
                      )
                    },
                    {
                      title: 'Session Id',
                      dataIndex: 'acctSessionId',
                      key: 'acctSessionId',
                      render: (sid) => <Text className="font-mono text-slate-400 text-xs">{sid}</Text>
                    },
                    {
                      title: 'BGP NAS Router',
                      dataIndex: 'nasIpAddress',
                      key: 'nasIpAddress',
                      render: (ip) => <Text className="font-mono text-indigo-400 text-xs">{ip}</Text>
                    },
                    {
                      title: 'Assigned IP Pool',
                      dataIndex: 'framedIpAddress',
                      key: 'framedIpAddress',
                      render: (pool) => <Text className="font-mono text-slate-300 font-bold text-xs">{pool || "DHCP Pool"}</Text>
                    },
                    {
                      title: 'Duration',
                      dataIndex: 'acctSessionTime',
                      key: 'acctSessionTime',
                      render: (time) => <Text className="font-mono text-zinc-300 text-xs">{(time ? (time / 3600).toFixed(1) : "0.0")} hrs</Text>
                    },
                    {
                      title: 'Download (RX)',
                      dataIndex: 'acctInputOctets',
                      key: 'acctInputOctets',
                      render: (rx) => <Text className="font-mono text-emerald-450 font-semibold text-xs text-emerald-400">{(rx ? (rx / (1024 * 1024 * 1024)).toFixed(2) : "0.00")} GB</Text>
                    },
                    {
                      title: 'Upload (TX)',
                      dataIndex: 'acctOutputOctets',
                      key: 'acctOutputOctets',
                      render: (tx) => <Text className="font-mono text-orange-450 font-semibold text-xs text-orange-400">{(tx ? (tx / (1024 * 1024 * 1024)).toFixed(2) : "0.00")} GB</Text>
                    },
                    {
                      title: 'Caller MAC-Lock',
                      dataIndex: 'callingStationId',
                      key: 'callingStationId',
                      render: (mac) => <Tag color="blue" className="font-mono text-[9px] m-0">{mac || "B4:F2:FF:AE"}</Tag>
                    }
                  ]}
                />
              </Card>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
