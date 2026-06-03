import React, { useState, useEffect } from 'react';
import { BandwidthPackage, UserRole } from '../types';
import { Wifi, AlertCircle, Sparkles, Settings2, Trash2, Edit3 } from 'lucide-react';
import { Form, Input, InputNumber, Select, Radio, Button, Card, Popconfirm, message, Row, Col, Typography, Spin, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TagsOutlined, InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

interface PackageManagerProps {
  currentRole: UserRole;
  currentLevelId: string;
}

// Custom Nexus Switch Toggle Component
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
        {checked ? 'On' : 'Off'}
      </span>
      <span className={`absolute top-[4px] bottom-[4px] w-[26px] bg-slate-900 rounded shadow-sm border border-slate-700 transition-all duration-200 ${
        checked ? 'right-[4px]' : 'left-[4px]'
      }`} />
    </button>
  );
};

// Standard Switch wrapper with label and sub-elements
const NexusFormSwitch = ({ name, label, required = true, subInput }: { name: string; label: string; required?: boolean; subInput?: React.ReactNode }) => {
  const isChecked = Form.useWatch(name);
  return (
    <div className="bg-slate-950/45 p-4 border border-slate-800/80 rounded-xl space-y-3 shadow-inner transition-all duration-300">
      <div className="flex justify-between items-center">
        <span className="text-xs uppercase font-extrabold text-slate-300 font-mono tracking-wider flex items-center gap-1">
          {label} {required && <span className="text-rose-500 font-sans">*</span>}
        </span>
        <Form.Item name={name} valuePropName="checked" noStyle>
          <NexusSwitch />
        </Form.Item>
      </div>
      {subInput && isChecked && (
        <div className="pt-2 border-t border-slate-900/60 transition-all duration-200">
          {subInput}
        </div>
      )}
    </div>
  );
};

export default function PackageManager({ currentRole, currentLevelId }: PackageManagerProps) {
  const [packages, setPackages] = useState<BandwidthPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPkg, setEditingPkg] = useState<BandwidthPackage | null>(null);
  const [form] = Form.useForm();

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/packages');
      if (!res.ok) throw new Error('Failed to synchronize plan catalog');
      const data = await res.json();
      setPackages(data);
    } catch (err: any) {
      console.error(err);
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleSave = async (values: any) => {
    const payload = {
      ...values,
      speedMbps: values.bandwidth || 10,
      priceMonthly: values.price || 0,
    };

    try {
      const url = editingPkg ? `/api/packages/${editingPkg.id}` : '/api/packages';
      const method = editingPkg ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save bandwidth profile');
      message.success(`Package "${values.name}" successfully ${editingPkg ? 'updated' : 'created'}.`);
      resetForm();
      fetchPackages();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const handleDeletePackage = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/packages/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Failed to withdraw plan profile');
      message.success(`Plan Profile "${name}" successfully deleted.`);
      fetchPackages();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const startEdit = (pkg: BandwidthPackage) => {
    setEditingPkg(pkg);
    form.setFieldsValue({
      ...pkg,
      price: pkg.price ?? pkg.priceMonthly ?? 0,
      profit: pkg.profit ?? 0,
      bandwidth: pkg.bandwidth ?? pkg.speedMbps ?? 10,
      policy: pkg.policy ?? "5M (*)",
      billingType: pkg.billingType || 'prepaid',
      extraFeeType: pkg.extraFeeType || 'percentage',
      extraFeeValue: pkg.extraFeeValue ?? 0,
      vatType: pkg.vatType || 'percentage',
      vatValue: pkg.vatValue ?? 0,
      durationType: pkg.durationType || 'months',
      duration: pkg.duration || 1,
      autoRenew: pkg.autoRenew ?? false,
      autoPayment: pkg.autoPayment ?? true,
      pool: pkg.pool ?? "5MB",
      expirePool: pkg.expirePool ?? "Expired",
      fixedExpiryDayEnabled: pkg.fixedExpiryDayEnabled ?? false,
      fixedExpiryDay: pkg.fixedExpiryDay ?? 0,
      fixedExpiryAccounting: pkg.fixedExpiryAccounting ?? 'off',
      fixedExpiryTimeEnabled: pkg.fixedExpiryTimeEnabled ?? false,
      fixedExpiryTime: pkg.fixedExpiryTime ?? "12:00:00",
      addRemainingDays: pkg.addRemainingDays ?? true,
      bandwidthUnit: pkg.bandwidthUnit ?? "MB",
      bandwidthAllocationByTime: pkg.bandwidthAllocationByTime ?? true,
      addRemainingVolumes: pkg.addRemainingVolumes ?? false,
      dataQuotaEnabled: pkg.dataQuotaEnabled ?? true,
      dataQuotaVolume: pkg.dataQuotaVolume ?? 1024,
      dataQuotaExceedAction: pkg.dataQuotaExceedAction ?? "fup_limit",
      fupQuotaEnabled: pkg.fupQuotaEnabled ?? true,
      fupQuotaVolume: pkg.fupQuotaVolume ?? 1024,
      fupQuotaLimit: pkg.fupQuotaLimit ?? "1M/1M",
      addRemainingSession: pkg.addRemainingSession ?? false,
      sessionQuotaEnabled: pkg.sessionQuotaEnabled ?? false,
      sessionQuotaTime: pkg.sessionQuotaTime ?? 0,
      sessionQuotaExceedAction: pkg.sessionQuotaExceedAction ?? "disconnect",
      sessionFupLimitEnabled: pkg.sessionFupLimitEnabled ?? false,
      sessionFupLimit: pkg.sessionFupLimit ?? "1M/1M",
      allowSelfActivation: pkg.allowSelfActivation ?? false,
      applyToUsers: pkg.applyToUsers ?? true,
      applySettingsResellers: pkg.applySettingsResellers ?? true,
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setEditingPkg(null);
    setShowAddForm(false);
    form.resetFields();
    form.setFieldsValue({
      billingType: 'prepaid',
      extraFeeType: 'percentage',
      vatType: 'percentage',
      autoRenew: false,
      autoPayment: true,
      durationType: 'months',
      fixedExpiryDayEnabled: false,
      fixedExpiryDay: 0,
      fixedExpiryAccounting: 'off',
      fixedExpiryTimeEnabled: false,
      fixedExpiryTime: '12:00:00',
      addRemainingDays: true,
      bandwidthUnit: 'MB',
      bandwidthAllocationByTime: true,
      addRemainingVolumes: false,
      dataQuotaEnabled: true,
      dataQuotaVolume: 1024,
      dataQuotaExceedAction: 'fup_limit',
      fupQuotaEnabled: true,
      fupQuotaVolume: 1024,
      fupQuotaLimit: '1M/1M',
      addRemainingSession: false,
      sessionQuotaEnabled: false,
      sessionQuotaTime: 0,
      sessionQuotaExceedAction: 'disconnect',
      sessionFupLimitEnabled: false,
      sessionFupLimit: '1M/1M',
      allowSelfActivation: false,
      applyToUsers: true,
      applySettingsResellers: true,
      duration: 1,
      price: 0,
      profit: 0,
      extraFeeValue: 0,
      vatValue: 0,
      policy: '5M (*)',
      name: '',
      description: '',
      invoiceDescription: '',
      pool: '5MB',
      expirePool: 'Expired'
    });
  };

  const isAdmin = currentRole === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      {/* Packages catalog title widget */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold font-display text-slate-100 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-indigo-400" />
            <span>Nexus Broadbands Plan Manager</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-mono">Configure premium routing micro-tunnels, billing ratios & FUP sessions policies.</p>
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
            <PlusOutlined /> Add Package
          </Button>
        )}
      </div>

      {/* Form using Ant Design styled to look exactly like Nexus ISP CRM */}
      {showAddForm && isAdmin && (
        <Card 
          className="border border-slate-800 bg-slate-900/40 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden"
          title={
            <div className="flex items-center gap-2 text-slate-100 font-mono text-sm tracking-wide">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              <span>{editingPkg ? `+ Edit Package: ${editingPkg.name}` : '+ Add Package'}</span>
            </div>
          }
          extra={
            <Button onClick={resetForm} className="bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 rounded cursor-pointer">
              Cancel
            </Button>
          }
        >
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleSave}
            initialValues={{
              policy: '5M (*)', billingType: 'prepaid', extraFeeType: 'percentage', vatType: 'percentage',
              autoRenew: false, autoPayment: true, durationType: 'months', duration: 1,
              fixedExpiryDayEnabled: false, fixedExpiryDay: 0, fixedExpiryAccounting: 'off',
              fixedExpiryTimeEnabled: false, fixedExpiryTime: '12:00:00', addRemainingDays: true,
              bandwidthUnit: 'MB', bandwidthAllocationByTime: true, addRemainingVolumes: false,
              dataQuotaEnabled: true, dataQuotaVolume: 1024, dataQuotaExceedAction: 'fup_limit',
              fupQuotaEnabled: true, fupQuotaVolume: 1024, fupQuotaLimit: '1M/1M',
              addRemainingSession: false, sessionQuotaEnabled: false, sessionQuotaTime: 0,
              sessionQuotaExceedAction: 'disconnect', sessionFupLimitEnabled: false, sessionFupLimit: '1M/1M',
              allowSelfActivation: false, applyToUsers: true, applySettingsResellers: true,
              price: 0, profit: 0, extraFeeValue: 0, vatValue: 0, pool: '5MB', expirePool: 'Expired'
            }}
          >
            <Row gutter={[20, 20]}>
              {/* Policy */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="policy" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Policy <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Select 
                    showSearch
                    placeholder="Choose dynamic routing profile..."
                    popupClassName="dark-dropdown"
                    className="bg-slate-950 border-slate-800 text-slate-100 selection-green"
                  >
                    <Option value="5M (*)">5M (*)</Option>
                    <Option value="10M (*)">10M (*)</Option>
                    <Option value="15M (*)">15M (*)</Option>
                    <Option value="20M (*)">20M (*)</Option>
                    <Option value="30M (*)">30M (*)</Option>
                    <Option value="50M (*)">50M (*)</Option>
                    <Option value="100M (*)">100M (*)</Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* Name */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="name" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Name <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="5 Mbps" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg" />
                </Form.Item>
              </Col>
              
              {/* Description */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="description" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Description <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Input placeholder="5 Mbps" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg" />
                </Form.Item>
              </Col>

              {/* Invoice Description */}
              <Col xs={24} md={12}>
                <Form.Item 
                  name="invoiceDescription" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Invoice Description</span>}
                >
                  <Input.TextArea placeholder="Invoice Description" className="bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 rounded-lg" rows={1} />
                </Form.Item>
              </Col>

              {/* Billing Type */}
              <Col xs={24} md={8}>
                <Form.Item 
                  name="billingType" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Billing Type <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <Select popupClassName="dark-dropdown" className="bg-slate-950 border-slate-800 text-slate-100">
                    <Option value="prepaid">Prepaid (*)</Option>
                    <Option value="postpaid">Postpaid</Option>
                  </Select>
                </Form.Item>
              </Col>

              {/* Price */}
              <Col xs={24} md={8}>
                <Form.Item 
                  name="price" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Price <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <InputNumber className="w-full bg-slate-950 border-slate-800 text-slate-100" min={0} />
                </Form.Item>
              </Col>

              {/* Profit */}
              <Col xs={24} md={8}>
                <Form.Item 
                  name="profit" 
                  label={<span className="text-[13px] font-bold text-slate-300 font-sans">Profit <span className="text-rose-500">*</span></span>}
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <InputNumber className="w-full bg-slate-950 border-slate-800 text-slate-100" min={0} />
                </Form.Item>
              </Col>

              {/* Extra Fee */}
              <Col xs={24} md={12}>
                <Form.Item label={<span className="text-[13px] font-bold text-slate-300 font-sans">Extra Fee</span>}>
                  <div className="flex gap-2">
                    <Form.Item name="extraFeeType" noStyle>
                      <Select className="w-1/3 bg-slate-950 border-slate-800 text-slate-100" popupClassName="dark-dropdown">
                        <Option value="percentage">Percentage (*)</Option>
                        <Option value="fixed">Fixed</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="extraFeeValue" noStyle>
                      <InputNumber className="w-2/3 bg-slate-950 border-slate-800 text-slate-100" min={0} />
                    </Form.Item>
                  </div>
                </Form.Item>
              </Col>

              {/* GST/VAT */}
              <Col xs={24} md={12}>
                <Form.Item label={<span className="text-[13px] font-bold text-slate-300 font-sans">GST/VAT</span>}>
                  <div className="flex gap-2">
                    <Form.Item name="vatType" noStyle>
                      <Select className="w-1/3 bg-slate-950 border-slate-800 text-slate-100" popupClassName="dark-dropdown">
                        <Option value="percentage">Percentage (*)</Option>
                        <Option value="fixed">Fixed</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item name="vatValue" noStyle>
                      <InputNumber className="w-2/3 bg-slate-950 border-slate-800 text-slate-100" min={0} />
                    </Form.Item>
                  </div>
                </Form.Item>
              </Col>

              {/* Auto Renew */}
              <Col xs={24} sm={12} md={6}>
                <NexusFormSwitch name="autoRenew" label="Auto Renew" />
              </Col>

              {/* Auto Payment */}
              <Col xs={24} sm={12} md={6}>
                <NexusFormSwitch name="autoPayment" label="Auto Payment" />
              </Col>

              {/* Pool */}
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="pool" label={<span className="text-[13px] font-bold text-slate-300 font-sans">Pool</span>}>
                  <Input placeholder="5MB" className="bg-slate-950 border-slate-800 text-slate-100 rounded-lg placeholder-slate-600" />
                </Form.Item>
              </Col>

              {/* Expire Pool */}
              <Col xs={24} sm={12} md={6}>
                <Form.Item name="expirePool" label={<span className="text-[13px] font-bold text-slate-300 font-sans">Expire Pool</span>}>
                  <Input placeholder="Expired" className="bg-slate-950 border-slate-800 text-slate-100 rounded-lg placeholder-slate-600" />
                </Form.Item>
              </Col>

              {/* Duration */}
              <Col xs={24} md={12}>
                <Form.Item label={<span className="text-[13px] font-bold text-slate-300 font-sans font-semibold">Duration <span className="text-rose-500">*</span></span>} required>
                  <div className="flex gap-2">
                    <Form.Item name="duration" noStyle>
                      <InputNumber className="w-1/3 bg-slate-950 border-slate-800 text-slate-100" min={1} />
                    </Form.Item>
                    <Form.Item name="durationType" noStyle>
                      <Select className="w-2/3 bg-slate-950 border-slate-800 text-slate-100" popupClassName="dark-dropdown">
                        <Option value="months">Month (*)</Option>
                        <Option value="days">Days (*)</Option>
                      </Select>
                    </Form.Item>
                  </div>
                </Form.Item>
              </Col>

              {/* Fixed Expiry Day */}
              <Col xs={24} md={12}>
                <NexusFormSwitch 
                  name="fixedExpiryDayEnabled" 
                  label="Fixed Expiry Day" 
                  subInput={
                    <Form.Item name="fixedExpiryDay" noStyle>
                      <InputNumber className="w-full bg-slate-900 border-slate-800 text-slate-200" placeholder="0" min={0} />
                    </Form.Item>
                  }
                />
              </Col>

              {/* Fixed Expiry Accounting */}
              <Col xs={24} md={12}>
                <NexusFormSwitch 
                  name="fixedExpiryAccountingEnabled" 
                  label="Fixed Expiry Accounting" 
                  subInput={
                    <Form.Item name="fixedExpiryAccounting" noStyle>
                      <Radio.Group className="w-full text-slate-200">
                        <Space direction="horizontal" className="gap-6 mt-1">
                          <Radio value="off" className="text-slate-300">Off</Radio>
                          <Radio value="daily" className="text-slate-300">Daily</Radio>
                          <Radio value="hourly" className="text-slate-300">Hourly</Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  }
                />
              </Col>

              {/* Fixed Expiry Time */}
              <Col xs={24} md={12}>
                <NexusFormSwitch 
                  name="fixedExpiryTimeEnabled" 
                  label="Fixed Expiry Time" 
                  subInput={
                    <Form.Item name="fixedExpiryTime" noStyle>
                      <Input className="w-full bg-slate-900 border-slate-800 text-slate-200 font-mono rounded-lg" placeholder="12:00:00" />
                    </Form.Item>
                  }
                />
              </Col>
            </Row>

            {/* Blue Info Helper Banner */}
            <div className="my-6 bg-indigo-950/40 border border-indigo-700/35 p-4 rounded-xl flex items-start gap-2.5">
              <InfoCircleOutlined className="text-indigo-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-indigo-300/90 font-medium leading-relaxed">
                System Will Add Left Over Days From Last Activation To New Expiration, Only If User Last Activated Package Is Same As Current Renewing Package.
              </p>
            </div>

            <Row gutter={[20, 20]}>
              {/* Add Remaining Days */}
              <Col xs={24} md={8}>
                <NexusFormSwitch name="addRemainingDays" label="Add Remaining Days" />
              </Col>

              {/* Bandwidth */}
              <Col xs={24} md={16}>
                <Form.Item label={<span className="text-[13px] font-bold text-slate-300 font-sans">Bandwidth</span>}>
                  <div className="flex gap-2">
                    <Form.Item name="bandwidth" noStyle>
                      <InputNumber className="w-2/3 bg-slate-950 border-slate-800 text-slate-100" min={0} />
                    </Form.Item>
                    <Form.Item name="bandwidthUnit" noStyle>
                      <Select className="w-1/3 bg-slate-950 border-slate-800 text-slate-100" popupClassName="dark-dropdown">
                        <Option value="MB">MB (*)</Option>
                        <Option value="GB">GB (*)</Option>
                      </Select>
                    </Form.Item>
                  </div>
                </Form.Item>
              </Col>

              {/* Bandwidth Allocation By Time */}
              <Col xs={24} sm={12} md={8}>
                <NexusFormSwitch name="bandwidthAllocationByTime" label="Allocation By Time" />
              </Col>

              {/* Add Remaining Volumes */}
              <Col xs={24} sm={12} md={8}>
                <NexusFormSwitch name="addRemainingVolumes" label="Add Remaining Volumes" />
              </Col>

              {/* Data Quota & Volume */}
              <Col xs={24} md={8}>
                <NexusFormSwitch 
                  name="dataQuotaEnabled" 
                  label="Data Quota & Volume" 
                  subInput={
                    <Form.Item name="dataQuotaVolume" noStyle>
                      <InputNumber className="w-full bg-slate-900 border-slate-800 text-slate-200" placeholder="1024" min={0} />
                    </Form.Item>
                  }
                />
              </Col>

              {/* Data Quota Exceed Action */}
              <Col xs={24} md={12}>
                <NexusFormSwitch 
                  name="dataQuotaExceedActionEnabled" 
                  label="Quota Exceed Action"
                  subInput={
                    <Form.Item name="dataQuotaExceedAction" noStyle>
                      <Radio.Group className="w-full text-slate-200">
                        <Space direction="horizontal" className="gap-6 mt-1">
                          <Radio value="disconnect" className="text-slate-300">Disconnect</Radio>
                          <Radio value="fup_limit" className="text-slate-300">FUP Limit</Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  }
                />
              </Col>

              {/* FUP Quota, Volume (GB) & Limit */}
              <Col xs={24} md={12}>
                <NexusFormSwitch 
                  name="fupQuotaEnabled" 
                  label="FUP Quota & Limit" 
                  subInput={
                    <div className="flex gap-2">
                      <Form.Item name="fupQuotaVolume" noStyle>
                        <InputNumber className="w-1/2 bg-slate-900 border-slate-800 text-slate-100" placeholder="1024" min={0} />
                      </Form.Item>
                      <Form.Item name="fupQuotaLimit" noStyle>
                        <Input className="w-1/2 bg-slate-900 border-slate-800 text-slate-100 font-mono rounded" placeholder="1M/1M" />
                      </Form.Item>
                    </div>
                  }
                />
              </Col>

              {/* Add Remaining Session */}
              <Col xs={24} sm={12} md={8}>
                <NexusFormSwitch name="addRemainingSession" label="Add Remaining Session" />
              </Col>

              {/* Session Quota & Limit Time */}
              <Col xs={24} sm={12} md={8}>
                <NexusFormSwitch 
                  name="sessionQuotaEnabled" 
                  label="Session Quota & Time" 
                  subInput={
                    <Form.Item name="sessionQuotaTime" noStyle>
                      <InputNumber className="w-full bg-slate-900 border-slate-800 text-slate-200" placeholder="0" min={0} />
                    </Form.Item>
                  }
                />
              </Col>

              {/* Session Quota Exceed Action */}
              <Col xs={24} sm={12} md={8}>
                <NexusFormSwitch 
                  name="sessionQuotaExceedActionEnabled" 
                  label="Session Exceed Action"
                  subInput={
                    <Form.Item name="sessionQuotaExceedAction" noStyle>
                      <Radio.Group className="w-full text-slate-200">
                        <Space direction="horizontal" className="gap-4 mt-1">
                          <Radio value="disconnect" className="text-slate-300">Disconnect</Radio>
                          <Radio value="fup_limit" className="text-slate-300">FUP Limit</Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                  }
                />
              </Col>

              {/* Session FUP Limit */}
              <Col xs={24} md={12}>
                <NexusFormSwitch 
                  name="sessionFupLimitEnabled" 
                  label="Session FUP Limit" 
                  subInput={
                    <Form.Item name="sessionFupLimit" noStyle>
                      <Input className="w-full bg-slate-900 border-slate-800 text-slate-200 font-mono rounded-lg" placeholder="Bandwidth Ex: 1M/1M" />
                    </Form.Item>
                  }
                />
              </Col>

              {/* Allow Self Activation */}
              <Col xs={24} sm={12} md={12}>
                <NexusFormSwitch name="allowSelfActivation" label="Allow Self Activation" required={false} />
              </Col>

              {/* Apply To Users */}
              <Col xs={24} sm={12} md={12}>
                <NexusFormSwitch name="applyToUsers" label="Apply To Users" />
              </Col>

              {/* Apply Settings Resellers */}
              <Col xs={24} sm={12} md={12}>
                <NexusFormSwitch name="applySettingsResellers" label="Apply Settings Resellers" />
              </Col>
            </Row>

            {/* Submit Action Button Styled exact like Nexus (slate bold button) */}
            <div className="mt-8 border-t border-slate-800 pt-6">
              <Button 
                type="primary" 
                htmlType="submit" 
                className="w-full bg-[#1e293b] hover:bg-[#334155] border border-slate-700 text-slate-100 font-extrabold flex items-center justify-center gap-1.5 h-11 cursor-pointer rounded-xl text-xs uppercase tracking-widest transition-all shadow-md"
              >
                <span className="text-lg">+</span> Submit
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* Existing List view layout using Ant Design styling but beautifully aligned with modern dashboard */}
      <div className="mt-4">
        <Spin spinning={loading}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!loading && packages.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl text-slate-500 font-mono text-xs">
                No packages configured in standard profile catalog.
              </div>
            ) : (
              packages.map((pkg) => (
                <div 
                  key={pkg.id} 
                  className="bg-slate-900/55 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur hover:border-slate-700/80 transition-all shadow-xl group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl text-indigo-400">
                        <Wifi className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-400 transition-colors font-display tracking-tight">{pkg.name}</h3>
                        <span className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded border border-slate-850">{pkg.policy || 'Standard'}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => startEdit(pkg)}
                          className="p-1 px-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-400 border border-slate-700 hover:border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                          title="Edit Plan"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <Popconfirm
                          title="Permanently Delete Broadband Package?"
                          description="This clears its profile parameters forever."
                          onConfirm={() => handleDeletePackage(pkg.id, pkg.name)}
                          okText="Delete Plan"
                          okButtonProps={{ danger: true }}
                          cancelText="Cancel"
                        >
                          <button 
                            className="p-1 px-2.5 rounded-lg bg-rose-950/10 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 border border-slate-750 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="Delete Plan"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </Popconfirm>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 min-h-[2rem] font-sans pr-4 mb-5 border-b border-slate-805/40 pb-4">
                    {pkg.description || "Nexus High performance ISP routing speed profile."}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">Speed Allowance</span>
                      <span className="text-[13px] font-extrabold text-slate-200 mt-0.5">
                        {pkg.speedMbps || pkg.bandwidth || 0} {pkg.bandwidthUnit || 'Mbps'}
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">Settle Price</span>
                      <span className="text-[13px] font-extrabold text-indigo-400 mt-0.5">
                        {(pkg.priceMonthly ?? pkg.price ?? 0).toLocaleString()} PKR
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">Lease Duration</span>
                      <span className="text-[11px] font-extrabold text-slate-300 mt-0.5">
                        {pkg.duration || 1} {pkg.durationType || 'months'}
                      </span>
                    </div>

                    <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-900/60 flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase font-black font-sans">FUP Limits</span>
                      <span className={`text-[11px] font-extrabold mt-0.5 ${pkg.fupQuotaEnabled ? 'text-amber-500' : 'text-emerald-400'}`}>
                        {pkg.fupQuotaEnabled ? `${pkg.fupQuotaVolume} GB FUP` : 'Unlimited'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Spin>
      </div>
    </div>
  );
}
