import React, { useState, useEffect } from 'react';
import { HrmStaff, AttendanceRecord, PayrollRecord, UserRole } from '../types';
import { Users, Clock, DollarSign, Calendar, Plus, Trash } from 'lucide-react';
import { Tabs, Card, Table, Tag, Button, Form, Input, Select, Popconfirm, message, Modal, Row, Col, Space } from 'antd';

const { Option } = Select;

interface HrmManagerProps {
  currentLevelId: string;
  currentRole: UserRole;
  departments: { id: string; name: string; description: string; staffCount: number }[];
  setDepartments: React.Dispatch<React.SetStateAction<{ id: string; name: string; description: string; staffCount: number }[]>>;
  rolePermissions: Record<string, string[]>;
  onViewProfile?: (staffId: string) => void;
}

export default function HrmManager({ currentLevelId, currentRole, departments, setDepartments, rolePermissions, onViewProfile }: HrmManagerProps) {
  const [staff, setStaff] = useState<HrmStaff[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive permissions lookup context
  const lookupKey = currentRole === UserRole.HRM_STAFF ? currentLevelId : currentRole;
  const myPerms = rolePermissions[lookupKey] || [];
  const isAdmin = currentRole === UserRole.ADMIN;
  
  const canAddDept = isAdmin || myPerms.includes('hrm_add_dept');
  const canDelDept = isAdmin || myPerms.includes('hrm_del_dept');
  const canAddStaff = isAdmin || myPerms.includes('hrm_add_staff');
  const canRunPayroll = isAdmin || myPerms.includes('hrm_run_payroll');

  const [isDeptModalVisible, setIsDeptModalVisible] = useState(false);
  const [deptForm] = Form.useForm();

  // Add Dept
  const handleAddDept = (values: any) => {
    if (!canAddDept) return message.error("Permission denied: Cannot create department.");
    setDepartments([...departments, { id: `dept-${Date.now()}`, ...values, staffCount: 0 }]);
    message.success('Department created!');
    setIsDeptModalVisible(false);
    deptForm.resetFields();
  };

  const handleDelDept = (id: string) => {
    if (!canDelDept) return message.error("Permission denied: Cannot delete department.");
    setDepartments(departments.filter(d => d.id !== id));
    message.success('Department removed');
  };

  // Staff modal
  const [isStaffModalVisible, setIsStaffModalVisible] = useState(false);
  const [staffForm] = Form.useForm();

  const loadHrmData = async () => {
    setLoading(true);
    try {
      const staffRes = await fetch(`/api/hrm/staff?levelId=${currentLevelId}&levelRole=${currentRole}`);
      const staffData = await staffRes.json();
      setStaff(staffData);

      const attRes = await fetch(`/api/hrm/attendance?levelId=${currentLevelId}&levelRole=${currentRole}`);
      const attData = await attRes.json();
      setAttendance(attData);

      const payRes = await fetch(`/api/hrm/payroll?levelId=${currentLevelId}&levelRole=${currentRole}&month=2026-05`);
      const payData = await payRes.json();
      setPayroll(payData);
    } catch (e) {
      console.error(e);
      message.error("Failed to stream HRM records from Express.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHrmData();
  }, [currentLevelId, currentRole]);

  // Handle employee creation
  const handleAddStaff = async (values: any) => {
    if (!canAddStaff) return message.error("Permission denied: Cannot onboard staff.");
    try {
      const res = await fetch('/api/hrm/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          levelId: currentLevelId,
          levelRole: currentRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success(`Employee ${values.name} registered successfully!`);
      setIsStaffModalVisible(false);
      staffForm.resetFields();
      loadHrmData();
    } catch (err: any) {
      message.error(err.message || "Failed to create staff member.");
    }
  };

  // Clock-in / Out Helper
  const handleClock = async (staffId: string, type: 'in' | 'out') => {
    try {
        const route = type === 'in' ? 'check-in' : 'check-out';
        const res = await fetch(`/api/hrm/attendance/${route}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        message.success(`Clock-${type} successful!`);
        loadHrmData();
    } catch (err: any) {
        message.error(err.message);
    }
  };

  const getAttendanceStatus = (staffId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const log = attendance.find(a => a.staffId === staffId && a.date === today);
    if (!log) return { status: "absent", checkIn: undefined, checkOut: undefined };
    return { status: log.status, checkIn: log.checkIn, checkOut: log.checkOut };
  };

  const deptColumns = [
    { title: 'Department Name', dataIndex: 'name', key: 'name', render: (t: string) => <strong>{t}</strong> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Current Staff Count', dataIndex: 'staffCount', key: 'staffCount', render: () => (Math.floor(Math.random() * 5) + 1) }, // using mock count for UI
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => canDelDept ? (
        <Popconfirm title="Delete this department?" onConfirm={() => handleDelDept(record.id)}>
          <Button danger type="text" icon={<Trash className="w-4 h-4" />} />
        </Popconfirm>
      ) : null
    }
  ];

  const staffColumns = [
    { title: 'Staff Identity', key: 'name', render: (_: any, record: HrmStaff) => (
        <div>
           <div className="font-bold">{record.name}</div>
           <div className="text-xs text-gray-500">{record.email} | {record.phone}</div>
        </div>
    )},
    { title: 'Department / Role', dataIndex: 'role', key: 'role', render: (role: string) => <Tag color="blue">{role.toUpperCase()}</Tag> },
    { title: 'Base Salary', dataIndex: 'salary', key: 'salary', render: (salary: number) => <span>{salary.toLocaleString()} PKR</span> },
    { title: 'Today Attendance', key: 'clock', render: (_: any, record: HrmStaff) => {
        const clock = getAttendanceStatus(record.id);
        return (
            <Space>
               {!clock.checkIn ? (
                  <Button size="small" type="primary" className="bg-emerald-500" onClick={() => handleClock(record.id, 'in')}>Clock In</Button>
               ) : (
                  <Tag color="success">IN: {clock.checkIn}</Tag>
               )}
               {clock.checkIn && !clock.checkOut ? (
                  <Button size="small" type="primary" danger onClick={() => handleClock(record.id, 'out')}>Clock Out</Button>
               ) : clock.checkOut ? (
                  <Tag color="default">OUT: {clock.checkOut}</Tag>
               ) : null}
            </Space>
        );
    }},
    { title: 'Action', key: 'profile', render: (_: any, record: HrmStaff) => (
        <Button 
          type="link" 
          size="small" 
          className="text-indigo-400 font-bold hover:text-indigo-300 p-0"
          onClick={() => onViewProfile && onViewProfile(record.id)}
        >
          View Profile
        </Button>
    )}
  ];

  const tabItems = [
    {
      key: 'departments',
      label: <span><Users className="w-4 h-4 inline-block mr-2" />Departments & Roles</span>,
      children: (
        <div>
          {canAddDept && (
            <div className="mb-4 text-right">
              <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsDeptModalVisible(true)}>Create Department</Button>
            </div>
          )}
          
          <Table columns={deptColumns} dataSource={departments} rowKey="id" pagination={false} />

          {canAddDept && (
            <Modal title="Create New Department" open={isDeptModalVisible} onCancel={() => setIsDeptModalVisible(false)} footer={null}>
               <Form form={deptForm} layout="vertical" onFinish={handleAddDept}>
                  <Form.Item name="name" label="Department Name" rules={[{required: true}]}><Input /></Form.Item>
                  <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
                  <Form.Item className="text-right mb-0">
                     <Space><Button onClick={() => setIsDeptModalVisible(false)}>Cancel</Button><Button type="primary" htmlType="submit">Save</Button></Space>
                  </Form.Item>
               </Form>
            </Modal>
          )}
        </div>
      )
    },
    {
      key: 'staff',
      label: <span><Clock className="w-4 h-4 inline-block mr-2" />Staffs & Payroll Directory</span>,
      children: (
        <div>
          {canAddStaff && (
            <div className="mb-4 text-right">
              <Button type="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsStaffModalVisible(true)}>Onboard Staff</Button>
            </div>
          )}

          <Table loading={loading} columns={staffColumns} dataSource={staff} rowKey="id" />

          {canAddStaff && (
            <Modal title="Onboard New Team Member" open={isStaffModalVisible} onCancel={() => setIsStaffModalVisible(false)} footer={null} width={600}>
             <Form form={staffForm} layout="vertical" onFinish={handleAddStaff}>
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="name" label="Full Name" rules={[{required: true}]}><Input /></Form.Item></Col>
                    <Col span={12}><Form.Item name="email" label="Email Address"><Input type="email" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="phone" label="Phone Number"><Input /></Form.Item></Col>
                    <Col span={12}>
                        <Form.Item name="role" label="Department / Role" rules={[{required: true}]}>
                            <Select>
                                {departments.map(d => <Option key={d.id} value={d.name}>{d.name}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item name="salary" label="Monthly Base Salary (PKR)" rules={[{required: true}]}><Input type="number" /></Form.Item>
                    </Col>
                </Row>
                <Form.Item className="text-right mb-0">
                   <Space><Button onClick={() => setIsStaffModalVisible(false)}>Cancel</Button><Button type="primary" htmlType="submit">Save Staff</Button></Space>
                </Form.Item>
             </Form>
          </Modal>
          )}
        </div>
      )
    }
  ];

  return (
    <Card className="shadow-sm border-0">
      <Tabs defaultActiveKey="departments" items={tabItems} />
    </Card>
  );
}
