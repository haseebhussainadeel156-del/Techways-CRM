import React, { useState, useEffect } from 'react';
import { User, Shield, Briefcase, Zap, Star, Layout, Activity, Clock, Mail, Phone, MapPin, Compass, Key, Tag, FileText, Globe, AlertCircle, Edit, Trash2, CheckCircle2, DollarSign, Users } from 'lucide-react';
import { UserRole, CustomerSubscriber, BandwidthPackage, ResellerNode, Invoice, HrmStaff } from '../types';
import { Spin, message, Row, Col, Space, Button, Popconfirm, Modal, Form, Input, Select } from 'antd';

const { Option } = Select;

interface ProfileManagerProps {
  profileId: string;
  profileRole: string;
  viewerId: string;
  viewerRole: string;
  loggedInName: string;
}

export default function ProfileManager({ profileId, profileRole, viewerId, viewerRole, loggedInName }: ProfileManagerProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [customerData, setCustomerData] = useState<CustomerSubscriber | null>(null);
  const [resellerData, setResellerData] = useState<ResellerNode | null>(null);
  const [staffData, setStaffData] = useState<HrmStaff | null>(null);
  const [packages, setPackages] = useState<BandwidthPackage[]>([]);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editForm] = Form.useForm();

  const reloadProfile = async () => {
    setLoading(true);
    try {
      const pkgRes = await fetch('/api/packages');
      if (pkgRes.ok) {
        const pkgs = await pkgRes.json();
        setPackages(pkgs);
      }

      const custRes = await fetch('/api/customers?id=admin&role=admin');
      if (custRes.ok) {
        const customers: CustomerSubscriber[] = await custRes.json();
        const found = customers.find(c => c.id === profileId);
        if (found) {
          setCustomerData(found);
        }
      }

      const invRes = await fetch('/api/billing/invoices?resellerId=admin');
      if (invRes.ok) {
        const invoices: Invoice[] = await invRes.json();
        setCustomerInvoices(invoices.filter(inv => inv.customerId === profileId));
      }

      const resRes = await fetch('/api/resellers');
      if (resRes.ok) {
        const resellersData = await resRes.json();
        setResellers(resellersData);
      }
    } catch (e: any) {
      message.error("Failed to load subscriber profile details: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [topupAmount, setTopupAmount] = useState<number | null>(null);
  const [topupNotes, setTopupNotes] = useState<string>("");

  const handleTopup = async () => {
    if (!topupAmount || topupAmount <= 0) {
      message.error("Please enter a valid amount to transfer.");
      return;
    }
    try {
      const res = await fetch('/api/resellers/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: viewerId,
          toId: profileId,
          amount: topupAmount,
          notes: topupNotes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`Successfully transferred ${topupAmount.toLocaleString()} PKR to ${resellerData?.name}.`);
      setTopupAmount(null);
      setTopupNotes("");
      await reloadProfile(); // Refresh balance
      
      // Update local state balance to avoid an extra delay
      if (resellerData) {
        setResellerData({...resellerData, balance: resellerData.balance + topupAmount});
      }

    } catch (e: any) {
      message.error(e.message || "Failed to transfer funds.");
    }
  };

  const showTopupPanel = resellerData && (viewerRole === UserRole.ADMIN || viewerRole === UserRole.HRM_STAFF || viewerId === resellerData.parentResellerId);

  useEffect(() => {
    const loadProfileDetails = async () => {
      setCustomerData(null);
      setResellerData(null);
      setStaffData(null);

      // If we are looking up a Customer profile
      if (profileRole === UserRole.CUSTOMER || profileRole === 'CUSTOMER' || profileId.startsWith('cust-')) {
        await reloadProfile();
      } 
      // If we are looking up a Reseller profile (Franchise, Dealer, Sub-Dealer)
      else if ([UserRole.FRANCHISE, UserRole.DEALER, UserRole.SUB_DEALER].includes(profileRole as any) || profileId.startsWith('res-')) {
        setLoading(true);
        try {
          const resRes = await fetch('/api/resellers');
          if (resRes.ok) {
            const resellersList: ResellerNode[] = await resRes.json();
            const found = resellersList.find(r => r.id === profileId);
            if (found) {
              setResellerData(found);
            }
          }
        } catch (e: any) {
          message.error("Failed to load reseller profile details.");
        } finally {
          setLoading(false);
        }
      } 
      // If looking up HRM Staff or sub-admin profile
      else if (profileRole === UserRole.HRM_STAFF || profileRole === 'HRM_STAFF' || profileId.startsWith('st-')) {
        setLoading(true);
        try {
          const res = await fetch('/api/hrm/staff?levelId=admin&levelRole=admin');
          if (res.ok) {
            const staffList = await res.json();
            const found = staffList.find((s: any) => s.id === profileId);
            if (found) {
              setStaffData(found);
            }
          }
        } catch (e: any) {
          message.error("Failed to load staff / sub-admin profile.");
        } finally {
          setLoading(false);
        }
      } else {
        // Reset state for admin's own profile
        setCustomerData(null);
        setResellerData(null);
        setStaffData(null);
      }
    };

    loadProfileDetails();
  }, [profileId, profileRole]);

  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    try {
      const res = await fetch('/api/billing/invoices/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, paymentMethod: "Dealer Wholesale Wallet" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`Invoice ${invoiceId} processed! User credentials updated.`);
      await reloadProfile();
    } catch (e: any) {
      message.error(e.message || "Underfunded account error. Refuel reseller wallet credit.");
    }
  };

  const handleDeleteClient = async () => {
    if (!customerData) return;
    try {
      const res = await fetch(`/api/customers/${customerData.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success("Subscriber profile permanently deleted successfully.");
      setCustomerData(null);
    } catch (e: any) {
      message.error(e.message || "Failed to delete subscriber profile.");
    }
  };

  const handleEditClient = async (values: any) => {
    if (!customerData) return;
    try {
      const res = await fetch(`/api/customers/${customerData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success("Subscriber profile updated successfully!");
      setIsEditModalOpen(false);
      await reloadProfile();
    } catch (e: any) {
      message.error(e.message || "Failed to update subscriber.");
    }
  };

  const getRoleIcon = () => {
    switch(profileRole) {
      case UserRole.ADMIN: return <Shield className="w-12 h-12 text-rose-400 drop-shadow-md" />;
      case UserRole.FRANCHISE: return <Shield className="w-12 h-12 text-indigo-400 drop-shadow-md" />;
      case UserRole.DEALER: return <Zap className="w-12 h-12 text-amber-400 drop-shadow-md" />;
      case UserRole.SUB_DEALER: return <Briefcase className="w-12 h-12 text-blue-400 drop-shadow-md" />;
      case UserRole.HRM_STAFF: return <Star className="w-12 h-12 text-emerald-400 drop-shadow-md" />;
      default: return <User className="w-12 h-12 text-slate-450 text-slate-400 drop-shadow-md" />;
    }
  };

  const getRoleName = () => {
    return profileRole.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spin size="large" tip="Retreiving complete subscriber credentials and telemetry indexes..." />
      </div>
    );
  }

  // Render CUSTOMER SUBSCRIBER Profile Details
  if (profileRole === UserRole.CUSTOMER && customerData) {
    const pkg = packages.find(p => p.id === customerData.packageId) || { name: 'Basic Tier Plan', speedMbps: 10, priceMonthly: 1200 };
    const expiryDate = new Date(customerData.expiryDate);
    const isExpired = expiryDate.getTime() < Date.now();
    const billingPrice = customerData.customPrice !== undefined ? customerData.customPrice : (pkg.priceMonthly || (pkg as any).price || 1200);

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-indigo-600/20 p-2 rounded-xl text-indigo-400 border border-indigo-500/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-slate-100 tracking-tight">Broadband Subscriber Profile</h1>
            <p className="text-[11px] text-slate-300 font-mono">Real-time connection metadata, package lease lines & hardware diagnostics.</p>
          </div>
        </div>

        {/* Identity Header */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl relative overflow-hidden backdrop-blur flex flex-col md:flex-row gap-8 items-center md:items-start shadow-xl">
          <div className="absolute -top-32 -right-32 w-100 h-100 bg-sky-505 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex-shrink-0 flex flex-col items-center gap-4 relative z-10">
            <div className="w-32 h-32 bg-slate-950/80 rounded-full flex items-center justify-center border border-slate-700 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/40 to-transparent"></div>
              <User className="w-16 h-16 text-indigo-400 drop-shadow-md" />
            </div>
            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 tracking-wider font-bold">
              SUBSCRIBER CONNECTION
            </span>
          </div>

          <div className="flex-grow space-y-4 w-full relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-display font-black text-slate-100 tracking-tight mb-1">{customerData.fullName}</h2>
                <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                  <span>PPPoE Login Username:</span>
                  <span className="text-indigo-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">{customerData.username}</span>
                </p>
              </div>
              <span className="text-[11px] bg-slate-950/85 px-4 py-2 rounded-xl border border-slate-800 font-mono text-right flex flex-col">
                <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-0.5">Assigned Speed Profiling</span>
                <span className="text-indigo-400 font-extrabold text-lg">{pkg.speedMbps} Mbps Plan</span>
              </span>
            </div>

            {/* Core Specs Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Lease WAN IP</span>
                  <span className="text-xs font-mono text-slate-200">{customerData.ipAddress || '10.254.12.11'}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Key className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Portal Access Pass</span>
                  <span className="text-xs font-mono text-slate-200">{(customerData as any).password || '••••••••'}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Physical Locked MAC</span>
                  <span className="text-xs font-mono text-slate-200">{customerData.macAddress || 'Auto-negotiated'}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-bold">Line status lease</span>
                  <span className={`text-[10px] font-bold uppercase rounded ${customerData.status === "active" ? "text-emerald-400" : "text-rose-450 text-rose-400"}`}>
                    {customerData.status || 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Customer Metadata */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* General Profile Specs */}
            <div className="bg-slate-900/65 border border-slate-800 p-6 rounded-2xl relative overflow-hidden backdrop-blur space-y-4">
              <div className="border-b border-slate-800 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs uppercase font-extrabold text-slate-205 text-slate-200 font-mono tracking-wider">Demographic & Physical Information</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">National ID card / CNIC</span>
                  <span className="text-slate-200 font-medium font-mono">{(customerData as any).cnic || '35201-9876543-1'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Mobile Contact Phone</span>
                  <span className="text-slate-200 font-medium font-mono">{(customerData as any).mobile || customerData.phone || '+92 300 1234567'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Registered Email Address</span>
                  <span className="text-slate-200 font-medium">{customerData.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Assigned MikroTik core (NAS)</span>
                  <span className="text-slate-200 font-medium font-mono">{(customerData as any).nasId || 'nas_1'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Broadband connection interface</span>
                  <span className="text-slate-200 font-semibold uppercase">{(customerData as any).connectionType || 'ftth'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Responsible Sales Representative</span>
                  <span className="text-slate-200 font-medium">{(customerData as any).salesperson || 'Agent 1'}</span>
                </div>
                <div className="flex flex-col sm:col-span-2">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Physical Installation Site Address</span>
                  <span className="text-slate-200 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{customerData.address}</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">City / District</span>
                  <span className="text-slate-200 font-semibold uppercase">{(customerData as any).city || 'city_1'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Installation coordinates (Lat/Long)</span>
                  <span className="text-slate-200 font-medium font-mono flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Lat: {(customerData as any).latitude || '0.00'}, Lng: {(customerData as any).longitude || '0.00'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription and Billing details */}
          <div className="space-y-6">
            <div className="bg-slate-900/65 border border-slate-800 p-6 rounded-2xl relative overflow-hidden backdrop-blur flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-4 text-emerald-450 text-emerald-450 text-emerald-400">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span className="text-xs uppercase font-extrabold text-slate-200 font-mono tracking-wider">Subscription Period</span>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-black mb-1">Line Cycle Expiration Date</span>
                    <span className={`text-sm font-semibold font-mono ${isExpired ? 'text-red-400' : 'text-slate-250 text-slate-200'}`}>
                      {expiryDate.toLocaleDateString()} at {expiryDate.toLocaleTimeString()}
                    </span>
                    {isExpired && (
                      <div className="text-[10px] text-red-500 font-medium mt-1 uppercase tracking-wider flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Broadband subscription expired! line locked.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs bg-slate-950/65 p-3 rounded-lg border border-slate-850">
                    <span className="text-slate-500">Tariff Rent (Monthly)</span>
                    <span className="font-semibold text-slate-100 font-mono">{billingPrice} PKR</span>
                  </div>
                  <div className="flex justify-between items-center text-xs bg-slate-950/65 p-3 rounded-lg border border-slate-850">
                    <span className="text-slate-500">Billing Loop Assignee</span>
                    <span className="font-semibold text-indigo-400 font-mono">#{customerData.parentResellerId}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Control & Administration Panel */}
            <div className="bg-slate-900/65 border border-slate-800 p-6 rounded-2xl relative overflow-hidden backdrop-blur space-y-5">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Layout className="w-4 h-4 text-indigo-400" />
                <span className="text-xs uppercase font-extrabold text-slate-200 font-mono tracking-wider font-semibold">Administrative Controls</span>
              </div>

              {/* Invoicing and payment action */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="block text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold">Lease Line Billing Status</span>
                {customerInvoices.some(inv => inv.status === 'unpaid') ? (
                  (() => {
                    const outstanding = customerInvoices.find(inv => inv.status === 'unpaid')!;
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-xs font-semibold text-rose-300 font-mono">{outstanding.amount} PKR Outstanding</span>
                          </div>
                        </div>
                        <Popconfirm
                          title="Settle billing invoice using Dealer Wholesale Wallet?"
                          description={`Paying this invoice will reduce reseller wallet by ${outstanding.amount} PKR.`}
                          onConfirm={() => handlePayInvoice(outstanding.id, outstanding.amount)}
                          okText="Confirm Settle"
                          cancelText="Cancel"
                        >
                          <Button 
                            className="w-full bg-emerald-600 border-none hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 h-10 cursor-pointer"
                            type="primary"
                            size="middle"
                          >
                            <span>💳 Settle & Pay Invoice</span>
                          </Button>
                        </Popconfirm>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-sans">All billing cycles paid & updated.</span>
                  </div>
                )}
              </div>

              {/* Demographic Profile Actions */}
              <div className="space-y-3.5">
                <button
                  onClick={() => {
                    setIsEditModalOpen(true);
                    editForm.setFieldsValue({
                      username: customerData.username,
                      fullName: customerData.fullName,
                      email: customerData.email,
                      phone: customerData.phone,
                      packageId: customerData.packageId,
                      connectionType: (customerData as any).connectionType || 'ftth',
                      salesperson: (customerData as any).salesperson || 'agent_1',
                      cnic: (customerData as any).cnic || '',
                      mobile: (customerData as any).mobile || customerData.phone || '',
                      address: customerData.address,
                      city: (customerData as any).city || 'city_1',
                      macAddress: customerData.macAddress,
                      latitude: (customerData as any).latitude || '',
                      longitude: (customerData as any).longitude || '',
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 border border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 rounded-xl text-xs font-semibold text-slate-100 transition-all cursor-pointer"
                >
                  <Edit className="w-4 h-4 text-indigo-400" />
                  <span>Inspect Profile Details</span>
                </button>

                <Popconfirm
                  title="Confirm Permanent Deletion of Subscriber Account?"
                  description="This clears their status records, credentials, and connection lease line forever."
                  onConfirm={handleDeleteClient}
                  okText="Delete Profile"
                  okButtonProps={{ danger: true }}
                  cancelText="Cancel"
                >
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600/10 border border-rose-500/25 hover:bg-rose-600/25 hover:border-rose-500/40 rounded-xl text-xs font-semibold text-rose-450 text-rose-400 transition-all cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Subscriber Profile</span>
                  </button>
                </Popconfirm>
              </div>
            </div>

          </div>
        </div>

        {/* Inspect/Edit Profile Modal (Editable) */}
        <Modal
          title={
            <div className="flex items-center gap-2 text-slate-100 font-display">
              <User className="w-5 h-5 text-indigo-400" />
              <span>Update Subscriber Profile</span>
            </div>
          }
          open={isEditModalOpen}
          onCancel={() => {
            setIsEditModalOpen(false);
            editForm.resetFields();
          }}
          footer={[
            <Button key="close" type="text" onClick={() => setIsEditModalOpen(false)} className="text-slate-400">
              Cancel
            </Button>,
            <Button key="save" type="primary" onClick={() => editForm.submit()} className="bg-indigo-600 hover:bg-indigo-500 border-none px-5">
              Save Changes
            </Button>
          ]}
          width={800}
          styles={{ body: { backgroundColor: '#0f172a', color: '#f8fafc', padding: '20px' } }}
          modalRender={(node) => <div className="dark">{node}</div>}
        >
          <Form
            form={editForm}
            layout="vertical"
            initialValues={{
              connectionType: 'ftth',
              city: 'city_1'
            }}
          >
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="username" label="PPPoE User Login">
                  <Input disabled className="bg-slate-900 border-slate-700 text-slate-400 cursor-not-allowed" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="fullName" label="Full Name">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="email" label="Email">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="phone" label="Phone">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="packageId" label="Broadband Package Profile">
                  <Select placeholder="Choose Package..." popupClassName="dark-dropdown">
                    {packages.map(p => (
                      <Option key={p.id} value={p.id}>{p.name} ({p.speedMbps || p.bandwidth} Mbps)</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="connectionType" label="Connection Type">
                  <Select placeholder="Select Type" popupClassName="dark-dropdown">
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
                  <Select placeholder="Select Salesperson" popupClassName="dark-dropdown">
                    {resellers.map(r => (
                      <Option key={r.id} value={r.id}>{r.name} ({r.role})</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="cnic" label="CNIC (National ID)">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="mobile" label="Mobile">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="address" label="Address">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="city" label="City/District">
                  <Select placeholder="Select City" popupClassName="dark-dropdown">
                    <Option value="city_1">City 1</Option>
                    <Option value="city_2">City 2</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="macAddress" label="Locked MAC">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="latitude" label="Latitude">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="longitude" label="Longitude">
                  <Input className="bg-slate-900 border-slate-700 text-slate-200" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    );
  }

  // Render RESELLER Profile Details (Franchise, Dealer, Sub-Dealer)
  if (resellerData) {
    const isOnline = resellerData.status === 'active';
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-indigo-600/20 p-2 rounded-xl text-indigo-400 border border-indigo-500/30">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-slate-100 tracking-tight">System Reseller Division Profile</h1>
            <p className="text-[11px] text-slate-300 font-mono">Wholesale dealer cluster details, franchise status & financial tracking.</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl relative overflow-hidden backdrop-blur flex flex-col md:flex-row gap-8 items-center md:items-start shadow-xl">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex-shrink-0 flex flex-col items-center gap-4 relative z-10">
            <div className="w-32 h-32 bg-slate-950/80 rounded-full flex items-center justify-center border border-slate-700 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/40 to-transparent"></div>
              {getRoleIcon()}
            </div>
            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 tracking-widest font-bold">
              {getRoleName()}
            </span>
          </div>

          <div className="flex-grow space-y-6 w-full relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-display font-black text-slate-100 tracking-tight mb-1">{resellerData.name}</h2>
                <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                  <span>Owner Contact Name:</span>
                  <span className="text-indigo-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{resellerData.ownerName}</span>
                </p>
              </div>
              <span className="text-[11px] bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 font-mono text-right flex flex-col">
                <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider mb-0.5">Wholesale Wallet Reserve</span>
                <span className="text-zinc-50 font-black text-lg">{resellerData.balance.toLocaleString()} PKR</span>
              </span>
            </div>

            <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/60 space-y-4">
              <div className="border-b border-slate-800/80 pb-2">
                <h3 className="text-xs uppercase font-extrabold text-slate-350 text-slate-300 font-mono tracking-wider">Network Cluster Metrics</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5 font-mono">Cluster Identifier</span>
                  <span className="text-slate-20 w-fit text-slate-200 bg-slate-900 border border-slate-800 px-2 py-1 rounded font-mono text-xs">{resellerData.id}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Assigned Service Hub</span>
                  <span className="text-slate-200 font-medium">{resellerData.location}</span>
                </div>
                <div className="flex flex-col font-mono">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Hired subscribers / loops</span>
                  <span className="text-indigo-400 font-extrabold text-sm">{resellerData.userCount || 0} active links</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">Admin Level Parent</span>
                  <span className="text-slate-200 font-mono text-xs">#{resellerData.parentResellerId || 'Super-Admin Override'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Credentials and communications details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Mail className="w-4 h-4" />
              <span className="text-xs uppercase font-extrabold text-slate-200 font-mono tracking-wider">Cluster Contacts</span>
            </div>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                 <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Email Support Address</span>
                 <span className="text-slate-200 font-mono text-xs">{resellerData.email}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850 font-mono">
                 <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Mobile Number</span>
                 <span className="text-slate-200 text-xs">{resellerData.phoneNumber || '+92 321 0000000'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4 text-emerald-400 animate-pulse">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase font-extrabold text-slate-200 font-mono tracking-wider">Authorized Status</span>
              </div>
              
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850 text-center space-y-2">
                 <span className={`text-base font-black font-mono tracking-wider ${isOnline ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`}>
                    {isOnline ? '● AUTHORIZED OPERATOR' : '● ACCOUNT SUSPENDED'}
                 </span>
                 <p className="text-[10px] text-slate-500 font-mono">
                   Registered operational cycle initialized at {resellerData.createdAt ? new Date(resellerData.createdAt).toLocaleDateString() : '01/01/2026'}.
                 </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Funds / Top Up Panel (Shown if authorized) */}
        {showTopupPanel && (
          <div className="bg-gradient-to-r from-indigo-900/20 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400 mb-4">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-sm uppercase font-extrabold text-slate-100 font-mono tracking-wider">Top-Up Reseller Wallet Reserve</span>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Transfer Amount (PKR)</label>
                <Input 
                  type="number"
                  min={1}
                  value={topupAmount || ''} 
                  onChange={(e) => setTopupAmount(Number(e.target.value))}
                  placeholder="Enter amount (e.g. 50000)" 
                  className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-600 rounded-lg h-10 w-full font-mono text-lg" 
                  prefix={<span className="text-slate-500 text-xs">PKR</span>}
                />
              </div>
              <div className="flex-1 w-full flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">Transaction Note / Memo</label>
                <Input 
                  value={topupNotes} 
                  onChange={(e) => setTopupNotes(e.target.value)}
                  placeholder="e.g. Monthly Advance" 
                  className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder-slate-600 rounded-lg h-10 w-full"
                />
              </div>
              <div className="w-full md:w-auto mt-4 md:mt-0">
                <Button 
                  type="primary" 
                  onClick={handleTopup} 
                  className="bg-indigo-600 hover:bg-indigo-500 border-none rounded-lg h-10 px-8 font-bold font-mono tracking-wider w-full shadow-lg shadow-indigo-900/40"
                >
                  Confirm Transfer
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-3 mb-0">
              Transferring funds instantly deducts from your own wallet reserve (unless operating as unrestricted superadmin) and credits the target reseller balance.
            </p>
          </div>
        )}

        {/* Allotted Broadband Profiles & Custom Pricing tariff */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase font-extrabold text-slate-200 font-mono tracking-wider">ALLOTTED BROADBAND PROFILES & CUSTOM RATES</span>
          </div>
          
          {(!resellerData.allowedPackages || resellerData.allowedPackages.length === 0) ? (
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 text-center">
              <p className="text-xs text-slate-500 font-mono">No authorized package profiles assigned yet. Edit this reseller node to allot profiles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resellerData.allowedPackages.map((pkgId: string) => {
                const pkg = packages.find(p => p.id === pkgId);
                const customPrice = resellerData.packageRates?.[pkgId] ?? (pkg ? (pkg.priceMonthly ?? pkg.price ?? 0) : 0);
                const generalCustomerPrice = resellerData.customerPackageRates?.[pkgId] ?? (customPrice + 500);
                if (!pkg) return null;
                return (
                  <div key={pkgId} className="bg-slate-950/60 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-slate-100 text-sm">{pkg.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">{pkg.speedMbps || pkg.bandwidth || 0} Mbps Bandwidth</span>
                    </div>
                    <div className="text-right space-y-1">
                      <div>
                        <span className="block text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest leading-3">Wholesale Buy Rate</span>
                        <span className="text-xs font-black font-mono text-slate-100">{customPrice.toLocaleString()} PKR</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-widest leading-3">Customer Retail Price</span>
                        <span className="text-xs font-black font-mono text-indigo-300">{generalCustomerPrice.toLocaleString()} PKR</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (staffData) {
    const isSubAdmin = staffData.levelRole === UserRole.ADMIN && staffData.role === 'manager';

    return (
      <div className="space-y-6 text-left">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-emerald-600/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display text-slate-100 tracking-tight">
              {isSubAdmin ? "Sub-Admin Profile Spec" : "HRM Staff Member Profile"}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">Employee identification index, payroll details & operations level scope.</p>
          </div>
        </div>

        {/* Identity Card */}
        <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl relative overflow-hidden backdrop-blur flex flex-col md:flex-row gap-8 items-center md:items-start shadow-xl">
          <div className="absolute -top-32 -right-32 w-100 h-100 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex-shrink-0 flex flex-col items-center gap-4 relative z-10">
            <div className="w-32 h-32 bg-slate-950/80 rounded-full flex items-center justify-center border border-slate-700 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/40 to-transparent"></div>
              {isSubAdmin ? (
                <Shield className="w-16 h-16 text-rose-400 drop-shadow-md" />
              ) : (
                <Briefcase className="w-16 h-16 text-emerald-400 drop-shadow-md" />
              )}
            </div>
            <span className={`text-[10px] font-mono px-3 py-1 rounded-full border tracking-widest font-bold uppercase ${
              isSubAdmin ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              {isSubAdmin ? "SUB-ADMINISTRATOR" : `HRM ${staffData.role}`}
            </span>
          </div>

          <div className="flex-grow space-y-4 w-full relative z-10 text-left">
            <div>
              <h2 className="text-3xl font-display font-black text-slate-100 tracking-tight mb-1">{staffData.name}</h2>
              <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                <span>Employee Registry ID:</span>
                <span className="text-indigo-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">{staffData.id}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold">Scoped level</span>
                  <span className="text-xs font-mono text-slate-200 capitalize">{staffData.levelRole ? staffData.levelRole.toLowerCase() : 'Admin'}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold">Assigned Role</span>
                  <span className="text-xs font-semibold text-slate-200 capitalize">{staffData.role ? staffData.role.replace('_', ' ') : 'Manager'}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold">Base Salary</span>
                  <span className="text-xs font-mono text-slate-100">{staffData.salary ? staffData.salary.toLocaleString() : '0'} PKR</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-mono font-bold">Status State</span>
                  <span className={`text-[10px] font-mono font-bold uppercase ${
                    staffData.status === "active" ? "text-emerald-400" : "text-amber-450 text-amber-400"
                  }`}>{staffData.status ? staffData.status.replace('_', ' ') : 'ACTIVE'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur space-y-4">
            <div className="flex items-center space-x-2 text-indigo-400">
              <Mail className="w-4 h-4" />
              <span className="text-xs uppercase font-extrabold text-slate-205 text-slate-200 font-mono tracking-wider">Contact Credentials</span>
            </div>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                 <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Email Address</span>
                 <span className="text-slate-200 font-mono text-xs">{staffData.email}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                 <span className="text-slate-500 text-xs uppercase font-bold tracking-wider">Mobile Number</span>
                 <span className="text-slate-200 font-mono text-xs">{staffData.phone}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4 text-emerald-450 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs uppercase font-extrabold text-slate-205 text-slate-200 font-mono tracking-wider">Operational Status</span>
              </div>
              
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850 text-center space-y-2">
                 <span className="text-base font-black font-mono tracking-wider text-emerald-400 select-none">
                    ● ACTIVE IN DIRECTORY
                 </span>
                 <p className="text-[10px] text-slate-500 font-mono">
                   Contract and hiring payroll initialized on {staffData.hiredAt ? new Date(staffData.hiredAt).toLocaleDateString() : '01/01/2026'}.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: Default session user display (Super Admin)
  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-3 mb-2">
        <div className="bg-indigo-600/20 p-2 rounded-xl text-indigo-400 border border-indigo-500/30">
          <User className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold font-display text-slate-100 tracking-tight">Identity Profile</h1>
          <p className="text-[11px] text-slate-400 font-mono">View your current operational session context.</p>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-2xl relative overflow-hidden backdrop-blur flex flex-col md:flex-row gap-8 items-center md:items-start shadow-xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex-shrink-0 flex flex-col items-center gap-4 relative z-10">
          <div className="w-32 h-32 bg-slate-950/80 rounded-full flex items-center justify-center border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-800/40 to-transparent"></div>
            {getRoleIcon()}
          </div>
          <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/20 tracking-widest font-bold">
            {getRoleName()}
          </span>
        </div>
        
        <div className="flex-grow space-y-6 w-full relative z-10">
          <div>
            <h2 className="text-3xl font-display font-black text-slate-100 tracking-tight mb-1">{loggedInName}</h2>
            <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
               <span>Account ID:</span>
               <span className="text-indigo-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{profileId}</span>
            </p>
          </div>
          
          <div className="bg-slate-950/50 rounded-xl p-5 border border-slate-800/60 space-y-4">
            <div className="border-b border-slate-800 pb-2">
               <h3 className="text-xs uppercase font-extrabold text-slate-300 font-mono tracking-wider">Profile Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
               <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Full Name</span>
                  <span className="text-slate-202 text-slate-200 font-medium">{loggedInName}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Account Role</span>
                  <span className="text-slate-202 text-slate-200 font-medium">{getRoleName()}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">System ID</span>
                  <span className="text-slate-202 text-slate-200 font-mono">{profileId}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Status</span>
                  <span className="w-fit">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-500/20 uppercase font-mono font-bold flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                       ACTIVE
                    </span>
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
