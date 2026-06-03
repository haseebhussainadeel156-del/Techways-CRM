import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, message, Space, Typography, Tag, Select, InputNumber } from 'antd';
import { Wallet, ArrowUpCircle } from 'lucide-react';
import { ResellerNode, WalletTransaction, UserRole } from '../types';

const { Title } = Typography;

interface WalletProps {
  currentReseller: ResellerNode;
}

export default function ResellerWallet({ currentReseller }: WalletProps) {
  const [balance, setBalance] = useState(currentReseller.balance);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [subResellers, setSubResellers] = useState<ResellerNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      // Get transactions
      const txRes = await fetch(`/api/wallet-transactions?id=${currentReseller.id}`);
      const txData = await txRes.json();
      setTransactions(txData);

      // Get children
      const resRes = await fetch('/api/resellers');
      const resData = await resRes.json();
      setSubResellers(resData.filter((r: ResellerNode) => r.parentResellerId === currentReseller.id));
    } catch (e) {
      message.error("Failed to load wallet data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentReseller.id]);

  const handleTransfer = async (values: any) => {
    try {
      const res = await fetch('/api/resellers/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromId: currentReseller.id,
          toId: values.toId,
          amount: values.amount,
          notes: values.notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      message.success("Transfer successful!");
      form.resetFields();
      loadData();
      setBalance(b => b - values.amount);
    } catch (e: any) {
      message.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title={<Space><Wallet className="text-blue-600" /> <span>My Wallet</span></Space>}
        className="shadow-md"
      >
        <div className="text-center py-6">
          <Title level={2}>{balance.toLocaleString()} PKR</Title>
          <p className="text-gray-500">Available Credit</p>
        </div>
      </Card>

      {subResellers.length > 0 && (
        <Card title="Transfer Funds">
          <Form form={form} layout="vertical" onFinish={handleTransfer}>
            <div className="flex gap-4">
              <Form.Item name="toId" label="Recipient">
                <Select style={{ width: 200 }}>
                  {subResellers.map(sr => (
                    <Select.Option key={sr.id} value={sr.id}>{sr.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="amount" label="Amount">
                <InputNumber min={1} />
              </Form.Item>
              <Form.Item name="notes" label="Notes">
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit" className="mt-7" icon={<ArrowUpCircle />}>Transfer</Button>
            </div>
          </Form>
        </Card>
      )}

      <Card title="Transaction History">
        <Table dataSource={transactions} rowKey="id" loading={loading} pagination={{ pageSize: 5 }}>
          <Table.Column title="Date" dataIndex="timestamp" render={(t: string) => new Date(t).toLocaleDateString()} />
          <Table.Column title="Source" dataIndex="fromName" />
          <Table.Column title="Recipient" dataIndex="toName" />
          <Table.Column title="Amount" dataIndex="amount" render={(a: number) => a.toLocaleString()} />
          <Table.Column title="Notes" dataIndex="notes" />
        </Table>
      </Card>
    </div>
  );
}
