import fs from 'fs';
import path from 'path';
import pg from 'pg';
import {
  UserRole,
  BandwidthPackage,
  RouterOS,
  ResellerNode,
  CustomerSubscriber,
  Invoice,
  WalletTransaction,
  HrmStaff,
  AttendanceRecord,
  PayrollRecord,
  SupportTicket,
  BandwidthDataPoint,
  ActivityLog,
  CashflowCategory,
  CashflowEntry,
  RadiusSession,
  IspPolicy,
  AdminUser
} from '../src/types';

const { Pool } = pg;

// Storage file path
const STORAGE_FILE = path.join(process.cwd(), 'server_data_storage.json');

// Interface for database schema
export interface DatabaseSchema {
  admins: AdminUser[];
  packages: BandwidthPackage[];
  routers: RouterOS[];
  resellers: ResellerNode[];
  customers: CustomerSubscriber[];
  invoices: Invoice[];
  walletTransactions: WalletTransaction[];
  hrmStaff: HrmStaff[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  tickets: SupportTicket[];
  bandwidthLogs: BandwidthDataPoint[];
  activityLogs: ActivityLog[];
  cashflowCategories: CashflowCategory[];
  cashflow: CashflowEntry[];
  radiusSessions: RadiusSession[];
  policies: IspPolicy[];
}

// Initial Mock Data
const INITIAL_DB: DatabaseSchema = {
  admins: [],
  packages: [
    { 
      id: "pkg-1", 
      name: "Bronze 10M", 
      speedMbps: 10, 
      priceMonthly: 1200, 
      type: "pppoe", 
      description: "Standard home unlimited package",
      groupName: "Standard Retail",
      duration: 30,
      durationType: "days",
      volumeGb: 0,
      pool: "PPPoE-Assigned-Pool",
      expirePool: "Expired-Lease-Pool",
      qtEnabled: false,
      vat: 5,
      extraFee: 1500,
      invoiceDescription: "Bronze 10M active symmetric lease"
    },
    { 
      id: "pkg-2", 
      name: "Silver 25M", 
      speedMbps: 25, 
      priceMonthly: 2000, 
      type: "pppoe", 
      description: "Premium family high-speed deal",
      groupName: "Standard Retail",
      duration: 30,
      durationType: "days",
      volumeGb: 0,
      pool: "PPPoE-Assigned-Pool",
      expirePool: "Expired-Lease-Pool",
      qtEnabled: false,
      vat: 5,
      extraFee: 1500,
      invoiceDescription: "Silver 25M active symmetric lease"
    },
    { 
      id: "pkg-3", 
      name: "Gold 50M", 
      speedMbps: 50, 
      priceMonthly: 3500, 
      type: "pppoe", 
      description: "SOHO / Gaming low latency profile",
      groupName: "Corporate Premium",
      duration: 30,
      durationType: "days",
      volumeGb: 0,
      pool: "PPPoE-Assigned-Pool",
      expirePool: "Expired-Lease-Pool",
      qtEnabled: false,
      vat: 15,
      extraFee: 2500,
      invoiceDescription: "Gold Symmetrical gaming bypass route"
    },
    { 
      id: "pkg-4", 
      name: "Platinum 100M", 
      speedMbps: 100, 
      priceMonthly: 6000, 
      type: "pppoe", 
      description: "Corporate fiber-speed bandwidth",
      groupName: "Corporate Premium",
      duration: 30,
      durationType: "days",
      volumeGb: 0,
      pool: "PPPoE-Assigned-Pool",
      expirePool: "Expired-Lease-Pool",
      qtEnabled: false,
      vat: 15,
      extraFee: 5000,
      invoiceDescription: "Platinum Corporate direct optical line allocation"
    },
    { 
      id: "pkg-5", 
      name: "Hotspot Basic Daily", 
      speedMbps: 5, 
      priceMonthly: 100, 
      type: "hotspot", 
      description: "Daily card for public Wi-Fi zones",
      groupName: "Hotspot Public",
      duration: 1,
      durationType: "days",
      volumeGb: 5,
      pool: "Hotspot-DHCP-Pool",
      expirePool: "Expired-Hotspot-Restrict",
      qtEnabled: true,
      vat: 0,
      extraFee: 0,
      invoiceDescription: "Prepaid voucher daily lease ticket"
    }
  ],
  routers: [
    { id: "router-1", name: "NOC-MikroTik-CCR1036", ipAddress: "103.45.12.1", status: "online", cpuUsage: 24, memoryUsage: 42, uptime: "14d 6h 12m", activeUsers: 642 },
    { id: "router-2", name: "Franchise-A-RB4011", ipAddress: "103.45.15.5", status: "online", cpuUsage: 12, memoryUsage: 28, uptime: "3d 11h 45m", activeUsers: 198 },
    { id: "router-3", name: "Dealer-S-CCR2004", ipAddress: "192.168.88.1", status: "online", cpuUsage: 8, memoryUsage: 19, uptime: "27d 1h 22m", activeUsers: 84 },
    { id: "router-4", name: "Backup-Core-CCR1009", ipAddress: "10.0.1.1", status: "offline", cpuUsage: 0, memoryUsage: 0, uptime: "0m", activeUsers: 0 }
  ],
  resellers: [
    {
      id: "res-1",
      name: "Alpha Broadband Franchise",
      ownerName: "Zahid Ahmed Khan",
      role: UserRole.FRANCHISE,
      parentResellerId: undefined,
      balance: 145000,
      phoneNumber: "+92 300 1234567",
      email: "alpha.franchise@nexus.net",
      status: "active",
      userCount: 382,
      location: "Lahore Central NOC",
      createdAt: "2025-01-10T08:00:00Z"
    },
    {
      id: "res-2",
      name: "OmniNet Reseller Group",
      ownerName: "Rahat Chowdhury",
      role: UserRole.FRANCHISE,
      parentResellerId: undefined,
      balance: 98000,
      phoneNumber: "+880 1711 998877",
      email: "dhaka-omni@nexus.net",
      status: "active",
      userCount: 144,
      location: "Dhaka North Division",
      createdAt: "2025-02-15T10:30:00Z"
    },
    {
      id: "res-3",
      name: "Saddar Area Cable Dealer",
      ownerName: "Kamran Malik",
      role: UserRole.DEALER,
      parentResellerId: "res-1",
      balance: 32000,
      phoneNumber: "+92 321 9876543",
      email: "kamran.saddar@alpha.net",
      status: "active",
      userCount: 92,
      location: "Saddar Sector B",
      createdAt: "2025-03-01T12:00:00Z"
    },
    {
      id: "res-4",
      name: "Mirpur Dynamic Reseller",
      ownerName: "Asif Faisal",
      role: UserRole.DEALER,
      parentResellerId: "res-2",
      balance: 12500,
      phoneNumber: "+880 1622 345678",
      email: "asif.mirpur@omni.net",
      status: "active",
      userCount: 52,
      location: "Mirpur-10 Block C",
      createdAt: "2025-03-12T14:15:00Z"
    },
    {
      id: "res-5",
      name: "Lane 4 MicroNet",
      ownerName: "Tariq Mahmood",
      role: UserRole.SUB_DEALER,
      parentResellerId: "res-3",
      balance: 4500,
      phoneNumber: "+92 333 4445556",
      email: "tariq.lanes@saddar-isp.net",
      status: "active",
      userCount: 18,
      location: "Saddar Cantt Lanes",
      createdAt: "2025-04-01T09:00:00Z"
    },
    {
      id: "res-6",
      name: "M-11 Cyber Cable",
      ownerName: "Hasan Tariq",
      role: UserRole.SUB_DEALER,
      parentResellerId: "res-4",
      balance: 1200,
      phoneNumber: "+880 1819 123456",
      email: "hasan.m11@mirpur-res.net",
      status: "active",
      userCount: 12,
      location: "Mirpur Section 11",
      createdAt: "2025-04-10T16:40:00Z"
    }
  ],
  customers: [
    {
      id: "cust-1",
      username: "zahid_fiber_home",
      fullName: "Zahid Ahmed Shah",
      email: "zahid.shah@gmail.com",
      phone: "+92 301 9993322",
      packageId: "pkg-3",
      parentResellerId: "res-3",
      parentRole: UserRole.DEALER,
      balance: 1500,
      status: "active",
      expiryDate: "2026-06-30T23:59:59Z",
      address: "House 12, Street 3, Saddar Cantt, Lahore",
      ipAddress: "103.45.12.89",
      macAddress: "B4:F2:E8:11:AA:FF",
      createdAt: "2025-03-05T12:00:00Z"
    },
    {
      id: "cust-2",
      username: "sub_user_lan4",
      fullName: "Bilal Siddiqui",
      email: "bilal.sid@yahoo.com",
      phone: "+92 345 8887766",
      packageId: "pkg-1",
      parentResellerId: "res-5",
      parentRole: UserRole.SUB_DEALER,
      balance: 200,
      status: "active",
      expiryDate: "2026-06-15T23:59:59Z",
      address: "Flat 2B, Saddar Lane 4, Lahore",
      ipAddress: "103.45.12.181",
      macAddress: "D8:C4:4E:EF:88:55",
      createdAt: "2025-04-02T10:00:00Z"
    },
    {
      id: "cust-3",
      username: "mirpur_gamer_99",
      fullName: "Naimur Rahman",
      email: "naimur.dhaka@gmail.com",
      phone: "+880 1912 345600",
      packageId: "pkg-3",
      parentResellerId: "res-4",
      parentRole: UserRole.DEALER,
      balance: 3500,
      status: "active",
      expiryDate: "2026-06-25T23:59:59Z",
      address: "Apartment C4, Road 14, Mirpur-10, Dhaka",
      ipAddress: "103.45.15.44",
      macAddress: "FC:AA:14:23:CD:12",
      createdAt: "2025-03-15T11:00:00Z"
    },
    {
      id: "cust-4",
      username: "sec11_subscriber",
      fullName: "Sultana Jahan",
      email: "sultana.j@hotmail.com",
      phone: "+880 1515 990011",
      packageId: "pkg-2",
      parentResellerId: "res-6",
      parentRole: UserRole.SUB_DEALER,
      balance: 0,
      status: "suspended",
      expiryDate: "2026-05-10T23:59:59Z",
      address: "House 10, Line B, Section 11, Mirpur, Dhaka",
      ipAddress: "103.45.15.98",
      macAddress: "94:10:3B:AA:22:11",
      createdAt: "2025-04-12T15:20:00Z"
    },
    {
      id: "cust-5",
      username: "alpha_direct_client",
      fullName: "Imran Siddiq",
      email: "imran_siddiq@gmail.com",
      phone: "+92 300 8765432",
      packageId: "pkg-4",
      parentResellerId: "res-1",
      parentRole: UserRole.FRANCHISE,
      balance: 6000,
      status: "active",
      expiryDate: "2026-07-01T23:59:59Z",
      address: "Commercial Office Block B, Lahore",
      ipAddress: "103.45.12.12",
      macAddress: "24:E3:44:11:55:92",
      createdAt: "2025-01-20T09:12:00Z"
    }
  ],
  invoices: [
    {
      id: "inv-1001",
      customerId: "cust-1",
      customerName: "Zahid Ahmed Shah",
      amount: 3500,
      billingDate: "2026-05-30T12:00:00Z",
      expiryDate: "2026-06-30T23:59:59Z",
      status: "paid",
      packageName: "Gold 50M",
      resellerId: "res-3",
      paymentMethod: "JazzCash",
      paidAt: "2026-05-30T14:22:00Z"
    },
    {
      id: "inv-1002",
      customerId: "cust-2",
      customerName: "Bilal Siddiqui",
      amount: 1200,
      billingDate: "2026-05-15T10:00:00Z",
      expiryDate: "2026-06-15T23:59:59Z",
      status: "paid",
      packageName: "Bronze 10M",
      resellerId: "res-5",
      paymentMethod: "Cash",
      paidAt: "2026-05-15T11:45:00Z"
    },
    {
      id: "inv-1003",
      customerId: "cust-3",
      customerName: "Naimur Rahman",
      amount: 3500,
      billingDate: "2026-05-25T11:00:00Z",
      expiryDate: "2026-06-25T23:59:59Z",
      status: "paid",
      packageName: "Gold 50M",
      resellerId: "res-4",
      paymentMethod: "bKash",
      paidAt: "2026-05-25T11:05:00Z"
    },
    {
      id: "inv-1004",
      customerId: "cust-4",
      customerName: "Sultana Jahan",
      amount: 2000,
      billingDate: "2026-05-10T15:20:00Z",
      expiryDate: "2026-06-10T23:59:59Z",
      status: "unpaid",
      packageName: "Silver 25M",
      resellerId: "res-6"
    },
    {
      id: "inv-1005",
      customerId: "cust-5",
      customerName: "Imran Siddiq",
      amount: 6000,
      billingDate: "2026-06-01T00:00:00Z",
      expiryDate: "2026-07-01T23:59:59Z",
      status: "unpaid",
      packageName: "Platinum 100M",
      resellerId: "res-1"
    }
  ],
  walletTransactions: [
    {
      id: "tx-201",
      fromId: "admin",
      fromName: "System Super Admin",
      toId: "res-1",
      toName: "Alpha Broadband Franchise",
      amount: 250000,
      type: "transfer",
      timestamp: "2026-05-01T10:00:00Z",
      notes: "Main wallet credit recharge for May operations"
    },
    {
      id: "tx-202",
      fromId: "admin",
      fromName: "System Super Admin",
      toId: "res-2",
      toName: "OmniNet Reseller Group",
      amount: 150000,
      type: "transfer",
      timestamp: "2026-05-02T11:30:00Z",
      notes: "Monthly bandwidth quota allocation topup"
    },
    {
      id: "tx-203",
      fromId: "res-1",
      fromName: "Alpha Broadband Franchise",
      toId: "res-3",
      toName: "Saddar Area Cable Dealer",
      amount: 50000,
      type: "transfer",
      timestamp: "2026-05-05T14:00:00Z",
      notes: "Dealer balance provisioning"
    },
    {
      id: "tx-204",
      fromId: "res-3",
      fromName: "Saddar Area Cable Dealer",
      toId: "res-5",
      toName: "Lane 4 MicroNet",
      amount: 10000,
      type: "transfer",
      timestamp: "2026-05-07T16:20:00Z",
      notes: "Emergency balance replenish"
    }
  ],
  hrmStaff: [
    { id: "st-1", name: "Sikandar Shah", email: "sikandar@nexus.net", phone: "+92 300 1112233", role: "manager", salary: 75000, hiredAt: "2025-01-01T00:00:00Z", status: "active", levelId: "admin", levelRole: UserRole.ADMIN },
    { id: "st-2", name: "Tanveer Elahi", email: "tanveer@nexus.net", phone: "+92 321 4443322", role: "technician", salary: 45000, hiredAt: "2025-02-01T00:00:00Z", status: "active", levelId: "admin", levelRole: UserRole.ADMIN },
    { id: "st-3", name: "Aria Ahmed", email: "aria.admin@nexus.net", phone: "+92 333 5556677", role: "support_agent", salary: 35000, hiredAt: "2025-03-01T00:00:00Z", status: "active", levelId: "admin", levelRole: UserRole.ADMIN },
    { id: "st-4", name: "Sajid Baloch", email: "sajid@alpha.net", phone: "+92 312 3334445", role: "technician", salary: 38000, hiredAt: "2025-02-10T00:00:00Z", status: "active", levelId: "res-1", levelRole: UserRole.FRANCHISE },
    { id: "st-5", name: "Maria Khan", email: "maria@alpha.net", phone: "+92 345 5551112", role: "support_agent", salary: 28000, hiredAt: "2025-03-15T00:00:00Z", status: "active", levelId: "res-1", levelRole: UserRole.FRANCHISE },
    { id: "st-6", name: "Yasin Patel", email: "yasin@saddar-isp.net", phone: "+92 302 7776655", role: "line_man", salary: 22000, hiredAt: "2025-04-01T00:00:00Z", status: "active", levelId: "res-3", levelRole: UserRole.DEALER },
    { id: "st-7", name: "Waqas Alam", email: "waqas@lan4.net", phone: "+92 332 1119998", role: "line_man", salary: 18000, hiredAt: "2025-04-20T00:00:00Z", status: "active", levelId: "res-5", levelRole: UserRole.SUB_DEALER }
  ],
  attendance: [
    { id: "att-1", staffId: "st-1", staffName: "Sikandar Shah", date: "2026-05-31", checkIn: "08:52:12", checkOut: "17:05:44", status: "present" },
    { id: "att-2", staffId: "st-2", staffName: "Tanveer Elahi", date: "2026-05-31", checkIn: "09:12:00", checkOut: "18:00:15", status: "present" },
    { id: "att-3", staffId: "st-3", staffName: "Aria Ahmed", date: "2026-05-31", checkIn: "08:30:22", checkOut: "16:30:00", status: "present" },
    { id: "att-4", staffId: "st-4", staffName: "Sajid Baloch", date: "2026-05-31", checkIn: "09:05:00", checkOut: "17:15:30", status: "present" },
    { id: "att-5", staffId: "st-5", staffName: "Maria Khan", date: "2026-05-31", checkIn: "08:58:30", status: "present" },
    { id: "att-6", staffId: "st-6", staffName: "Yasin Patel", date: "2026-05-31", checkIn: "09:30:00", checkOut: "16:00:00", status: "late" },
    { id: "att-7", staffId: "st-7", staffName: "Waqas Alam", date: "2026-05-31", status: "absent" }
  ],
  payroll: [
    { id: "pay-1", staffId: "st-1", staffName: "Sikandar Shah", month: "2026-05", baseSalary: 75000, bonus: 5000, deduction: 0, netPaid: 80000, paidAt: "2026-05-28T10:00:00Z", status: "paid" },
    { id: "pay-2", staffId: "st-2", staffName: "Tanveer Elahi", month: "2026-05", baseSalary: 45000, bonus: 2000, deduction: 500, netPaid: 46500, paidAt: "2026-05-28T10:15:00Z", status: "paid" },
    { id: "pay-3", staffId: "st-3", staffName: "Aria Ahmed", month: "2026-05", baseSalary: 35000, bonus: 0, deduction: 0, netPaid: 35000, paidAt: "2026-05-28T10:30:00Z", status: "paid" },
    { id: "pay-4", staffId: "st-4", staffName: "Sajid Baloch", month: "2026-05", baseSalary: 38000, bonus: 1500, deduction: 800, netPaid: 38700, paidAt: "2026-05-29T11:00:00Z", status: "paid" },
    { id: "pay-5", staffId: "st-5", staffName: "Maria Khan", month: "2026-05", baseSalary: 28000, bonus: 0, deduction: 0, netPaid: 28000, paidAt: "2026-05-29T11:30:00Z", status: "paid" },
    { id: "pay-6", staffId: "st-6", staffName: "Yasin Patel", month: "2026-05", baseSalary: 22000, bonus: 0, deduction: 1000, netPaid: 21005, status: "draft" },
    { id: "pay-7", staffId: "st-7", staffName: "Waqas Alam", month: "2026-05", baseSalary: 18000, bonus: 500, deduction: 1500, netPaid: 17000, status: "draft" }
  ],
  tickets: [
    {
      id: "tkt-501",
      customerId: "cust-1",
      customerName: "Zahid Ahmed Shah",
      title: "Router frequent disconnects",
      description: "My PPPoE session drops every 30 minutes. LAN light on modern remains orange. Please check fiber splicing.",
      priority: "high",
      status: "in_progress",
      assignedStaffId: "st-4",
      assignedStaffName: "Sajid Baloch",
      createdAt: "2026-05-30T09:00:00Z",
      updatedAt: "2026-05-31T11:00:00Z"
    },
    {
      id: "tkt-502",
      customerId: "cust-4",
      customerName: "Sultana Jahan",
      title: "Account suspended warning",
      description: "My connection says suspended on the landing page, but I made payment via offline agent Hasan on Section 11.",
      priority: "medium",
      status: "open",
      createdAt: "2026-05-31T08:15:00Z",
      updatedAt: "2026-05-31T18:12:00Z"
    },
    {
      id: "tkt-503",
      customerId: "cust-3",
      customerName: "Naimur Rahman",
      title: "Need static IP for gaming port",
      description: "Requesting static public IP lease for port forwarding. Ready to pay additional fee if required.",
      priority: "low",
      status: "resolved",
      assignedStaffId: "st-5",
      assignedStaffName: "Maria Khan",
      createdAt: "2026-05-28T16:00:00Z",
      updatedAt: "2026-05-29T10:00:00Z"
    }
  ],
  bandwidthLogs: [
    { timestamp: "18:00:00", rxMbps: 345, txMbps: 789, activeSessions: 914 },
    { timestamp: "18:02:00", rxMbps: 350, txMbps: 802, activeSessions: 917 },
    { timestamp: "18:04:00", rxMbps: 368, txMbps: 844, activeSessions: 921 },
    { timestamp: "18:06:00", rxMbps: 320, txMbps: 790, activeSessions: 911 },
    { timestamp: "18:08:00", rxMbps: 340, txMbps: 815, activeSessions: 915 },
    { timestamp: "18:10:00", rxMbps: 395, txMbps: 910, activeSessions: 932 },
    { timestamp: "18:12:00", rxMbps: 412, txMbps: 930, activeSessions: 940 }
  ],
  activityLogs: [
    { id: "act-1", datetime: "2026-05-31T18:00:00Z", adminId: "admin", activity: "Authorized Alpha Franchise credit recharge", stationIp: "192.168.1.100" },
    { id: "act-2", datetime: "2026-05-31T18:30:00Z", adminId: "admin", activity: "Created speed profile Bronze 10M", stationIp: "192.168.1.100" },
    { id: "act-3", datetime: "2026-05-31T19:00:00Z", adminId: "res-1", activity: "Activated subscriber line zahid_fiber_home", stationIp: "182.16.8.5" }
  ],
  cashflowCategories: [
    { id: "cat-1", name: "Upstream Bandwidth Fee", description: "BGP transit fees paid to premium telecommunication providers", type: "expense" },
    { id: "cat-2", name: "Office Rent", description: "Saddar main NOC data center rent", type: "expense" },
    { id: "cat-3", name: "Corporate Franchise Earnings", description: "Inbound payments from large scale franchisee sign-ups", type: "income" },
    { id: "cat-4", name: "NOC Staff Overhead", description: "Salaries and line-man emergency expense audits", type: "expense" }
  ],
  cashflow: [
    { id: "cf-1", date: "2026-05-25T10:00:00Z", type: "expense", categoryId: "cat-1", amount: 45000, description: "Monthly BGP fiber bandwidth ring fee to PTCL / BT", addedBy: "admin" },
    { id: "cf-2", date: "2026-05-27T12:00:00Z", type: "income", categoryId: "cat-3", amount: 250000, description: "Main franchisee setup charges - Alpha Broadband Franchise", addedBy: "admin", franchiseId: "res-1" },
    { id: "cf-3", date: "2026-05-29T14:30:00Z", type: "expense", categoryId: "cat-2", amount: 35000, description: "Rent adjustment for MIRPUR block distribution office", addedBy: "admin" }
  ],
  radiusSessions: [
    { radacctId: "rs-1", acctSessionId: "sess-99120", username: "zahid_fiber_home", nasIpAddress: "103.45.12.1", acctStartTime: "2026-05-31T12:00:00Z", acctStopTime: "2026-05-31T18:00:00Z", acctSessionTime: 21600, acctInputOctets: 4502394012, acctOutputOctets: 8123049120, callingStationId: "B4:F2:E8:11:AA:FF", framedIpAddress: "103.45.12.89" },
    { radacctId: "rs-2", acctSessionId: "sess-99121", username: "sub_user_lan4", nasIpAddress: "103.45.15.5", acctStartTime: "2026-05-31T15:00:00Z", acctSessionTime: 10800, acctInputOctets: 1204910293, acctOutputOctets: 3401928301, callingStationId: "D8:C4:4E:EF:88:55", framedIpAddress: "103.45.12.181" }
  ],
  policies: [
    {
      id: "pol-1",
      name: "Standard FUP Fair Usage Limit",
      type: "fup",
      status: "active",
      description: "Automated speed decrease rule on PPPoE customer line once customer downloads exceed 500GB volume during a billing period.",
      speedTriggerMbps: 2,
      quotaThresholdGb: 500,
      policyAction: "Reduce subscriber bandwidth to 2 Mbps",
      appliedLinesCount: 142
    },
    {
      id: "pol-2",
      name: "Night Speed Booster Tunnel",
      type: "scheduler",
      status: "active",
      description: "Automated speed burst multiplier designed to boost low tier packages starting 2:00 AM till 8:00 AM every night.",
      startTime: "02:00:00",
      endTime: "08:00:00",
      policyAction: "Double speed profile parameters",
      appliedLinesCount: 419
    },
    {
      id: "pol-3",
      name: "Unpaid Intercept Web Portal Redirect",
      type: "restrict",
      status: "active",
      description: "Walled Garden network redirection forcing expired or un-billed customer routers to landing portal advising bill pay options.",
      policyAction: "Intercept and display billing warning page",
      appliedLinesCount: 88
    },
    {
      id: "pol-4",
      name: "Burst Booster Turbo Mode",
      type: "burst",
      status: "inactive",
      description: "Configures MikroTik Address List Queue parameters giving 50 Mbps burst speed boost for first 15 seconds of any new HTTP connection.",
      burstLimitMbps: 50,
      burstTimeSeconds: 15,
      policyAction: "Activate 50M Burst Queue Limit Rule",
      appliedLinesCount: 0
    }
  ]
};

// CamelCase <-> SnakeCase Mapper Helpers
export function camelToSnake(obj: any): any {
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
      newObj[snakeKey] = camelToSnake(obj[key]);
    }
    return newObj;
  }
  return obj;
}

export function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      newObj[camelKey] = snakeToCamel(obj[key]);
    }
    return newObj;
  }
  return obj;
}

// Lazy loaded PostgreSQL connection manager
let pool: any = null;

export function getPool() {
  if (pool !== null) return pool;

  const hasPgConfig = process.env.DATABASE_URL || (process.env.PGHOST && process.env.PGUSER);
  if (hasPgConfig) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
        ssl: process.env.PGSSL === 'true' || process.env.DATABASE_URL?.includes('sslmode=') ? { rejectUnauthorized: false } : undefined
      });
      console.log("PostgreSQL connectivity pool established successfully for Nexus Hub.");
    } catch (err) {
      console.error("Failed to initialize PostgreSQL pool connection.", err);
      pool = null;
    }
  }
  return pool;
}

// Table schema translations
const TABLE_MAPPINGS: Record<keyof DatabaseSchema, string> = {
  admins: 'admins',
  packages: 'packages',
  routers: 'routers',
  resellers: 'resellers',
  customers: 'customers',
  invoices: 'invoices',
  walletTransactions: 'wallet_transactions',
  hrmStaff: 'hrm_staff',
  attendance: 'attendance',
  payroll: 'payroll',
  tickets: 'tickets',
  bandwidthLogs: 'bandwidth_logs',
  activityLogs: 'activity_logs',
  cashflowCategories: 'cashflow_categories',
  cashflow: 'cashflow',
  radiusSessions: 'radius_sessions',
  policies: 'policies'
};

// Generic table sync helper to PostgreSQL
async function syncCollectionToPostgres(pgClient: any, schemaKey: keyof DatabaseSchema, items: any[]) {
  const tableName = TABLE_MAPPINGS[schemaKey];
  if (!tableName) return;

  let processedItems = items;
  if (schemaKey === 'policies') {
    processedItems = items.map(p => ({
      ...p,
      attributes: p.attributes ? JSON.stringify(p.attributes) : null
    }));
  }

  if (schemaKey === 'bandwidthLogs') {
    // Truncate and rebuild time series list since standard records don't have stable PK IDs
    await pgClient.query(`TRUNCATE TABLE bandwidth_logs`);
    for (const log of items) {
      const snakeLog = camelToSnake(log);
      await pgClient.query(
        `INSERT INTO bandwidth_logs (timestamp, rx_mbps, tx_mbps, active_sessions) VALUES ($1, $2, $3, $4)`,
        [snakeLog.timestamp, snakeLog.rx_mbps, snakeLog.tx_mbps, snakeLog.active_sessions]
      );
    }
    return;
  }

  if (schemaKey === 'activityLogs') {
    await pgClient.query(`TRUNCATE TABLE activity_logs CASCADE`);
    for (const log of items) {
      const snakeLog = camelToSnake(log);
      await pgClient.query(
        `INSERT INTO activity_logs (datetime, admin_id, activity, user_id, station_ip) VALUES ($1, $2, $3, $4, $5)`,
        [snakeLog.datetime, snakeLog.admin_id, snakeLog.activity, snakeLog.user_id, snakeLog.station_ip]
      );
    }
    return;
  }

  if (schemaKey === 'cashflowCategories') {
    await pgClient.query(`TRUNCATE TABLE cashflow_categories CASCADE`);
    for (const cat of items) {
      const snakeCat = camelToSnake(cat);
      const cleanId = parseInt(snakeCat.id.replace(/\D/g, ''), 10) || 1;
      await pgClient.query(
        `INSERT INTO cashflow_categories (id, name, description, type) VALUES ($1, $2, $3, $4)`,
        [cleanId, snakeCat.name, snakeCat.description, snakeCat.type]
      );
    }
    return;
  }

  if (schemaKey === 'cashflow') {
    await pgClient.query(`TRUNCATE TABLE cashflow CASCADE`);
    for (const flow of items) {
      const snakeFlow = camelToSnake(flow);
      const cleanId = parseInt(snakeFlow.id.replace(/\D/g, ''), 10) || 1;
      const cleanCatId = parseInt(snakeFlow.category_id.toString().replace(/\D/g, ''), 10) || 1;
      await pgClient.query(
        `INSERT INTO cashflow (id, date, type, category_id, amount, description, user_id, admin_id, added_by, franchise_id, dealer_id, subdealer_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          cleanId,
          snakeFlow.date,
          snakeFlow.type,
          cleanCatId,
          snakeFlow.amount,
          snakeFlow.description,
          snakeFlow.user_id,
          snakeFlow.admin_id,
          snakeFlow.added_by,
          snakeFlow.franchise_id,
          snakeFlow.dealer_id,
          snakeFlow.subdealer_id
        ]
      );
    }
    return;
  }

  if (schemaKey === 'radiusSessions') {
    await pgClient.query(`TRUNCATE TABLE radius_sessions CASCADE`);
    for (const sess of items) {
      const snakeSess = camelToSnake(sess);
      await pgClient.query(
        `INSERT INTO radius_sessions (acct_session_id, username, nas_ip_address, acct_start_time, acct_stop_time, acct_session_time, acct_input_octets, acct_output_octets, calling_station_id, framed_ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          snakeSess.acct_session_id,
          snakeSess.username,
          snakeSess.nas_ip_address,
          snakeSess.acct_start_time,
          snakeSess.acct_stop_time,
          snakeSess.acct_session_time,
          snakeSess.acct_input_octets,
          snakeSess.acct_output_octets,
          snakeSess.calling_station_id,
          snakeSess.framed_ip_address
        ]
      );
    }
    return;
  }

  if (processedItems.length === 0) {
    await pgClient.query(`DELETE FROM ${tableName}`);
    return;
  }

  const itemsSnake = processedItems.map(item => camelToSnake(item));
  const columns = Object.keys(itemsSnake[0]);

  // Read current active IDs from live database to detect deletions
  const dbRes = await pgClient.query(`SELECT id FROM ${tableName}`);
  const dbIds = dbRes.rows.map((row: any) => row.id);
  const localIds = itemsSnake.map(item => item.id);

  // Synchronize new/modified components
  for (const item of itemsSnake) {
    const params: any[] = [];
    const colNames: string[] = [];
    const placeholders: string[] = [];
    const updates: string[] = [];

    let index = 1;
    for (const col of columns) {
      colNames.push(col);
      placeholders.push(`$${index}`);
      if (col !== 'id') {
        updates.push(`${col} = EXCLUDED.${col}`);
      }
      params.push(item[col] === undefined ? null : item[col]);
      index++;
    }

    const query = `
      INSERT INTO ${tableName} (${colNames.join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (id)
      DO UPDATE SET ${updates.join(', ')}
    `;
    await pgClient.query(query, params);
  }

  // Clear obsolete elements deleted on client workspace
  const idsToDelete = dbIds.filter((id: any) => !localIds.includes(id));
  for (const deleteId of idsToDelete) {
    await pgClient.query(`DELETE FROM ${tableName} WHERE id = $1`, [deleteId]);
  }
}

// Single-Source Database class supporting active Postgres operations or local fallback
export class FileDB {
  private fileLock = false;

  private readLocal(): DatabaseSchema {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const fileContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
        return JSON.parse(fileContent) as DatabaseSchema;
      }
    } catch (e) {
      console.error("Local JSON state corrupted, fallback resetting...", e);
    }
    this.writeLocal(INITIAL_DB);
    return INITIAL_DB;
  }

  private writeLocal(data: DatabaseSchema) {
    if (this.fileLock) return;
    this.fileLock = true;
    try {
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error("Failed persisting JSON fallback changes.", e);
    } finally {
      this.fileLock = false;
    }
  }

  private async readPostgres(poolClient: any): Promise<DatabaseSchema> {
    const schema: any = {};
    try {
      schema.admins = snakeToCamel((await poolClient.query(`SELECT * FROM admins`)).rows);
      schema.packages = snakeToCamel((await poolClient.query(`SELECT * FROM packages`)).rows);
      schema.routers = snakeToCamel((await poolClient.query(`SELECT * FROM routers`)).rows);
      schema.resellers = snakeToCamel((await poolClient.query(`SELECT * FROM resellers`)).rows);
      schema.customers = snakeToCamel((await poolClient.query(`SELECT * FROM customers`)).rows);
      schema.invoices = snakeToCamel((await poolClient.query(`SELECT * FROM invoices`)).rows);
      schema.walletTransactions = snakeToCamel((await poolClient.query(`SELECT * FROM wallet_transactions`)).rows);
      schema.hrmStaff = snakeToCamel((await poolClient.query(`SELECT * FROM hrm_staff`)).rows);
      schema.attendance = snakeToCamel((await poolClient.query(`SELECT * FROM attendance`)).rows);
      schema.payroll = snakeToCamel((await poolClient.query(`SELECT * FROM payroll`)).rows);
      schema.tickets = snakeToCamel((await poolClient.query(`SELECT * FROM tickets`)).rows);
      schema.bandwidthLogs = snakeToCamel((await poolClient.query(`SELECT * FROM bandwidth_logs ORDER BY id ASC`)).rows);
      schema.activityLogs = snakeToCamel((await poolClient.query(`SELECT * FROM activity_logs ORDER BY id ASC`)).rows).map((row: any) => ({ ...row, id: String(row.id) }));
      schema.cashflowCategories = snakeToCamel((await poolClient.query(`SELECT * FROM cashflow_categories ORDER BY id ASC`)).rows).map((row: any) => ({ ...row, id: `cat-${row.id}` }));
      schema.cashflow = snakeToCamel((await poolClient.query(`SELECT * FROM cashflow ORDER BY id ASC`)).rows).map((row: any) => ({ ...row, id: `cf-${row.id}`, categoryId: `cat-${row.categoryId}` }));
      schema.radiusSessions = snakeToCamel((await poolClient.query(`SELECT * FROM radius_sessions ORDER BY radacct_id ASC`)).rows).map((row: any) => ({ ...row, radacctId: String(row.radacctId) }));
      schema.policies = snakeToCamel((await poolClient.query(`SELECT * FROM policies ORDER BY id ASC`)).rows).map((row: any) => {
        if (typeof row.attributes === 'string') {
          try {
            row.attributes = JSON.parse(row.attributes);
          } catch (e) {
            row.attributes = [];
          }
        }
        return row;
      });
    } catch (err) {
      console.error("Failed querying PostgreSQL tables. Schema mismatch or seed needed. Reverting to local store telemetry.", err);
      return this.readLocal();
    }
    return schema as DatabaseSchema;
  }

  // Asynchronous fetcher matching backend routes querying interface
  async get(): Promise<DatabaseSchema> {
    const pgPool = getPool();
    if (pgPool) {
      const client = await pgPool.connect();
      try {
        return await this.readPostgres(client);
      } finally {
        client.release();
      }
    }
    return this.readLocal();
  }

  // Update specific key collections asynchronously
  async update<K extends keyof DatabaseSchema>(key: K, callback: (arg: DatabaseSchema[K]) => DatabaseSchema[K]): Promise<void> {
    const pgPool = getPool();
    if (pgPool) {
      const client = await pgPool.connect();
      try {
        const schema = await this.readPostgres(client);
        schema[key] = callback(schema[key]);
        
        // Save local JSON backup
        this.writeLocal(schema);
        
        // Sync modified key to Postgres live
        await syncCollectionToPostgres(client, key, schema[key]);
        return;
      } finally {
        client.release();
      }
    }

    const localData = this.readLocal();
    localData[key] = callback(localData[key]);
    this.writeLocal(localData);
  }

  // Transaction orchestration wrapper committing updates completely
  async transaction(callback: (db: DatabaseSchema) => void): Promise<void> {
    const pgPool = getPool();
    if (pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const schema = await this.readPostgres(client);
        callback(schema);
        
        // Commit changes to local file
        this.writeLocal(schema);

        // Sync every known dataset collection back to database
        const keys = Object.keys(TABLE_MAPPINGS) as Array<keyof DatabaseSchema>;
        for (const key of keys) {
          await syncCollectionToPostgres(client, key, schema[key]);
        }

        await client.query('COMMIT');
        return;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error("PostgreSQL Transaction aborted.", err);
        throw err;
      } finally {
        client.release();
      }
    }

    const localData = this.readLocal();
    callback(localData);
    this.writeLocal(localData);
  }
}

export const dbInstance = new FileDB();
