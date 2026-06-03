import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Input, InputNumber, Select, Tag, message, Space, Popconfirm, Row, Col, Typography, Spin } from 'antd';
import { ShieldCheck, Plus, Trash2, Edit3, User, Mail, Phone, MapPin, DollarSign, Shield, ToggleLeft, ToggleRight, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { UserRole, AccountStatus, ResellerNode } from '../types';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';

// Custom Nexus Switch Toggle Component for Status in Reseller creation
const NexusSwitch = ({ checked, onChange }: { checked?: boolean; onChange?: (val: boolean) => void }) => {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={`relative w-[80px] h-[34px] rounded-md transition-all duration-200 cursor-pointer flex items-center select-none shadow-sm ${
        checked 
          ? 'bg-[#00b991] border border-[#009272] text-white hover:bg-[#00a37f]' 
          : 'bg-[#64748b]/30 border border-slate-700 text-slate-400 hover:bg-[#64748b]/40'
      }`}
    >
      <span className={`w-[60%] text-center text-[10px] uppercase font-black tracking-wider transition-all duration-200 ${checked ? 'mr-auto pl-2.5' : 'ml-auto pr-2.5'}`}>
        {checked ? 'Active' : 'Susp'}
      </span>
      <span className={`absolute top-[4px] bottom-[4px] w-[26px] bg-slate-900 rounded shadow-sm border border-slate-700 transition-all duration-200 ${
        checked ? 'right-[4px]' : 'left-[4px]'
      }`} />
    </button>
  );
};

// Form Switch Wrapper
const NexusFormSwitch = ({ name, label, required = true }: { name: string; label: string; required?: boolean }) => {
  return (
    <div className="bg-slate-950/45 p-4 border border-slate-800/80 rounded-xl space-y-3 shadow-inner">
      <div className="flex justify-between items-center text-left">
        <span className="text-xs uppercase font-extrabold text-slate-300 font-mono tracking-wider flex items-center gap-1">
          {label} {required && <span className="text-rose-500 font-sans">*</span>}
        </span>
        <Form.Item name={name} valuePropName="checked" noStyle>
          <NexusSwitch />
        </Form.Item>
      </div>
    </div>
  );
};

interface FranchiseManagerProps {
  currentLevelId: string;
  currentRole: string;
  onViewProfile?: (resellerId: string) => void;
}

export default function FranchiseManager({ currentLevelId, currentRole, onViewProfile }: FranchiseManagerProps) {
  const [franchises, setFranchises] = useState<ResellerNode[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNode, setEditingNode] = useState<ResellerNode | null>(null);
  const [form] = Form.useForm();
  const selectedPackagesIds = Form.useWatch('allowedPackages', form) || [];

  // Synchronize data from backend
  const fetchFranchises = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resellers');
      if (!res.ok) throw new Error('Failed to fetch reseller directory');
      const data: ResellerNode[] = await res.json();
      // Filter only franchise tier accounts
      const filtered = data.filter(node => node.role === UserRole.FRANCHISE);
      setFranchises(filtered);

      const pkgRes = await fetch('/api/packages');
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(pkgData);
      }
    } catch (err: any) {
      message.error(err.message || 'Error occurred during reload.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFranchises();
  }, []);

  const handleSave = async (values: any) => {
    const packageRatesCleaned: Record<string, number> = {};
    const customerRatesCleaned: Record<string, number> = {};
    const allowed = values.allowedPackages || [];
    const rates = values.packageRates || {};
    const cRates = values.customerPackageRates || {};

    allowed.forEach((pkgId: string) => {
      if (rates[pkgId] !== undefined) {
        packageRatesCleaned[pkgId] = Number(rates[pkgId]);
      } else {
        const pkg = packages.find(p => p.id === pkgId);
        packageRatesCleaned[pkgId] = pkg ? (pkg.priceMonthly || pkg.price || 0) : 0;
      }

      if (cRates[pkgId] !== undefined) {
        customerRatesCleaned[pkgId] = Number(cRates[pkgId]);
      } else {
        const pkg = packages.find(p => p.id === pkgId);
        const basePrice = pkg ? (pkg.priceMonthly || pkg.price || 0) : 0;
        customerRatesCleaned[pkgId] = basePrice + 500; // default margin
      }
    });

    const payload = {
      ...values,
      role: UserRole.FRANCHISE,
      phoneNumber: values.phoneNumber || "+92 300 0000000",
      location: values.location || "Custom Zone",
      status: values.statusEnabled ? ("active" as AccountStatus) : ("suspended" as AccountStatus),
      balance: values.balance !== undefined ? Number(values.balance) : 0,
      allowedPackages: allowed,
      packageRates: packageRatesCleaned,
      customerPackageRates: customerRatesCleaned
    };

    try {
      const url = editingNode ? `/api/resellers/${editingNode.id}` : '/api/resellers';
      const method = editingNode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Unresolved backend submission error');
      message.success(`Franchise "${values.name}" successfully ${editingNode ? 'updated' : 'registered'}.`);
      resetForm();
      fetchFranchises();
    } catch (err: any) {
      message.error(err.message || 'Error saving franchise details.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/resellers/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete selected node');
      message.success(`Franchise "${name}" removed from server directory.`);
      fetchFranchises();
    } catch (err: any) {
      message.error(err.message || 'Error deleting reseller node.');
    }
  };

  const startEdit = (node: ResellerNode) => {
    setEditingNode(node);
    form.setFieldsValue({
      name: node.name,
      ownerName: node.ownerName,
      email: node.email,
      phoneNumber: node.phoneNumber,
      location: node.location,
      balance: node.balance,
      statusEnabled: node.status === "active",
      allowedPackages: node.allowedPackages || [],
      packageRates: node.packageRates || {},
      customerPackageRates: node.customerPackageRates || {},
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingNode(null);
    setShowAddForm(false);
    form.resetFields();
    form.setFieldsValue({
      statusEnabled: true,
      balance: 0,
      phoneNumber: '',
      location: '',
      name: '',
      ownerName: '',
      email: '',
      allowedPackages: [],
      packageRates: {},
      customerPackageRates: {},
    });
  };

  const isAdmin = currentRole === UserRole.ADMIN;

  const columns = [
    {
      title: 'Business / Franchise',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ResellerNode) => (
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-2 rounded-lg text-indigo-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-sm">{text}</div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
              <span>Owner:</span>
              <span className="text-slate-300 font-sans font-medium">{record.ownerName}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Contact Details',
      dataIndex: 'email',
      key: 'contact',
      render: (email: string, record: ResellerNode) => (
        <div className="space-y-0.5 text-xs">
          <div className="text-slate-250 flex items-center gap-1.5 font-sans">
            <Mail className="w-3.5 h-3.5 text-slate-500" />
            <span>{email}</span>
          </div>
          <div className="text-slate-450 font-mono flex items-center gap-1.5 text-[11px]">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span>{record.phoneNumber || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'NOC Region',
      dataIndex: 'location',
      key: 'location',
      render: (loc: string) => (
        <span className="text-xs text-slate-300 flex items-center gap-1 font-sans">
          <MapPin className="w-3.5 h-3.5 text-[#00b991]" />
          <span>{loc}</span>
        </span>
      ),
    },
    {
      title: 'Wallet Balance',
      dataIndex: 'balance',
      key: 'balance',
      render: (val: number) => (
        <span className="font-mono font-bold text-indigo-400 text-xs">
          {val.toLocaleString()} PKR
        </span>
      ),
    },
    {
      title: 'Subscribers',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (val: number) => (
        <div className="text-xs">
          <span className="font-mono text-slate-300 font-bold">{val}</span>
          <span className="text-slate-500 text-[10px] ml-1 font-mono">assigned</span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const isActive = status === 'active';
        return (
          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider font-mono px-2.5 py-1 rounded border ${
            isActive 
              ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-950/20 border-rose-500/20 text-rose-450 text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {status}
          </span>
        );
      },
    },
    {
      title: 'Activity',
      key: 'action',
      render: (_: any, record: ResellerNode) => {
        return (
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onViewProfile && onViewProfile(record.id)}
              className="p-1 px-2.5 rounded bg-emerald-950/20 hover:bg-[#00b991]/20 hover:text-[#00b991] text-emerald-400 border border-emerald-500/20 text-[11px] font-mono tracking-tight font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Open Reseller Profile"
            >
              <User className="w-3.5 h-3.5" />
              <span>PROFILE</span>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
        <div>
          <h1 className="text-xl font-bold font-display text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span>Franchises Control Terminal</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Manage primary tier regional franchises, initial margins allocation & overall subscribers network.</p>
        </div>
        {isAdmin && !showAddForm && (
          <Button 
            className="bg-indigo-600 hover:bg-indigo-500 border-none text-white font-semibold shadow-md flex items-center gap-1.5 h-10 px-5 cursor-pointer rounded-lg"
            type="primary" 
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
          >
            <PlusOutlined /> Register Franchise
          </Button>
        )}
      </div>

      {/* Creation/Editing Form styled to look exactly like Nexus isp CRM */}
      {showAddForm && isAdmin && (
        <Card 
          className="border border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden"
          title={
            <div className="flex items-center gap-2 text-slate-100 font-mono text-xs tracking-wide">
              <ShieldCheck className="w-4 h-4 text-[#00b991]" />
              <span>{editingNode ? `EDITING FRANCHISE: ${editingNode.name.toUpperCase()}` : 'REGISTER NEW FRANCHISE'}</span>
            </div>
          }
          extra={
            <Button onClick={resetForm} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 rounded cursor-pointer text-xs">
              Cancel
            </Button>
          }
        >
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSave}
            initialValues={{
              statusEnabled: true,
              balance: 0
            }}
          >
            <Row gutter={[20, 20]} className="text-left">
              {/* Franchise Name */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="name" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">FRANCHISE/BUSINESS NAME <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Business name is required' }]}
                >
                  <Input prefix={<Shield className="w-4 h-4 text-slate-500" />} placeholder="Ex: Alpha Broadbands" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg h-10" />
                </Form.Item>
              </Col>

              {/* Owner Name */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="ownerName" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">OWNER FULL NAME <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Owner name is required' }]}
                >
                  <Input prefix={<User className="w-4 h-4 text-slate-500" />} placeholder="Ex: Syed Malik" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg h-10" />
                </Form.Item>
              </Col>

              {/* Contact Email */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="email" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">EMAIL ADDRESS (LOGIN ID) <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, type: 'email', message: 'Valid email required' }]}
                >
                  <Input prefix={<Mail className="w-4 h-4 text-slate-500" />} placeholder="Ex: malik@example.com" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg h-10" />
                </Form.Item>
              </Col>

              {/* Phone Number */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="phoneNumber" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">PHONE NUMBER <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Phone number is required' }]}
                >
                  <Input prefix={<Phone className="w-4 h-4 text-slate-500" />} placeholder="Ex: +92 300 1234567" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg h-10" />
                </Form.Item>
              </Col>

              {/* Region Location */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="location" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">COVERAGE LOCATION / NOC <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Coverage area is required' }]}
                >
                  <Input prefix={<MapPin className="w-4 h-4 text-slate-500" />} placeholder="Ex: Lahore South NOC" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg h-10" />
                </Form.Item>
              </Col>

              {/* Starting Credit Balance */}
              <Col xs={24} md={6}>
                <Form.Item 
                  name="balance" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">STARTING WALLET CREDIT</span>}
                >
                  <InputNumber prefix={<DollarSign className="w-4 h-4 text-indigo-400" />} className="w-full bg-slate-950 border-slate-800 text-slate-100 h-10 flex items-center rounded-lg" min={0} />
                </Form.Item>
              </Col>

              {/* Account Status Switch */}
              <Col xs={24} md={6}>
                <NexusFormSwitch name="statusEnabled" label="Account State" />
              </Col>

              {/* Allot Broadband Packages */}
              <Col xs={24} md={24}>
                <Form.Item 
                  name="allowedPackages" 
                  label={<span className="text-[12px] font-bold text-slate-300 font-mono">ALLOT AUTHORIZED BROADBAND PACKAGES</span>}
                >
                  <Select 
                    mode="multiple" 
                    placeholder="Click to select broadband package profiles to allot to this franchise..."
                    className="w-full bg-slate-950 border-slate-800 text-slate-100"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    style={{ minHeight: '40px' }}
                  >
                    {packages.map(p => (
                      <Select.Option key={p.id} value={p.id}>
                        {p.name} ({p.speedMbps || p.bandwidth || 0} Mbps - {p.priceMonthly || p.price || 0} PKR)
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {/* Dynamic custom rates for selected allowedPackages */}
              {selectedPackagesIds.length > 0 && (
                <Col xs={24} md={24}>
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 text-left mb-4">
                    <span className="block text-[11px] font-black font-mono text-emerald-400 uppercase tracking-widest mb-4">
                      Configure Reseller Custom Purchase prices and General Customer Retail rates
                    </span>
                    <div className="space-y-4">
                      {selectedPackagesIds.map((pkgId: string) => {
                        const pkg = packages.find(p => p.id === pkgId);
                        if (!pkg) return null;
                        const defaultP = pkg.priceMonthly || pkg.price || 0;
                        return (
                          <div key={pkgId} className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/80">
                            <span className="block text-xs font-bold text-slate-100 mb-3 font-mono">
                              📦 {pkg.name} ({pkg.speedMbps || pkg.bandwidth || 0} Mbps - Base Cost: {defaultP} PKR)
                            </span>
                            <Row gutter={16}>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={['packageRates', pkgId]}
                                  label={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reseller Wholesale Cost (Buy Rate from Parent)</span>}
                                  initialValue={defaultP}
                                  rules={[{ required: true, message: 'Wholesale price rate is required' }]}
                                >
                                  <InputNumber
                                    className="w-full bg-slate-950 border-slate-800 text-slate-100 rounded-lg h-10 flex items-center pr-2"
                                    min={0}
                                    placeholder={`${defaultP}`}
                                  />
                                </Form.Item>
                              </Col>
                              <Col xs={24} sm={12}>
                                <Form.Item
                                  name={['customerPackageRates', pkgId]}
                                  label={<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">General Customer Retail Price (Paid by Customers)</span>}
                                  initialValue={defaultP + 500}
                                  rules={[{ required: true, message: 'General customer price is required' }]}
                                >
                                  <InputNumber
                                    className="w-full bg-slate-950 border-slate-800 text-slate-100 rounded-lg h-10 flex items-center pr-2"
                                    min={0}
                                    placeholder={`${defaultP + 500}`}
                                  />
                                </Form.Item>
                              </Col>
                            </Row>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Col>
              )}
            </Row>

            {/* Helper Info banner */}
            <div className="my-4 bg-indigo-950/40 border border-indigo-700/35 p-4 rounded-xl flex items-start gap-2.5 text-left">
              <InfoCircleOutlined className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-indigo-300/90 font-medium leading-relaxed">
                A primary tier Regional Franchise operates directly under the Super-Admin, receiving direct wallet allocations. They can create secondary reseller networks (Dealers/Sub-dealers) to extend operations.
              </p>
            </div>

            {/* Submission triggers */}
            <div className="mt-6 border-t border-slate-800 pt-5">
              <Button 
                type="primary" 
                htmlType="submit" 
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-slate-100 font-extrabold flex items-center justify-center gap-1.5 h-10 cursor-pointer rounded-xl text-xs uppercase tracking-widest transition-all shadow-md"
              >
                Submit Node Specification
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* Franchise Database Records Table */}
      <div className="bg-slate-950/25 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <Spin spinning={loading}>
          <Table 
            columns={columns} 
            dataSource={franchises} 
            rowKey="id" 
            pagination={{ pageSize: 6 }} 
            className="custom-table dark-table"
          />
        </Spin>
      </div>
    </div>
  );
}
