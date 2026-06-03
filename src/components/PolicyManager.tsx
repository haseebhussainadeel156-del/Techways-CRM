import React, { useState, useEffect } from 'react';
import { UserRole, IspPolicy } from '../types';
import { Form, Input, Select, Button, Card, Table, Tag, Popconfirm, message, Row, Col, Typography, Space, Spin, Tabs, InputNumber, Alert } from 'antd';
import { SlidersOutlined, DeleteOutlined, EditOutlined, PlusOutlined, PlayCircleOutlined, CodeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface PolicyManagerProps {
  currentLevelId: string;
  currentRole: UserRole;
}

export default function PolicyManager({ currentLevelId, currentRole }: PolicyManagerProps) {
  const [policies, setPolicies] = useState<IspPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<IspPolicy | null>(null);
  const [form] = Form.useForm();
  
  const [formType, setFormType] = useState<string>('radius_group');

  // Simulation Feedback States
  const [simRunning, setSimRunning] = useState<string | null>(null);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  
  const [subTab, setSubTab] = useState<'radius' | 'automated'>('radius');

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      } else {
        throw new Error('Failed to query policies.');
      }
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSavePolicy = async (values: any) => {
    const payload = {
       ...values,
       policyAction: formType === 'radius_group' ? 'Apply RADIUS attributes' : values.policyAction,
    };

    try {
      const url = editingPolicy ? `/api/policies/${editingPolicy.id}` : '/api/policies';
      const method = editingPolicy ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save system policy.');
      }

      message.success(`ISP Policy "${values.name}" saved successfully.`);
      fetchPolicies();
      resetForm();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const startEdit = (p: IspPolicy) => {
    setEditingPolicy(p);
    setSubTab(p.type === 'radius_group' ? 'radius' : 'automated');
    setFormType(p.type);
    
    // Ensure attributes have at least one entry
    const attrs = p.attributes && p.attributes.length > 0 ? p.attributes : [
      { id: 'attr-1', name: 'Mikrotik-Rate-Limit', op: ':=', type: 'Reply', value: '50M/50M' }
    ];

    form.setFieldsValue({
      ...p,
      attributes: attrs
    });
    setShowForm(true);
  };

  const handleDeletePolicy = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete policy');
      message.success(`Policy "${name}" withdrawn from system.`);
      fetchPolicies();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const resetForm = () => {
    setEditingPolicy(null);
    setShowForm(false);
    form.resetFields();
    form.setFieldsValue({
      type: subTab === 'radius' ? 'radius_group' : 'fup',
      status: 'active',
      attributes: [ { name: 'Mikrotik-Rate-Limit', op: ':=', type: 'Reply', value: '50M/50M' } ]
    });
    setFormType(subTab === 'radius' ? 'radius_group' : 'fup');
  };

  const triggerSimulation = (type: string) => {
    setSimRunning(type);
    setSimLogs([]);
    let step = 0;

    const messages: Record<string, string[]> = {
      fup: ["Initializing FUP Audit...", "Querying Radius...", "Executing Rate Limit", "Audit complete."],
      scheduler: ["Verifying Time synchronization...", "Executing batch speed mutation...", "Booster Active."],
      restrict: ["Analyzing payment logs...", "Executing NAT redirect...", "Interceptor active."],
      radius_group: ["Locating Group...", "Deploying Attributes...", "RADIUS Active Group complete!"]
    };

    const targetMsg = messages[type] || ["Executing diagnostic..."];
    
    const interval = setInterval(() => {
      if (step < targetMsg.length) {
        setSimLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${targetMsg[step]}`]);
        step++;
      } else {
        clearInterval(interval);
        setSimRunning(null);
      }
    }, 1000);
  };

  const isAdmin = currentRole === UserRole.ADMIN;

  const policyColumns = [
    {
      title: 'Policy Details',
      key: 'details',
      render: (_: any, record: IspPolicy) => (
        <div>
          <Text strong>{record.name}</Text>
          <div className="text-xs text-gray-500">{record.type?.toUpperCase()}</div>
          <div className="text-xs text-gray-400 mt-1">{record.description}</div>
        </div>
      )
    },
    {
      title: 'Configuration',
      key: 'config',
      render: (_: any, record: IspPolicy) => {
        if (record.type === 'fup') return <Text>{record.quotaThresholdGb || 0} GB @ {record.speedTriggerMbps || 0}M</Text>;
        if (record.type === 'scheduler') return <Text>{record.startTime} - {record.endTime}</Text>;
        if (record.type === 'burst') return <Text>{record.burstLimitMbps || 50}M / {record.burstTimeSeconds || 15}s</Text>;
        if (record.type === 'radius_group') return (
           <div>
             <div className="text-xs font-semibold text-purple-600">Group: {record.groupName}</div>
             {record.attributes?.map((attr, idx) => (
               <div key={idx} className="text-xs">{attr.name} {attr.op} {attr.value}</div>
             ))}
           </div>
        );
        return <Text>-</Text>;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>{status.toUpperCase()}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'right' as const,
      render: (_: any, record: IspPolicy) => isAdmin ? (
        <Space>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => startEdit(record)} />
          <Popconfirm title="Delete policy?" onConfirm={() => handleDeletePolicy(record.id, record.name)}>
             <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <Card title={<Space><SlidersOutlined className="text-blue-500" /> Broadband Rule Policies</Space>} extra={
         <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            resetForm();
            setShowForm(true);
         }}>Create Policy</Button>
      }>
         <Title level={5}>Simulation Playground</Title>
         <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} md={12}>
               <Space direction="vertical" style={{ width: '100%' }}>
                 <Button block loading={simRunning === 'fup'} icon={<PlayCircleOutlined />} onClick={() => triggerSimulation('fup')}>Run Dynamic FUP Audit</Button>
                 <Button block loading={simRunning === 'scheduler'} icon={<PlayCircleOutlined />} onClick={() => triggerSimulation('scheduler')}>Force Night Booster Shift</Button>
                 <Button block loading={simRunning === 'radius_group'} icon={<PlayCircleOutlined />} onClick={() => triggerSimulation('radius_group')}>Test RADIUS Attributes</Button>
                 <Button block loading={simRunning === 'restrict'} icon={<PlayCircleOutlined />} onClick={() => triggerSimulation('restrict')}>Verify Interception Block</Button>
               </Space>
            </Col>
            <Col xs={24} md={12}>
               <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 h-full min-h-[160px] font-mono text-xs text-green-400 overflow-y-auto">
                 <div className="flex items-center text-gray-500 mb-2 border-b border-gray-800 pb-2"><CodeOutlined className="mr-2"/> SYSTEM LOGS</div>
                 {simLogs.length === 0 ? <span className="text-gray-600">Awaiting simulation trigger...</span> : simLogs.map((l, i) => <div key={i}>{l}</div>)}
               </div>
            </Col>
         </Row>
      </Card>

      {showForm && (
        <Card className="shadow-lg border-blue-200" title={editingPolicy ? "Edit Policy" : "New Policy"}>
          <Tabs 
            activeKey={subTab} 
            onChange={(k) => { setSubTab(k as any); form.setFieldsValue({type: k === 'radius' ? 'radius_group' : 'fup'}); setFormType(k === 'radius' ? 'radius_group' : 'fup'); }}
            items={[
              { key: 'radius', label: 'RADIUS Profiles Architect' },
              { key: 'automated', label: 'Core Automation Limits' }
            ]}
          />

          <Form form={form} layout="vertical" onFinish={handleSavePolicy} initialValues={{ status: 'active', type: subTab === 'radius' ? 'radius_group' : 'fup', attributes: [{ name: 'Mikrotik-Rate-Limit', op: ':=', type: 'Reply', value: '50M/50M' }] }} onValuesChange={(changedValues) => {
            if (changedValues.type) {
                setFormType(changedValues.type);
            }
          }}>
            <Row gutter={16}>
              <Col span={12}><Form.Item name="name" label={subTab === 'radius' ? 'Reference Handle' : 'Policy Rule Name'} rules={[{required: true}]}><Input /></Form.Item></Col>
              {subTab !== 'radius' && (
                 <Col span={12}>
                    <Form.Item name="type" label="Policy Type Profile">
                       <Select>
                          <Option value="fup">FUP (Fair Usage Limit)</Option>
                          <Option value="scheduler">Scheduler (Time Booster)</Option>
                          <Option value="restrict">Restrict (Billing Intercept)</Option>
                          <Option value="burst">Burst (Boost Queues)</Option>
                       </Select>
                    </Form.Item>
                 </Col>
              )}
              <Col span={subTab === 'radius' ? 12 : 12}>
                 <Form.Item name="status" label="Active Status">
                    <Select>
                       <Option value="active">Active</Option>
                       <Option value="inactive">Inactive</Option>
                    </Select>
                 </Form.Item>
              </Col>
            </Row>
            
            <Form.Item name="description" label="Description Brief"><TextArea rows={2} /></Form.Item>

            {formType === 'fup' && (
              <Row gutter={16}>
                 <Col span={12}><Form.Item name="quotaThresholdGb" label="FUP Target Quota Volume Threshold (GB)"><InputNumber className="w-full" /></Form.Item></Col>
                 <Col span={12}><Form.Item name="speedTriggerMbps" label="Down-Throttled Speed Cap (Mbps)"><InputNumber className="w-full" /></Form.Item></Col>
              </Row>
            )}

            {formType === 'scheduler' && (
               <Row gutter={16}>
                 <Col span={12}><Form.Item name="startTime" label="Start Time (HH:MM:SS)"><Input /></Form.Item></Col>
                 <Col span={12}><Form.Item name="endTime" label="End Time (HH:MM:SS)"><Input /></Form.Item></Col>
               </Row>
            )}

            {formType === 'burst' && (
               <Row gutter={16}>
                 <Col span={12}><Form.Item name="burstLimitMbps" label="Turbo Mode Burst Limit Rate (Mbps)"><InputNumber className="w-full" /></Form.Item></Col>
                 <Col span={12}><Form.Item name="burstTimeSeconds" label="Boost Window Duration (Seconds)"><InputNumber className="w-full" /></Form.Item></Col>
               </Row>
            )}

            {formType === 'restrict' && (
               <Alert message="Walled garden routing activates automatically for suspended/unpaid clients." type="warning" showIcon className="mb-4" />
            )}

            {formType === 'radius_group' && (
               <>
                 <Form.Item name="groupName" label="Group Name" rules={[{required: true}]}><Input placeholder="e.g., Premium Group" /></Form.Item>
                 
                 <Form.List name="attributes">
                    {(fields, { add, remove }) => (
                       <div className="space-y-4">
                          {fields.map((field, index) => (
                             <Card size="small" key={field.key} title={`Attribute ${index + 1}`} extra={fields.length > 1 ? <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} /> : null}>
                                <Row gutter={16}>
                                   <Col span={8}>
                                      <Form.Item {...field} name={[field.name, 'name']} label="Attribute Name" rules={[{required: true}]}>
                                         <Select allowClear>
                                            <Option value="Mikrotik-Rate-Limit">Mikrotik-Rate-Limit</Option>
                                            <Option value="Mikrotik-Total-Limit">Mikrotik-Total-Limit</Option>
                                            <Option value="Framed-Pool">Framed-Pool</Option>
                                         </Select>
                                      </Form.Item>
                                   </Col>
                                   <Col span={8}>
                                      <Form.Item {...field} name={[field.name, 'op']} label="Operator" rules={[{required: true}]}>
                                         <Input placeholder=":=" />
                                      </Form.Item>
                                   </Col>
                                   <Col span={8}>
                                      <Form.Item {...field} name={[field.name, 'type']} label="Type" rules={[{required: true}]}>
                                         <Select>
                                            <Option value="Reply">Reply</Option>
                                            <Option value="Check">Check</Option>
                                         </Select>
                                      </Form.Item>
                                   </Col>
                                </Row>
                                <Form.Item {...field} name={[field.name, 'value']} label="Value" rules={[{required: true}]}>
                                   <Input placeholder="e.g. 50M/50M" />
                                </Form.Item>
                             </Card>
                          ))}
                          <Button type="dashed" onClick={() => add({ name: '', op: ':=', type: 'Reply', value: '' })} block icon={<PlusOutlined />}>
                             Add Attribute
                          </Button>
                       </div>
                    )}
                 </Form.List>
               </>
            )}

            {formType !== 'radius_group' && (
               <Form.Item name="policyAction" label="Automated Policy Output Action Name" className="mt-4"><Input /></Form.Item>
            )}
            
            <Form.Item className="mb-0 mt-4 text-right">
               <Space>
                 <Button onClick={resetForm}>Discard Changes</Button>
                 <Button type="primary" htmlType="submit">Commit Active Policy</Button>
               </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Table dataSource={policies} columns={policyColumns} rowKey="id" loading={loading} />
    </div>
  );
}
