import React, { useState } from 'react';
import { Card, Row, Col, Typography, Table, Tag, Space, Tabs } from 'antd';
import { DollarSign, PieChart, FileText } from 'lucide-react';

const { Title } = Typography;

interface FinancialRecord {
  id: string;
  type: 'Invoice' | 'Payment' | 'Adjustment';
  date: string;
  description: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

const mockFinancialData: FinancialRecord[] = [
  { id: 'REC-001', type: 'Invoice', date: '2026-06-01', description: 'Monthly Subscription - June', amount: 5000, status: 'Completed' },
  { id: 'REC-002', type: 'Payment', date: '2026-06-02', description: 'Credit Card Payment', amount: 5000, status: 'Completed' },
  { id: 'REC-003', type: 'Invoice', date: '2026-06-03', description: 'Device Rental Fee', amount: 1500, status: 'Pending' },
];

export default function AccountingManager() {
  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Amount (PKR)', dataIndex: 'amount', key: 'amount', render: (a: number) => a.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'Completed' ? 'success' : s === 'Pending' ? 'warning' : 'error'}>{s}</Tag> },
  ];

  return (
    <div className="space-y-6">
      <Title level={4}><Space><DollarSign className="text-emerald-500" /> Accounting Module</Space></Title>
      
      <Tabs 
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: <span><FileText className="w-4 h-4 mr-2" />Detailed Ledger</span>,
            children: (
              <Card>
                <Table dataSource={mockFinancialData} columns={columns} rowKey="id" />
              </Card>
            ),
          },
          {
            key: '2',
            label: <span><PieChart className="w-4 h-4 mr-2" />Financial Reports</span>,
            children: (
              <Card>
                <p className="text-zinc-500">Financial reports overview (Income Statement, Balance Sheet, etc.) will be displayed here.</p>
              </Card>
            ),
          }
        ]}
      />
    </div>
  );
}
