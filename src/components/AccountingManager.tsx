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
  customerId: string;
  type: 'Invoice' | 'Payment';
  date: string;
  description: string;
  amountDue: number;
  amountPaid: number;
  status: 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  dueDate?: string;
}

const mockFinancialData: FinancialRecord[] = [
  { id: 'REC-001', customerId: 'CUST-01', type: 'Invoice', date: '2026-06-01', description: 'Monthly Subscription', amountDue: 5000, amountPaid: 5000, status: 'Paid', billingPeriodStart: '2026-06-01', billingPeriodEnd: '2026-06-30' },
  { id: 'REC-002', customerId: 'CUST-02', type: 'Invoice', date: '2026-06-01', description: 'Service Activation', amountDue: 2000, amountPaid: 0, status: 'Pending', dueDate: '2026-06-15' },
  { id: 'REC-003', customerId: 'CUST-03', type: 'Invoice', date: '2026-06-01', description: 'Advance Billing (3 Months)', amountDue: 15000, amountPaid: 5000, status: 'Partially Paid', billingPeriodStart: '2026-06-01', billingPeriodEnd: '2026-08-31' },
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
    { title: 'Customer', dataIndex: 'customerId', key: 'customerId' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Due', dataIndex: 'amountDue', key: 'amountDue', render: (a: number) => a.toLocaleString() },
    { title: 'Paid', dataIndex: 'amountPaid', key: 'amountPaid', render: (a: number) => a.toLocaleString() },
    { title: 'Billing Period', key: 'period', render: (r: FinancialRecord) => r.billingPeriodStart ? `${r.billingPeriodStart} to ${r.billingPeriodEnd}` : '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => {
        const color = s === 'Paid' ? 'success' : s === 'Pending' ? 'warning' : s === 'Partially Paid' ? 'blue' : 'error';
        return <Tag color={color}>{s}</Tag>;
    }},
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
