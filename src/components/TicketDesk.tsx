import React, { useState, useEffect } from 'react';
import { SupportTicket, HrmStaff, UserRole } from '../types';
import { Card, Button, Form, Input, Select, Tag, Badge, Space, Row, Col, Typography, Alert, message, Tabs } from 'antd';
import { MessageSquare, Plus, Check, RefreshCw } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface TicketDeskProps {
  currentLevelId: string;
  currentRole: UserRole;
  staff: HrmStaff[];
}

export default function TicketDesk({ currentLevelId, currentRole, staff }: TicketDeskProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>("all");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets?resellerId=${currentLevelId}`);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      setTickets(data);
    } catch (e) {
      message.error("Failed to stream support tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentLevelId]);

  const handleOpenTicket = async (values: any) => {
    const { customerId, title, desc, priority } = values;
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          title,
          description: desc,
          priority
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to draft ticket");

      message.success("Support ticket registered in ticketing dispatch queue!");
      form.resetFields();
      setShowForm(false);
      loadTickets();
    } catch (e: any) {
      message.error(e.message || "Failed to draft ticket.");
    }
  };

  const handleAssignStaff = async (ticketId: string, staffId: string) => {
    try {
      const res = await fetch('/api/tickets/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          action: "assign",
          staffId
        })
      });
      if (!res.ok) throw new Error("Assign fail");
      message.success("Assigned technician successfully!");
      loadTickets();
    } catch (e) {
      message.error("Worker assignment parameter issue.");
    }
  };

  const handleMarkResolved = async (ticketId: string) => {
    try {
      const res = await fetch('/api/tickets/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          action: "resolve"
        })
      });
      if (!res.ok) throw new Error("Resolve fail");
      message.success("Ticket marked Resolved.");
      loadTickets();
    } catch (e) {
      message.error("Ticket status transmission failed.");
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === "open") return t.status === "open" || t.status === "in_progress";
    if (activeTab === "resolved") return t.status === "resolved" || t.status === "closed";
    return true;
  });

  return (
    <Card 
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-0 mb-6 relative overflow-hidden backdrop-blur"
      styles={{ body: { padding: '24px' } }}
    >
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 border-b border-slate-800/60 pb-4">
        <Space align="center" size="middle">
          <div className="p-2.5 bg-indigo-950/40 border border-indigo-900/30 rounded-xl text-indigo-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <Title level={5} className="m-0 text-slate-100 font-bold uppercase tracking-tight" style={{ margin: 0, color: '#f8fafc', fontSize: '14px' }}>
              Dispatched Support Ticket Desk
            </Title>
            <Text className="text-[11px] text-slate-405 block text-slate-400">
              Real-time ticket logging for subscriber fiber cuts & speed complaints.
            </Text>
          </div>
        </Space>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-end">
          <Tabs
            size="small"
            activeKey={activeTab}
            onChange={setActiveTab}
            className="custom-tabs border-none"
            items={[
              { label: 'All Complaints', key: 'all' },
              { label: 'Open / Pending', key: 'open' },
              { label: 'Resolved', key: 'resolved' },
            ]}
          />

          <Button
            type="primary"
            icon={<Plus className="w-3.5 h-3.5 mr-1" />}
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-500 border-none rounded-xl text-xs font-bold flex items-center cursor-pointer shadow-lg active:scale-95"
          >
            Open ticket
          </Button>
        </div>
      </div>

      {showForm && (
        <Card 
          className="relative z-10 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-5 shadow-inner"
          styles={{ body: { padding: '20px' } }}
        >
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono mb-4">
            File a Technical Fiber Call ticket
          </div>

          <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleOpenTicket}
            requiredMark={false}
            initialValues={{ priority: 'medium' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item 
                  name="customerId" 
                  label={<span className="text-[10px] uppercase font-bold text-slate-500">Subscriber ID</span>}
                  rules={[{ required: true, message: 'Please select subscriber' }]}
                >
                  <Select 
                    placeholder="Select client..." 
                    className="bg-slate-950 border-slate-800 text-slate-200 font-mono text-xs rounded-lg custom-select"
                  >
                    <Option value="cust-1">Zahid Ahmed Shah (cust-1)</Option>
                    <Option value="cust-2">Bilal Siddiqui (cust-2)</Option>
                    <Option value="cust-3">Naimur Rahman (cust-3)</Option>
                    <Option value="cust-4">Sultana Jahan (cust-4)</Option>
                  </Select>
                </Form.Item>
              </Col>
              
              <Col xs={24} sm={16}>
                <Form.Item 
                  name="title" 
                  label={<span className="text-[10px] uppercase font-bold text-slate-500">Complaint Headline</span>}
                  rules={[{ required: true, message: 'Please specify title' }]}
                >
                  <Input 
                    placeholder="High latency during peak hours" 
                    className="bg-slate-950 border-slate-850 text-slate-100 font-mono text-xs rounded-lg hover:border-indigo-500"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={16}>
                <Form.Item 
                  name="desc" 
                  label={<span className="text-[10px] uppercase font-bold text-slate-500">Detailed Log Explanation</span>}
                  rules={[{ required: true, message: 'Please provide description' }]}
                >
                  <TextArea 
                    placeholder="Describe fiber RX power DB drops, or routing issues..." 
                    rows={2}
                    className="bg-slate-950 border-slate-850 text-slate-150 font-mono text-xs rounded-lg hover:border-indigo-500"
                  />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8}>
                <Form.Item 
                  name="priority" 
                  label={<span className="text-[10px] uppercase font-bold text-slate-500">Impact Level Priority</span>}
                >
                  <Select className="bg-slate-905 border-slate-850 text-slate-300 font-mono text-xs rounded-lg custom-select">
                    <Option value="low">Low Impact</Option>
                    <Option value="medium">Medium Outage</Option>
                    <Option value="high">High Severities</Option>
                    <Option value="critical">Critical Core Loss</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <div className="flex justify-end space-x-2.5 border-t border-slate-800/80 pt-4 mt-2">
              <Button 
                type="text" 
                onClick={() => setShowForm(false)} 
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 border-none font-bold rounded-xl px-5 shadow-lg"
              >
                Dispatch Ticket Log
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* Grid listing */}
      <Row gutter={[16, 16]} className="relative z-10">
        {filteredTickets.length === 0 ? (
          <Col span={24}>
            <div className="text-center py-8 text-slate-500 font-mono text-xs">
              No active support tickets found in this queue.
            </div>
          </Col>
        ) : (
          filteredTickets.map((tkt) => {
            const isCritical = tkt.priority === "critical";
            const isHigh = tkt.priority === "high";
            const priorityTag = isCritical ? (
              <Tag color="red" className="border border-red-500/20 font-bold uppercase font-mono text-[9px] rounded-full">critical</Tag>
            ) : isHigh ? (
              <Tag color="orange" className="border border-orange-500/20 font-bold uppercase font-mono text-[9px] rounded-full">high</Tag>
            ) : (
              <Tag color="default" className="border border-slate-800 font-bold uppercase font-mono text-[9px] rounded-full">{tkt.priority}</Tag>
            );

            // Status badge status parameter
            const statusType = tkt.status === "open" ? "warning" : tkt.status === "in_progress" ? "processing" : "success";

            return (
              <Col xs={24} md={12} key={tkt.id}>
                <Card 
                  className="bg-slate-950/45 border border-slate-800/80 hover:border-slate-705/80 transition-all rounded-xl shadow-md h-full flex flex-col justify-between"
                  styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' } }}
                >
                  <div className="w-full">
                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                      <Space>
                        <span className="text-[9px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">
                          {tkt.id}
                        </span>
                        {priorityTag}
                      </Space>
                      
                      <Badge status={statusType} text={<Text className="text-[10px] text-slate-400 capitalize">{tkt.status.replace('_', ' ')}</Text>} />
                    </div>

                    <div className="space-y-1.5">
                      <Text className="text-sm font-bold text-slate-100 block">{tkt.title}</Text>
                      <Text className="text-[10px] text-slate-400 font-mono block">Subscriber: {tkt.customerName}</Text>
                      <Paragraph className="text-[11px] text-slate-400 italic mt-2 bg-slate-900/60 border border-slate-850 p-2.5 rounded-lg font-mono mb-0">
                        "{tkt.description}"
                      </Paragraph>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono w-full">
                    <div>
                      {tkt.assignedStaffName ? (
                        <span className="text-indigo-400 font-bold">Rep: {tkt.assignedStaffName}</span>
                      ) : (
                        <span className="text-slate-600 font-semibold">No worker assigned</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Assign technician dropdown */}
                      {tkt.status !== "resolved" && staff.length > 0 && (
                        <Select
                          size="small"
                          onChange={(val) => handleAssignStaff(tkt.id, val)}
                          className="text-[9px] text-slate-400 outline-none font-bold select-worker bg-slate-950 border-slate-800 rounded-md"
                          placeholder="Dispatch rep..."
                          popupClassName="bg-slate-900 text-slate-200"
                          style={{ width: '120px' }}
                        >
                          {staff.map(member => (
                            <Option key={member.id} value={member.id}>{member.name}</Option>
                          ))}
                        </Select>
                      )}

                      {tkt.status !== "resolved" && (
                        <Button
                          size="small"
                          type="text"
                          onClick={() => handleMarkResolved(tkt.id)}
                          icon={<Check className="w-3 h-3 mr-0.5" />}
                          className="px-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-md flex items-center font-bold text-[10px]"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })
        )}
      </Row>
    </Card>
  );
}
