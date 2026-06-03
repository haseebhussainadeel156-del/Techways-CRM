import React from 'react';
import { Card, Table, Switch, Typography, Space, Tag } from 'antd';
import { Shield, Check, X } from 'lucide-react';
import { UserRole } from '../types';

const { Title, Text } = Typography;

interface PermissionsManagerProps {
  currentRole: string;
  permissions: Record<string, string[]>;
  onTogglePermission: (roleId: string, pageId: string) => void;
  hrmDepartments?: { id: string; name: string }[];
}

export default function PermissionsManager({ currentRole, permissions, onTogglePermission, hrmDepartments = [] }: PermissionsManagerProps) {
  if (currentRole !== UserRole.ADMIN) {
    return (
      <Card className="shadow-sm border-0">
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <Title level={4}>Access Restricted</Title>
          <Text type="secondary">Only the Super Administrator and executive operators can modify role permissions.</Text>
        </div>
      </Card>
    );
  }

  const roleLevels = [
    { key: UserRole.FRANCHISE, label: 'Franchise Partner' },
    { key: UserRole.DEALER, label: 'Dealer' },
    { key: UserRole.SUB_DEALER, label: 'Sub-Dealer' },
    ...hrmDepartments.map(dept => ({ key: dept.id, label: `HRM Staff: ${dept.name}` }))
  ];

  const availableModules = [
    { id: 'telemetry', name: 'Real-time Telemetry' },
    { id: 'subscribers', name: 'Subscribers Billing' },
    { id: 'tickets', name: 'Support Dispatch Desk' },
    { id: 'hrm', name: 'Multi-level HRM Portal' },
    { id: 'hrm_add_dept', name: 'HRM Action: Create Depts' },
    { id: 'hrm_del_dept', name: 'HRM Action: Delete Depts' },
    { id: 'hrm_add_staff', name: 'HRM Action: Onboard Staff' },
    { id: 'hrm_run_payroll', name: 'HRM Action: Run Payroll' },
    { id: 'franchises', name: 'Franchises' },
    { id: 'dealers', name: 'Dealers' },
    { id: 'subdealers', name: 'Sub-Dealers' },
    { id: 'reporting', name: 'Reports Module' },
    { id: 'packages', name: 'Plan Catalogue' },
    { id: 'policies', name: 'ISP Rule Policies' },
    { id: 'nas', name: 'NAS & MikroTiks' },
  ];

  return (
    <div className="space-y-6">
      <Title level={4}><Space><Shield className="text-indigo-500 w-6 h-6" /> Role-Based Access Control</Space></Title>
      <Text type="secondary" className="block mb-6">
        Configure access boundaries for each administrative level. 
        For example, you can grant access to the HRM module for Dealers and Sub-dealers.
      </Text>

      {roleLevels.map(role => {
        const currentPerms = permissions[role.key] || [];
        
        const columns = [
          {
            title: 'Module Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>,
          },
          {
            title: 'Module ID',
            dataIndex: 'id',
            key: 'id',
            render: (text: string) => <Tag>{text}</Tag>,
          },
          {
            title: 'Access Granted',
            key: 'access',
            align: 'right' as const,
            render: (_: any, record: any) => {
              const isGranted = currentPerms.includes(record.id);
              return (
                <Switch
                  checked={isGranted}
                  onChange={() => onTogglePermission(role.key, record.id)}
                  checkedChildren={<Check className="w-3 h-3 mt-1" />}
                  unCheckedChildren={<X className="w-3 h-3 mt-1" />}
                />
              );
            }
          }
        ];

        return (
          <Card key={role.key} title={<span className="font-bold uppercase tracking-wider">{role.label} Permissions</span>} className="shadow-sm mb-6">
             <Table 
               columns={columns} 
               dataSource={availableModules} 
               rowKey="id" 
               pagination={false} 
               size="small" 
             />
          </Card>
        );
      })}
    </div>
  );
}
