import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { 
  ClipboardList, 
  Search, 
  SlidersHorizontal, 
  Download, 
  RefreshCw, 
  Play, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  FileText,
  Database,
  Terminal,
  Shield,
  Briefcase
} from 'lucide-react';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  Table, 
  Tag, 
  Space, 
  Row, 
  Col, 
  Typography, 
  Tooltip, 
  Modal, 
  message, 
  Badge,
  Spin,
  Divider
} from 'antd';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface SystemAuditLog {
  id: string;
  datetime: string;
  category: 'auth' | 'config' | 'system';
  severity: 'info' | 'warning' | 'error';
  operator: string;
  activity: string;
  stationIp: string;
  details?: string;
}

interface SystemLogsManagerProps {
  currentRole: UserRole;
  currentLevelId: string;
}

export default function SystemLogsManager({ currentRole, currentLevelId }: SystemLogsManagerProps) {
  const [logs, setLogs] = useState<SystemAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<SystemAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  
  const [simulateForm] = Form.useForm();

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/system-logs');
      if (!res.ok) throw new Error('Failed to synchronize server audit track.');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Error occurred while loading system logs.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.activity || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.operator || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.stationIp || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  // Handle Simulation submit
  const handleSimulateSubmit = async (values: any) => {
    try {
      const res = await fetch('/api/system-logs/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category: values.category,
          severity: values.severity,
          activity: values.activity,
          operator: values.operator || 'operator-sim',
          details: values.details || `Manual console sim event trace logged. Date: ${new Date().toISOString()}`
        })
      });

      if (res.ok) {
        message.success('Simulated system log event dispatched successfully!');
        setIsSimulateModalOpen(false);
        simulateForm.resetFields();
        fetchLogs(true); // silent refresh
      } else {
        throw new Error('Server simulation pipeline reported errors.');
      }
    } catch (err: any) {
      message.error(err.message || 'Simulation execution failed.');
    }
  };

  // Export as CSV
  const handleExportCSV = () => {
    try {
      const headers = ['Log ID', 'Timestamp', 'Category', 'Severity', 'Operator', 'Activity Message', 'Station IP', 'Extended details'];
      const csvRows = [headers.join(',')];

      for (const row of filteredLogs) {
        const values = [
          `"${row.id}"`,
          `"${new Date(row.datetime).toISOString()}"`,
          `"${row.category.toUpperCase()}"`,
          `"${row.severity.toUpperCase()}"`,
          `"${row.operator}"`,
          `"${(row.activity || '').replace(/"/g, '""')}"`,
          `"${row.stationIp}"`,
          `"${(row.details || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
        ];
        csvRows.push(values.join(','));
      }

      const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `nexus_system_audit_logs_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success(`Successfully exported ${filteredLogs.length} logs to CSV.`);
    } catch (e) {
      message.error('CSV data conversion failed.');
    }
  };

  // Export as JSON
  const handleExportJSON = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(filteredLogs, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonString);
      downloadAnchor.setAttribute("download", `nexus_system_audit_logs_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      message.success(`Successfully exported ${filteredLogs.length} logs to JSON.`);
    } catch (e) {
      message.error('JSON serialization failed.');
    }
  };

  // Helper renderers
  const getSeverityTag = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'error':
        return (
          <Tag color="volcano" className="font-mono text-[10px] font-bold uppercase select-none border-red-900/50 flex items-center gap-1 w-max">
            <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
            <span>CRITICAL ERROR</span>
          </Tag>
        );
      case 'warning':
        return (
          <Tag color="gold" className="font-mono text-[10px] font-bold uppercase select-none border-yellow-800/50 flex items-center gap-1 w-max">
            <AlertTriangle className="w-3 h-3 text-yellow-400 shrink-0" />
            <span>SYSTEM WARNING</span>
          </Tag>
        );
      default:
        return (
          <Tag color="blue" className="font-mono text-[10px] font-bold uppercase select-none border-indigo-900/50 flex items-center gap-1 w-max">
            <Info className="w-3 h-3 text-indigo-400 shrink-0" />
            <span>INFO STATEMENT</span>
          </Tag>
        );
    }
  };

  const getCategoryBadge = (category: 'auth' | 'config' | 'system') => {
    switch (category) {
      case 'auth':
        return (
          <Tag color="purple" className="font-mono text-[10px] font-bold uppercase py-0.5 px-2 rounded-md">
            Security / Auth
          </Tag>
        );
      case 'system':
        return (
          <Tag color="magenta" className="font-mono text-[10px] font-bold uppercase py-0.5 px-2 rounded-md">
            System / Daemon
          </Tag>
        );
      default:
        return (
          <Tag color="cyan" className="font-mono text-[10px] font-bold uppercase py-0.5 px-2 rounded-md">
            Config Modification
          </Tag>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper overview header */}
      <Card 
        className="bg-slate-900/60 border border-slate-800 rounded-2xl relative overflow-hidden backdrop-blur"
        styles={{ body: { padding: '24px' } }}
      >
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-600/10 p-3 rounded-2xl border border-indigo-600/20 text-indigo-400">
              <ClipboardList className="w-7 h-7" />
            </div>
            <div>
              <Title level={4} className="m-0 text-slate-150 font-extrabold uppercase tracking-tight" style={{ margin: 0, color: '#f1f5f9', fontSize: '18px' }}>
                Core System Auditing & Security Logs
              </Title>
              <Text className="text-xs text-slate-400 block mt-1">
                Real-time tracking of administrative configuration changes, subscriber logins, security policy alterations, and raw daemon error logs.
              </Text>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              type="default"
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              variant="outlined"
              onClick={() => fetchLogs()}
              color="default"
              className="bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
            >
              Refresh
            </Button>

            <Button
              type="primary"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => setIsSimulateModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 border-none font-bold"
            >
              Simulate Network Event
            </Button>
          </div>
        </div>
      </Card>

      {/* Metrics Bar */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Logs Cached</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-mono font-bold text-slate-100">{logs.length}</span>
              <Database className="w-5 h-5 text-indigo-500/50 mb-1" />
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Critical Errors</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-mono font-bold text-red-400">
                {logs.filter(l => l.severity === 'error').length}
              </span>
              <AlertCircle className="w-5 h-5 text-red-500/50 mb-1" />
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-wider">Configuration alterations</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-mono font-bold text-yellow-450 text-yellow-450" style={{ color: '#fbbf24' }}>
                {logs.filter(l => l.category === 'config').length}
              </span>
              <SlidersHorizontal className="w-5 h-5 text-yellow-500/50 mb-1" />
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-col justify-between h-24 relative overflow-hidden">
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Sign-in auditing</span>
            <div className="flex justify-between items-end mt-2">
              <span className="text-2xl font-mono font-bold text-purple-450" style={{ color: '#c084fc' }}>
                {logs.filter(l => l.category === 'auth').length}
              </span>
              <Shield className="w-5 h-5 text-purple-500/50 mb-1" />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Primary Table & Filter Controls Container */}
      <Card className="bg-slate-900/60 border border-slate-800 rounded-2xl" styles={{ body: { padding: '20px' } }}>
        <div className="space-y-4">
          
          {/* Filters shelf */}
          <div className="bg-slate-950/80 p-4 border border-slate-800/80 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Search text input */}
              <Input
                placeholder="Search by action, performer or IP..."
                prefix={<Search className="w-4 h-4 text-slate-500 shrink-0" />}
                className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm h-10 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
              />

              {/* Category selector */}
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                className="bg-slate-900 border-slate-800 text-slate-100 h-10 w-44 rounded-xl custom-select-logs"
                style={{ height: '40px' }}
                dropdownClassName="bg-slate-900 text-slate-100 border border-slate-800"
              >
                <Option value="all">All Specialties</Option>
                <Option value="auth">Security / Auth (Login)</Option>
                <Option value="config">Configurations</Option>
                <Option value="system">System errors / Daemons</Option>
              </Select>

              {/* Severity Selector */}
              <Select
                value={severityFilter}
                onChange={setSeverityFilter}
                className="bg-slate-900 border-slate-800 text-slate-100 h-10 w-36 rounded-xl custom-select-logs"
                style={{ height: '40px' }}
              >
                <Option value="all">All Intensities</Option>
                <Option value="info">Info statements</Option>
                <Option value="warning">System warnings</Option>
                <Option value="error">Critical Errors</Option>
              </Select>
            </div>

            {/* Export buttons block */}
            <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
              <Button
                type="default"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={handleExportCSV}
                className="bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center text-xs h-9"
              >
                Export CSV
              </Button>

              <Button
                type="default"
                icon={<FileText className="w-3.5 h-3.5" />}
                onClick={handleExportJSON}
                className="bg-slate-900 border-slate-850 text-slate-300 hover:text-white hover:bg-slate-800 flex items-center text-xs h-9"
              >
                Export JSON
              </Button>
            </div>
          </div>

          {/* Core Table */}
          <Spin spinning={loading} tip="Retreiving terminal logs database...">
            <Table
              dataSource={filteredLogs}
              rowKey="id"
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                className: "custom-pagination text-slate-400 font-mono text-xs"
              }}
              scroll={{ x: true }}
              columns={[
                {
                  title: 'Timestamp',
                  dataIndex: 'datetime',
                  key: 'datetime',
                  width: 180,
                  render: (date) => (
                    <Text className="font-mono text-xs text-sky-400/90 font-medium">
                      {new Date(date).toLocaleString()}
                    </Text>
                  )
                },
                {
                  title: 'Severity Severity',
                  dataIndex: 'severity',
                  key: 'severity',
                  width: 140,
                  render: (sev) => getSeverityTag(sev)
                },
                {
                  title: 'Core Category',
                  dataIndex: 'category',
                  key: 'category',
                  width: 160,
                  render: (cat) => getCategoryBadge(cat)
                },
                {
                  title: 'Audit Incident Trace',
                  dataIndex: 'activity',
                  key: 'activity',
                  render: (text) => (
                    <Text className="text-slate-100 font-mono text-xs block truncate max-w-sm md:max-w-md xl:max-w-lg select-all">
                      {text}
                    </Text>
                  )
                },
                {
                  title: 'Authorized Operator',
                  dataIndex: 'operator',
                  key: 'operator',
                  width: 140,
                  render: (op) => (
                    <Tag color="stone" className="font-mono text-[10px] text-zinc-300 bg-slate-950 border-slate-800 uppercase py-0.5 px-2 font-bold m-0">
                      {op}
                    </Tag>
                  )
                },
                {
                  title: 'Terminal IP Address',
                  dataIndex: 'stationIp',
                  key: 'stationIp',
                  width: 120,
                  render: (ip) => (
                    <Text className="font-mono text-xs text-slate-400 tracking-wide font-semibold">
                      {ip}
                    </Text>
                  )
                },
                {
                  title: 'Auditable Action',
                  key: 'action',
                  width: 100,
                  fixed: 'right',
                  render: (_, record) => (
                    <Button
                      type="link"
                      onClick={() => {
                        setSelectedLog(record);
                        setIsDetailModalOpen(true);
                      }}
                      className="font-mono text-xs text-indigo-400 hover:text-indigo-300 font-bold p-0"
                    >
                      Inspect trace
                    </Button>
                  )
                }
              ]}
            />
          </Spin>
        </div>
      </Card>

      {/* MODAL 1: INSPECT DETAIL GRAPH */}
      <Modal
        title={
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-2 font-sans text-slate-100">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <span className="font-bold uppercase tracking-tight text-sm">NOC Trace Terminal Inspection</span>
          </div>
        }
        visible={isDetailModalOpen}
        onCancel={() => {
          setIsDetailModalOpen(false);
          setSelectedLog(null);
        }}
        footer={[
          <Button 
            key="close" 
            variant="outlined"
            onClick={() => {
              setIsDetailModalOpen(false);
              setSelectedLog(null);
            }} 
            className="bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
          >
            Terminal Close
          </Button>
        ]}
        width={640}
        centered
        className="custom-audit-modal"
      >
        {selectedLog && (
          <div className="space-y-4 pt-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-950/80 p-4 border border-slate-850 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block bold uppercase">System ID Reference</span>
                <span className="text-zinc-300 font-bold">{selectedLog.id}</span>
              </div>
              
              <div>
                <span className="text-[10px] text-slate-400 block bold uppercase">Terminal IP station</span>
                <span className="text-zinc-300 font-bold">{selectedLog.stationIp}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block bold uppercase">Incident timestamp</span>
                <span className="text-sky-400 font-bold">{new Date(selectedLog.datetime).toLocaleString()}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block bold uppercase">Authorized Operator</span>
                <span className="text-emerald-400 font-bold">{selectedLog.operator}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 block bold uppercase">Primary Log Statement</span>
              <div className="bg-slate-950 p-3 border border-slate-800 text-slate-200 rounded-xl leading-relaxed">
                {selectedLog.activity}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 block bold uppercase">Incident Metadata Detail / Stack Trace</span>
              <div className="bg-slate-950 p-4 border border-zinc-900 rounded-xl text-indigo-300 overflow-x-auto overflow-y-auto max-h-[180px] custom-scrollbar">
                <pre className="m-0 text-[11px] whitespace-pre-wrap font-mono">
                  {selectedLog.details || "No additional server traces or payloads were recorded for this transaction."}
                </pre>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="text-[10px] text-slate-500">Security Signature:</span>
              <span className="text-[10px] text-indigo-400/80 font-black">SHA-256 SECURED VERIFICATION INTEGRITY ACTIVE</span>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: EVENT SIMULATION PLUGINS */}
      <Modal
        title={
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-2 font-sans text-slate-100">
            <AlertCircle className="w-5 h-5 text-indigo-400" />
            <span className="font-bold uppercase tracking-tight text-sm">Simulate Live Network Event</span>
          </div>
        }
        visible={isSimulateModalOpen}
        onCancel={() => {
          setIsSimulateModalOpen(false);
          simulateForm.resetFields();
        }}
        footer={null}
        width={500}
        centered
      >
        <Form
          form={simulateForm}
          layout="vertical"
          onFinish={handleSimulateSubmit}
          requiredMark={false}
          className="pt-3 font-sans"
        >
          <Form.Item
            name="category"
            label={<span className="text-[11px] text-slate-350 bold uppercase tracking-wider text-slate-400">Log specialty domain</span>}
            rules={[{ required: true, message: 'Selector domain specialty' }]}
            initialValue="system"
          >
            <Select className="bg-slate-900 border-slate-800 text-slate-100 custom-select">
              <Option value="system">System daemon limits / network flaps</Option>
              <Option value="config">Subscribers configurations / pricing modifications</Option>
              <Option value="auth">Sign-in triggers / unauthorized session blocks</Option>
            </Select>
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="severity"
                label={<span className="text-[11px] text-slate-350 bold uppercase tracking-wider text-slate-400">Incident Intensity</span>}
                rules={[{ required: true, message: 'Intensity level required' }]}
                initialValue="info"
              >
                <Select className="bg-slate-900 border-slate-800 text-slate-100 custom-select">
                  <Option value="info">INFO STATEMENT</Option>
                  <Option value="warning">SYSTEM WARNING</Option>
                  <Option value="error">CRITICAL ERROR</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="operator"
                label={<span className="text-[11px] text-slate-350 bold uppercase tracking-wider text-slate-400">Authorized entity tag</span>}
                initialValue="ops-center"
              >
                <Input placeholder="e.g. radius-dialer" className="bg-slate-900 border-slate-800 text-slate-100" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="activity"
            label={<span className="text-[11px] text-slate-350 bold uppercase tracking-wider text-slate-400">Activity Incident Statement</span>}
            rules={[{ required: true, message: 'Incident message required' }]}
          >
            <Input.TextArea 
              rows={2} 
              placeholder="e.g. PPPoE dialer tunnel failed for sector-12 due to LCP echo request failure." 
              className="bg-slate-900 border-slate-800 text-slate-100 font-mono text-xs" 
            />
          </Form.Item>

          <Form.Item
            name="details"
            label={<span className="text-[11px] text-slate-350 bold uppercase tracking-wider text-slate-400">Additional payload details / Stack traces</span>}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="e.g. Error code: ERR_TUNNEL_LCP_SHUTD - Socket reports connection reset by peer." 
              className="bg-slate-900 border-slate-800 text-slate-100 font-mono text-xs" 
            />
          </Form.Item>

          <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-900 mt-4">
            <Button
              type="default"
              onClick={() => {
                setIsSimulateModalOpen(false);
                simulateForm.resetFields();
              }}
              className="bg-slate-950 border-slate-800 text-slate-300 hover:text-white"
            >
              Cancel
            </Button>

            <Button
              type="primary"
              htmlType="submit"
              className="bg-indigo-600 hover:bg-indigo-505 border-none font-bold font-mono"
            >
              DISPATCH SIM EVENT
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
