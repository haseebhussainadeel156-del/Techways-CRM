import React from 'react';
import { UserRole } from '../types';
import { Card, Row, Col, Typography, Badge, Space } from 'antd';
import { Shield, Briefcase, Zap, Key, Users } from 'lucide-react';

const { Title, Text } = Typography;

interface RoleSelectorProps {
  currentRole: UserRole;
  currentId: string;
  onRoleChange: (role: UserRole, id: string) => void;
}

export default function RoleSelector({ currentRole, currentId, onRoleChange }: RoleSelectorProps) {
  const options = [
    {
      role: UserRole.ADMIN,
      id: "admin",
      label: "Super Admin",
      desc: "Global ISP Controller",
      icon: Shield,
      style: {
        active: { border: '1px solid #14b8a6', backgroundColor: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' },
        inactive: { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
      }
    },
    {
      role: UserRole.FRANCHISE,
      id: "res-1",
      label: "Alpha Franchise",
      desc: "Bulk reseller hub",
      icon: Briefcase,
      style: {
        active: { border: '1px solid #a855f7', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' },
        inactive: { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
      }
    },
    {
      role: UserRole.DEALER,
      id: "res-3",
      label: "Saddar Dealer",
      desc: "Sub-network hub",
      icon: Users,
      style: {
        active: { border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
        inactive: { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
      }
    },
    {
      role: UserRole.SUB_DEALER,
      id: "res-5",
      label: "Lane 4 Sub-Dealer",
      desc: "Micro retail tier",
      icon: Zap,
      style: {
        active: { border: '1px solid #f97316', backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
        inactive: { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
      }
    },
    {
      role: UserRole.CUSTOMER,
      id: "cust-1",
      label: "End Subscriber",
      desc: "Client portal",
      icon: Key,
      style: {
        active: { border: '1px solid #f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
        inactive: { border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'transparent' }
      }
    }
  ];

  return (
    <Card 
      className="bg-slate-900/60 border border-slate-800 rounded-2xl mb-6 relative overflow-hidden backdrop-blur"
      styles={{ body: { padding: '20px' } }}
    >
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "16px 16px" }}></div>
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <Title level={5} className="m-0 text-slate-100 font-bold tracking-tight uppercase" style={{ margin: 0, color: '#f8fafc', fontSize: '13px' }}>
            Interactive Control Simulation Workspace
          </Title>
          <Text className="text-slate-400 text-xs block mt-0.5">
            Toggle administrative nodes to preview hierarchy-scoped databases, billing wallets, and HRM workspaces.
          </Text>
        </div>
        <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-full self-start md:self-auto">
          <Badge status="processing" color="#10b981" />
          <span className="text-[10px] font-mono text-slate-300 uppercase tracking-wider font-semibold">Multi-Tenant Simulator Live</span>
        </div>
      </div>

      <Row gutter={[12, 12]} className="relative z-10">
        {options.map((opt) => {
          const isActive = currentRole === opt.role && currentId === opt.id;
          const Icon = opt.icon;
          const currentStyle = isActive ? opt.style.active : opt.style.inactive;

          return (
            <Col xs={24} sm={12} lg={4} key={`${opt.role}-${opt.id}`} style={{ flex: '1 1 20%' }}>
              <button
                id={`role-btn-${opt.role}`}
                onClick={() => onRoleChange(opt.role, opt.id)}
                style={currentStyle}
                className="w-full flex items-start p-3 text-left rounded-xl cursor-pointer transition-all hover:scale-[1.01] active:scale-99 outline-none"
              >
                <div className="p-1 px-1.5 rounded-lg bg-slate-800/80 mr-2 mt-0.5 text-slate-300">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className={`text-[11.5px] font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[9.5px] text-slate-500 font-mono truncate mt-0.5">{opt.desc}</div>
                </div>
              </button>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}
