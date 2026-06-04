import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Statistic, Spin } from 'antd';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';

const { Title } = Typography;

interface ReportsManagerProps {
  currentLevelId: string;
  currentRole: string;
}

export default function ReportsManager({ currentLevelId, currentRole }: ReportsManagerProps) {
  const [loading, setLoading] = useState(true);

  // Mock data for reporting module
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);

  useEffect(() => {
    // Simulate loading reporting data from backend
    setLoading(true);
    setTimeout(() => {
      setRevenueData([
        { month: 'Jan', revenue: 150000 },
        { month: 'Feb', revenue: 180000 },
        { month: 'Mar', revenue: 210000 },
        { month: 'Apr', revenue: 205000 },
        { month: 'May', revenue: 240000 },
        { month: 'Jun', revenue: 280000 },
      ]);

      setUserGrowth([
        { month: 'Jan', subscribers: 120 },
        { month: 'Feb', subscribers: 145 },
        { month: 'Mar', subscribers: 170 },
        { month: 'Apr', subscribers: 210 },
        { month: 'May', subscribers: 255 },
        { month: 'Jun', subscribers: 290 },
      ]);

      setPlanDistribution([
        { name: 'Basic (10M)', value: 400 },
        { name: 'Standard (20M)', value: 300 },
        { name: 'Pro (50M)', value: 300 },
        { name: 'Ultra (100M)', value: 200 },
      ]);
      setLoading(false);
    }, 1000);
  }, [currentLevelId]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" description="Loading comprehensive reports..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Title level={4}><Space><BarChartIcon className="text-indigo-500" /> Executive Reporting Module</Space></Title>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className="shadow-sm">
            <Statistic title="Total YTD Revenue" value={1265000} prefix="PKR" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="shadow-sm">
            <Statistic title="Total Active Subscribers" value={1200} prefix={<LineChartIcon className="w-4 h-4 mr-2" />} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="shadow-sm">
            <Statistic title="Avg. Revenue Per User (ARPU)" value={1050} prefix="PKR" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Monthly Revenue Growth" className="shadow-sm">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `PKR ${value}`} />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" fill="#818cf8" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Subscriber Acquisition Status" className="shadow-sm">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={userGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="subscribers" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24}>
          <Card title={<Space><PieChartIcon className="w-5 h-5 text-indigo-500" /> Plan Distribution</Space>} className="shadow-sm">
            <div style={{ width: '100%', height: 350 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
