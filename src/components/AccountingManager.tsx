import React, { useState } from 'react';
import { Card, Typography, Table, Tag, Space, Tabs, DatePicker } from 'antd';
import { DollarSign, PieChart, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Title } = Typography;
const { RangePicker } = DatePicker;

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
  const [dateRange, setDateRange] = useState<any>(null);

  const filteredData = mockFinancialData.filter(record => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
    const recordDate = dayjs(record.date);
    return recordDate.isSameOrAfter(dateRange[0], 'day') && recordDate.isSameOrBefore(dateRange[1], 'day');
  });

  const columns = [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag>{t}</Tag> },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Amount (PKR)', dataIndex: 'amount', key: 'amount', render: (a: number) => a.toLocaleString() },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'Completed' ? 'success' : s === 'Pending' ? 'warning' : 'error'}>{s}</Tag> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Title level={4} className="m-0"><Space><DollarSign className="text-emerald-500" /> Accounting Module</Space></Title>
        <RangePicker onChange={(dates) => setDateRange(dates)} />
      </div>
      
      <Tabs 
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: <span><FileText className="w-4 h-4 mr-2" />Detailed Ledger</span>,
            children: (
              <Card>
                <Table dataSource={filteredData} columns={columns} rowKey="id" />
              </Card>
            ),
          },
          {
            key: '2',
            label: <span><PieChart className="w-4 h-4 mr-2" />Financial Reports</span>,
            children: (
              <Card>
                <p className="text-zinc-500">Financial reports for the selected period will be generated here.</p>
              </Card>
            ),
          }
        ]}
      />
    </div>
  );
}
