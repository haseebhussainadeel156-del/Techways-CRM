import React, { useState, useEffect } from 'react';
import { CustomerSubscriber, BandwidthPackage, UserRole, Invoice } from '../types';
import { Form, Input, InputNumber, Select, Button, Card, Table, Tag, Popconfirm, message, Row, Col, Typography, Space, Spin, Modal } from 'antd';
import { SearchOutlined, UserAddOutlined, CreditCardOutlined, InfoCircleOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { Users } from 'lucide-react';

const { Title, Text } = Typography;
const { Option } = Select;

interface CustomerManagerProps {
  currentLevelId: string;
  currentRole: UserRole;
  packages: BandwidthPackage[];
  setActiveTab: (tabId: string) => void;
}

export default function CustomerManager({ currentLevelId, currentRole, packages, setActiveTab }: CustomerManagerProps) {
  const [customers, setCustomers] = useState<CustomerSubscriber[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [resellers, setResellers] = useState<any[]>([]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [editingCustomer, setEditingCustomer] = useState<CustomerSubscriber | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState('All');

  const myReseller = resellers.find(r => r.id === currentLevelId);
  const filteredPackages = (currentRole === UserRole.ADMIN || !myReseller)
    ? packages
    : packages
        .filter(p => !myReseller.allowedPackages || myReseller.allowedPackages.length === 0 || myReseller.allowedPackages.includes(p.id))
        .map(p => {
          if (myReseller && myReseller.packageRates && myReseller.packageRates[p.id] !== undefined) {
            return {
              ...p,
              priceMonthly: myReseller.packageRates[p.id],
              price: myReseller.packageRates[p.id]
            };
          }
          return p;
        });

  const loadClientData = async () => {
    setLoading(true);
    try {
      const custRes = await fetch(`/api/customers?id=${currentLevelId}&role=${currentRole}`);
      const custData = await custRes.json();
      setCustomers(custData);

      const invRes = await fetch(`/api/billing/invoices?resellerId=${currentLevelId}`);
      const invData = await invRes.json();
      setInvoices(invData);
      
      const resRes = await fetch('/api/resellers');
      const resData = await resRes.json();
      setResellers(resData);
    } catch (e: any) {
      message.error("Failed to pull subscribers lookup from Express API: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientData();
  }, [currentLevelId, currentRole]);

  // Form submit handler
  const handleAddClient = async (values: any) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          parentResellerId: values.parentResellerId || currentLevelId,
          parentRole: values.parentResellerId === currentLevelId ? currentRole : UserRole.FRANCHISE,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`Client account ${values.username} created! Check invoice below.`);
      form.resetFields();
      setShowAddForm(false);
      loadClientData();
    } catch (e: any) {
      message.error(e.message || "Failed to provision customer PPPoE.");
    }
  };

  const handleEditClient = async (values: any) => {
    if (!editingCustomer) return;
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success("Subscriber profile updated successfully!");
      setEditingCustomer(null);
      loadClientData();
    } catch (e: any) {
      message.error(e.message || "Failed to update subscriber.");
    }
  };

  const handleDeleteClient = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success("Subscriber deleted successfully.");
      loadClientData();
    } catch (e: any) {
      message.error(e.message || "Failed to delete subscriber.");
    }
  };

  // Toggle Suspended / Active status
  const handleToggleStatus = async (custId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    try {
      const res = await fetch('/api/customers/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: custId, status: nextStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`Subscriber account ${nextStatus} successfully.`);
      loadClientData();
    } catch (e: any) {
      message.error(e.message || "Operation failed.");
    }
  };

  // Pay unpaid invoice
  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    try {
      const res = await fetch('/api/billing/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, paymentMethod: "Dealer Wholesale Wallet" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`Invoice ${invoiceId} processed! User credentials re-enacted.`);
      loadClientData();
    } catch (e: any) {
      message.error(e.message || "Underfunded account error. Refuel reseller wallet credit.");
    }
  };

  const filteredClients = customers.filter(c => {
    const matchesSearch = c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search);
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Columns for the ant table
  const columns = [
    {
      title: '#ID',
      key: 'id_lbl',
      render: (_: any, __: any, index: number) => (
        <span className="font-mono text-slate-500 font-bold">{index + 1}</span>
      )
    },
    {
      title: 'Photo',
      key: 'photo',
      render: (_: any, record: CustomerSubscriber) => (
        <div 
          className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 overflow-hidden cursor-pointer hover:opacity-80 transition-all shadow-sm"
          onClick={() => setActiveTab(`profile:${record.id}`)}
        >
          <svg className="w-full h-full text-slate-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      )
    },
    {
      title: 'Username',
      key: 'username',
      render: (_: any, record: CustomerSubscriber) => (
        <button 
          onClick={() => setActiveTab(`profile:${record.id}`)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-mono font-medium px-3 py-1 rounded text-xs transition-all cursor-pointer border-none shadow-sm font-semibold inline-block"
        >
          {record.username}
        </button>
      )
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string) => <span className="font-mono text-slate-700">{text || 'N/A'}</span>
    },
    {
      title: 'Package',
      key: 'package',
      render: (_: any, record: CustomerSubscriber) => {
        const pkg = packages.find(p => p.id === record.packageId) || { name: "Basic Plan", speedMbps: 10, priceMonthly: 1000 };
        return <span className="text-slate-600 font-medium font-mono text-xs bg-slate-50 border px-2 py-0.5 rounded-md">{pkg.speedMbps} Mbps</span>;
      }
    },
    {
      title: 'Seller',
      key: 'seller',
      render: (_: any, record: CustomerSubscriber) => {
        const resellerObj = resellers.find(r => r.id === record.parentResellerId) || { email: "ramzan@tech.pk" };
        return <span className="text-slate-500 text-xs font-mono">{resellerObj.email || "ramzan@tech.pk"}</span>;
      }
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_: any, record: CustomerSubscriber) => (
        <span className="inline-block bg-[#f0a020cc] text-white font-mono font-extrabold px-3 py-1 rounded text-xs select-none">
          {(record.balance || 0).toFixed(2)}
        </span>
      )
    },
    {
      title: 'Service',
      key: 'service',
      render: () => (
        <span className="inline-block bg-[#5c7cfa] text-white font-bold px-3 py-0.5 rounded text-[11px] font-sans tracking-wide uppercase shadow-sm">
          PPPoE
        </span>
      )
    },
    {
      title: 'On/Off',
      key: 'onoff',
      render: (_: any, record: CustomerSubscriber) => {
        const isActive = record.status === "active";
        return (
          <span className={`inline-block text-white font-bold px-3 py-0.5 rounded text-[11px] font-sans tracking-wide uppercase select-none shadow-sm ${isActive ? 'bg-[#55aa2ccc]' : 'bg-[#777]'}`}>
            {isActive ? 'Online' : 'Offline'}
          </span>
         );
       }
    }
  ];

  const expandedRowRender = (record: CustomerSubscriber) => {
    const expDate = new Date(record.expiryDate);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formattedDate = `${String(expDate.getDate()).padStart(2, '0')} ${months[expDate.getMonth()]} ${expDate.getFullYear()} ${String(expDate.getHours()).padStart(2, '0')}:${String(expDate.getMinutes()).padStart(2, '0')}:${String(expDate.getSeconds()).padStart(2, '0')}`;

    return (
      <div className="bg-[#fbfcff] p-5 border border-slate-200 rounded-lg shadow-inner space-y-4 text-xs font-mono">
        <div className="flex flex-col gap-3">
          {/* Expiry block */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[11px] w-14">Expiry</span>
            <div className="bg-[#f04538] text-white font-bold px-3 py-1 rounded shadow-sm text-sm tracking-wide">
              {formattedDate}
            </div>
          </div>

          {/* Action block */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 font-extrabold uppercase tracking-wider text-[11px] w-14">Action</span>
            <div className="flex items-center gap-2">
              <Button 
                type="primary" 
                size="middle" 
                onClick={() => setActiveTab("profile:" + record.id)}
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-sans font-semibold flex items-center gap-1.5 h-8 px-4 border-none shadow-sm text-xs cursor-pointer rounded"
              >
                <Users className="w-4 h-4" />
                <span>View Full Profile</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Primary subscribers control widget */}
      <Card
        title={
          <Space>
            <Users className="w-5 h-5 text-blue-500" />
            <span>PPPoE / Hotspot Subscribers</span>
          </Space>
        }
        className="shadow-sm border-gray-200"
        extra={
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 120 }}
            >
              <Option value="All">All Statuses</Option>
              <Option value="Active">Active</Option>
              <Option value="Suspended">Suspended</Option>
              <Option value="Expired">Expired</Option>
            </Select>
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Search user, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />
            {true && (
              <Button type="primary" icon={<UserAddOutlined />} onClick={() => setShowAddForm(!showAddForm)}>
                Onboard Client
              </Button>
            )}
          </Space>
        }
      >
        {/* Add client profile container */}
        {showAddForm && (
          <div className="mb-6 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <Title level={5} className="mb-4">
              <InfoCircleOutlined className="text-blue-500 mr-2" /> New Subscriber Provisioning Portal
            </Title>
            <Form form={form} layout="vertical" onFinish={handleAddClient}>
              <Row gutter={16}>
                {currentRole === UserRole.ADMIN && (
                   <Col xs={24} md={8}>
                     <Form.Item name="parentResellerId" label="Assign to Reseller (or Admin)" rules={[{ required: true, message: 'Please select a reseller or Admin!' }]}>
                       <Select placeholder="Select Selection">
                         <Option key={currentLevelId} value={currentLevelId}>Direct (Admin Assignment)</Option>
                         {resellers.map(r => (
                           <Option key={r.id} value={r.id}>{r.name} ({r.role})</Option>
                         ))}
                       </Select>
                     </Form.Item>
                   </Col>
                )}
                <Col xs={24} md={8}>
                  <Form.Item name="username" label="PPPoE User Login" rules={[{ required: true, message: 'Required!' }]}>
                    <Input placeholder="e.g. user_fiber" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="password" label="Connection/Portal Password" rules={[{ required: true, message: 'Required!' }]}>
                    <Input.Password placeholder="Secure Password" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="fullName" label="Full Subscriber Name" rules={[{ required: true, message: 'Required!' }]}>
                    <Input placeholder="John Doe" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={6}>
                  <Form.Item name="packageId" label="Broadband Package Profile" rules={[{ required: true, message: 'Required!' }]}>
                    <Select placeholder="Choose Package...">
                      {filteredPackages.map(p => (
                        <Option key={p.id} value={p.id}>{p.name} ({p.speedMbps || p.bandwidth} Mbps - {p.priceMonthly || p.price} PKR)</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="customPrice" label="Custom Price To Pay (PKR)" tooltip="Override the default monthly price. Highly requested feature!">
                    <InputNumber className="w-full bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 rounded" placeholder="Default price" min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="connectionType" label="Connection Type" rules={[{ required: true, message: 'Required!' }]}>
                    <Select placeholder="Select Type">
                      <Option value="ftth">FTTH (Fiber)</Option>
                      <Option value="wireless">Wireless</Option>
                      <Option value="dsl">DSL</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="salesperson" label="Salesperson (Reseller)">
                    <Select placeholder="Select Reseller">
                      {resellers.map(r => (
                        <Option key={r.id} value={r.id}>{r.name} ({r.role})</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item 
                    name="cnic" 
                    label="National ID (CNIC)" 
                    rules={[
                      { required: true, message: 'Required!' },
                      { pattern: /^\d{5}-\d{7}-\d{1}$/, message: 'Invalid CNIC format (00000-0000000-0)' }
                    ]}
                  >
                    <Input placeholder="00000-0000000-0" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="location" label="Physical Location" rules={[{ required: true, message: 'Required!' }]}>
                    <Input placeholder="e.g. Near Main Market" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="phone" label="Phone" rules={[{ required: true, message: 'Required!' }]}>
                    <Input placeholder="+92XXXXXXXXXX" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="email" label="Email Address">
                    <Input type="email" placeholder="example@email.com" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="address" label="Detailed Address" rules={[{ required: true, message: 'Required!' }]}>
                    <Input placeholder="Plot 45, District" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="city" label="City/District" rules={[{ required: true, message: 'Required!' }]}>
                    <Select placeholder="Select City">
                      <Option value="city_1">City 1</Option>
                      <Option value="city_2">City 2</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item name="latitude" label="Latitude">
                    <Input placeholder="0.0000" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="longitude" label="Longitude">
                    <Input placeholder="0.0000" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="macAddress" label="RouterOS Locked MAC">
                    <Input placeholder="00:00:00:00:00:00" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item className="mb-0 text-right space-x-3">
                <Button onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">Authorize Connection</Button>
              </Form.Item>
            </Form>
          </div>
        )}

        <Table 
          columns={columns} 
          dataSource={filteredClients} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 800 }}
          expandable={{ expandedRowRender }}
        />
      </Card>

      {/* Edit Client Modal */}
      <Modal
        title="Edit Subscriber Profile"
        open={!!editingCustomer}
        onCancel={() => {
          setEditingCustomer(null);
          editForm.resetFields();
        }}
        footer={null}
        width={800}
        styles={{ body: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '20px' } }}
        modalRender={(node) => <div className="dark">{node}</div>}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditClient}
          initialValues={{
            connectionType: 'ftth',
            city: 'city_1'
          }}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="username" label="PPPoE User Login" rules={[{ required: true, message: 'Required' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="fullName" label="Full Name" rules={[{ required: true, message: 'Required' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={6}>
              <Form.Item name="phone" label="Phone">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="packageId" label="Broadband Package Profile" rules={[{ required: true, message: 'Required' }]}>
                <Select placeholder="Choose Package...">
                  {filteredPackages.map(p => (
                    <Option key={p.id} value={p.id}>{p.name} ({p.speedMbps || p.bandwidth} Mbps)</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="customPrice" label="Custom Price To Pay (PKR)" tooltip="Override standard price rate for this subscriber connection">
                <InputNumber className="w-full bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 rounded" placeholder="Default price" min={0} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="connectionType" label="Connection Type">
                <Select placeholder="Select Type">
                  <Option value="ftth">FTTH (Fiber)</Option>
                  <Option value="wireless">Wireless</Option>
                  <Option value="dsl">DSL</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="salesperson" label="Salesperson (Reseller)">
                <Select placeholder="Select Salesperson">
                  {resellers.map(r => (
                    <Option key={r.id} value={r.id}>{r.name} ({r.role})</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item 
                name="cnic" 
                label="CNIC (National ID)" 
                rules={[
                  { pattern: /^\d{5}-\d{7}-\d{1}$/, message: 'Invalid CNIC format (00000-0000000-0)' }
                ]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="location" label="Physical Location">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="address" label="Detailed Address">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="city" label="City/District">
                <Select placeholder="Select City">
                  <Option value="city_1">City 1</Option>
                  <Option value="city_2">City 2</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="macAddress" label="Locked MAC">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="latitude" label="Latitude">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="longitude" label="Longitude">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item className="mb-0 text-right space-x-3">
            <Button onClick={() => setEditingCustomer(null)} className="mr-2">Cancel</Button>
            <Button type="primary" htmlType="submit">Save Changes</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* BILLING MANAGEMENT / MONTHLY INVOICE STATEMENT TRACKER */}
      <Card
        title={
          <Space>
            <CreditCardOutlined className="text-green-500" />
            <span>Billing Invoices & Authorization Status</span>
          </Space>
        }
        className="shadow-sm border-gray-200"
      >
        <Text type="secondary" className="block mb-6">
          Unpaid statements freeze bandwidth lines. Process payment below to clear locks.
        </Text>
        
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            {invoices.length === 0 ? (
              <Col span={24}>
                <div className="text-center py-8 text-gray-400">
                  No subscription bills recorded under this reseller cluster.
                </div>
              </Col>
            ) : (
              invoices.map((inv) => (
                <Col xs={24} md={12} lg={8} key={inv.id}>
                  <Card size="small" className={`border-t-4 ${inv.status === 'paid' ? 'border-t-green-500' : 'border-t-yellow-500'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <Tag color="default">#{inv.id}</Tag>
                      <Tag color={inv.status === 'paid' ? 'success' : 'warning'}>
                        {inv.status.toUpperCase()}
                      </Tag>
                    </div>
                    
                    <div className="mb-4">
                      <Title level={5} className="mb-1 m-0 p-0 leading-tight">{inv.customerName}</Title>
                      <div className="text-xs text-gray-500">Plan: {inv.packageName}</div>
                      <div className="text-xs text-gray-500">Cycle: {new Date(inv.billingDate).toLocaleDateString()}</div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                      <Text strong className="text-lg">{inv.amount.toLocaleString()} PKR</Text>
                      {inv.status === "unpaid" ? (
                        <Popconfirm
                          title="Authorize Wallet Pay"
                          description="Process payment using reseller wallet?"
                          onConfirm={() => handlePayInvoice(inv.id, inv.amount)}
                          okText="Yes"
                          cancelText="Cancel"
                        >
                          <Button type="primary" className="bg-green-600 hover:bg-green-500" size="small">
                            Pay Now
                          </Button>
                        </Popconfirm>
                      ) : (
                        <Text type="secondary" className="text-xs">
                          {inv.paymentMethod}
                        </Text>
                      )}
                    </div>
                  </Card>
                </Col>
              ))
            )}
          </Row>
        </Spin>
      </Card>
    </div>
  );
}
