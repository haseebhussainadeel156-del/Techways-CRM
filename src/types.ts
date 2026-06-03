/**
 * Definition of types for the Nexus ISP Management Platform.
 * Covers user roles, billing, packages, routers, transaction ledgers,
 * and multi-level HRM structures.
 */

export enum UserRole {
  ADMIN = "admin",
  FRANCHISE = "franchise",
  DEALER = "dealer",
  SUB_DEALER = "sub_dealer",
  CUSTOMER = "customer",
  HRM_STAFF = "hrm_staff"
}

export type AccountStatus = "active" | "suspended" | "expired" | "pending";

export interface AdminUser {
  id: string;
  username: string; // e.g. admin
  email: string; // admin@nexus.net
  passwordHash?: string;
  name: string; // Super Admin
}

// ISP Packages that can be assigned to customers
export interface BandwidthPackage {
  id: string;
  name: string;
  description?: string;
  type?: "pppoe" | "hotspot" | "static"; // Optional for backward-compat
  
  // Real Nexus-specific schema additions
  policy?: string; // Required in nexus: 'Policy *'
  invoiceDescription?: string; // Automated text prefix printed on invoices
  billingType?: "prepaid" | "postpaid"; // Billing Type, e.g., 'Prepaid (*)'
  price?: number; // Core package price
  profit?: number;
  
  extraFeeType?: "percentage" | "fixed";
  extraFeeValue?: number; // OTC / Installation overhead charges
  
  vatType?: "percentage" | "fixed";
  vatValue?: number; // Sales tax ratio
  
  autoRenew?: boolean; // Auto Renew
  autoPayment?: boolean; // Auto Payment
  
  pool?: string; // MikroTik Assigned DHCP/Tunnel Pool name block
  expirePool?: string; // MikroTik expired user low-speed Pool name block
  
  duration?: number; // Days/hours active life
  durationType?: "months" | "days" | "hours" | "years";
  
  fixedExpiryDayEnabled?: boolean;
  fixedExpiryDay?: number;
  
  fixedExpiryAccounting?: "off" | "daily" | "hourly";
  
  fixedExpiryTimeEnabled?: boolean;
  fixedExpiryTime?: string;
  
  addRemainingDays?: boolean;
  
  bandwidth?: number; // E.g. 10
  bandwidthUnit?: "MB" | "GB" | "KB"; // E.g. MB (*)
  
  bandwidthAllocationByTime?: boolean;
  
  addRemainingVolumes?: boolean;
  
  dataQuotaEnabled?: boolean;
  dataQuotaVolume?: number; // in GB often
  dataQuotaExceedAction?: "disconnect" | "fup_limit";
  
  fupQuotaEnabled?: boolean;
  fupQuotaVolume?: number;
  fupQuotaLimit?: string; // Ex: 1M/1M
  
  addRemainingSession?: boolean;
  
  sessionQuotaEnabled?: boolean;
  sessionQuotaTime?: number; // in some unit (minutes/hours?)
  sessionQuotaExceedAction?: "disconnect" | "fup_limit";
  
  sessionFupLimitEnabled?: boolean;
  sessionFupLimit?: string;
  
  allowSelfActivation?: boolean;
  applyToUsers?: boolean;
  applySettingsResellers?: boolean;
  
  // Backwards compatibility legacy fields:
  speedMbps?: number; 
  priceMonthly?: number; 
  groupName?: string; 
  volumeGb?: number; 
  qtEnabled?: boolean; 
  vat?: number; 
  extraFee?: number; 
}

// Router representation (equivalent to MikroTik devices managed by the system)
export interface RouterOS {
  id: string;
  name: string;
  ipAddress: string;
  status: "online" | "offline" | "error";
  cpuUsage: number; // in %
  memoryUsage: number; // in %
  uptime: string;
  activeUsers: number;
  apiPort?: number;
  username?: string;
  password?: string;
  secret?: string;
  location?: string;
}

// Relational Reseller details showing parent-child links in the hierarchy
export interface ResellerNode {
  id: string;
  name: string;
  ownerName: string;
  role: UserRole.FRANCHISE | UserRole.DEALER | UserRole.SUB_DEALER;
  parentResellerId?: string; // Franchise has none (parent is Admin), Dealer has Franchise, Sub-dealer has Dealer
  balance: number; // Wallet balance to buy packages for sub-users
  phoneNumber: string;
  email: string;
  passwordHash?: string; // Credentials encryption
  status: AccountStatus;
  userCount: number;
  location: string;
  createdAt: string;
  allowedPackages?: string[];
  packageRates?: Record<string, number>;
  customerPackageRates?: Record<string, number>;
}

// Customer Subscriber representation
export interface CustomerSubscriber {
  id: string;
  username: string; // PPPoE login username
  fullName: string;
  email: string;
  passwordHash?: string;
  phone: string;
  packageId: string;
  parentResellerId: string; // The reseller that owns/bills this customer (can be Dealer, Sub-dealer, etc.)
  parentRole: UserRole; // Sub-dealer/Dealer/Franchise/Admin
  balance: number; // Customer local advance balance
  status: AccountStatus;
  expiryDate: string; // ISO date string
  address: string;
  ipAddress?: string; // Assigned pool IP
  macAddress?: string; // Locked MAC Address
  createdAt: string;
  customPrice?: number; // Custom monthly tariff allocated to this customer
}

// Billing / Invoice Transaction Ledger
export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  billingDate: string;
  expiryDate: string;
  status: "paid" | "unpaid" | "overdue" | "cancelled";
  packageName: string;
  resellerId: string; // Credit goes to this reseller
  paymentMethod?: string; // Credit card, cash, BKash, JazzCash, Easypaisa, etc.
  paidAt?: string;
}

// Reseller Wallet Ledger (Credit history)
export interface WalletTransaction {
  id: string;
  fromId: string; // "admin" or sender reseller ID
  fromName: string;
  toId: string; // recipient reseller ID
  toName: string;
  amount: number;
  type: "transfer" | "purchase" | "refund" | "recharge";
  timestamp: string;
  notes?: string;
}

// ==========================================
// HRM (Human Resource Management) SCHEMAS
// ==========================================

export type StaffRole = "technician" | "support_agent" | "accountant" | "manager" | "line_man";

export interface HrmStaff {
  id: string;
  name: string;
  email: string;
  passwordHash?: string; // Credentials encryption
  phone: string;
  role: StaffRole;
  salary: number; // base salary
  hiredAt: string;
  status: "active" | "on_leave" | "terminated";
  levelId: string; // The ID of the organization that owns this employee (e.g. "admin", or a specific franchise/dealer ID)
  levelRole: UserRole; // To keep staff scoped strictly to their admin workspace (Admin, Franchise, Dealer, Sub-dealer)
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM:SS
  checkOut?: string; // HH:MM:SS
  status: "present" | "absent" | "leave" | "late";
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  staffName: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  deduction: number;
  netPaid: number;
  paidAt?: string; // if undefined, payroll is draft
  status: "draft" | "paid";
}

export interface SupportTicket {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedStaffId?: string;
  assignedStaffName?: string;
  createdAt: string;
  updatedAt: string;
}

// Real-time Traffic Snapshot
export interface BandwidthDataPoint {
  timestamp: string; // HH:MM:SS
  rxMbps: number; // Received speed
  txMbps: number; // Transmitted speed
  activeSessions: number;
}

// Activity Audit Log (admin action stream)
export interface ActivityLog {
  id: string;
  datetime: string;
  adminId: string;
  activity: string;
  userId?: string;
  stationIp: string;
}

// Accounting cash-flow categories (office overhead types)
export interface CashflowCategory {
  id: string;
  name: string;
  description?: string;
  type: "income" | "expense";
}

// Accounting flow log entries (cash in/out ledger)
export interface CashflowEntry {
  id: string;
  date: string;
  type: "income" | "expense";
  categoryId: string; // Referenced Category ID
  amount: number;
  description?: string;
  userId?: string;
  adminId?: string;
  addedBy: string;
  franchiseId?: string;
  dealerId?: string;
  subdealerId?: string;
}

// Core Radius tunnels lease accounting logger (radacct)
export interface RadiusSession {
  radacctId: string;
  acctSessionId: string;
  username: string;
  nasIpAddress: string;
  acctStartTime: string;
  acctStopTime?: string;
  acctSessionTime?: number; // duration in seconds
  acctInputOctets?: number; // total bytes downloaded
  acctOutputOctets?: number; // total bytes uploaded
  callingStationId?: string; // Client MAC-Address lock
  framedIpAddress?: string; // Assigned pool IP
}

// Nexus Bandwidth / Routing / FUP / Time-Based Policy Module Types
export interface PolicyAttribute {
  id: string;
  name: string; // e.g. "Mikrotik-Rate-Limit"
  op: string;   // e.g. ":="
  type: string; // e.g. "Reply" or "Check"
  value: string;
}

export interface IspPolicy {
  id: string;
  name: string;
  type: "fup" | "burst" | "scheduler" | "restrict" | "radius_group";
  status: "active" | "inactive";
  description: string;
  speedTriggerMbps?: number;
  quotaThresholdGb?: number;
  burstLimitMbps?: number;
  burstTimeSeconds?: number;
  startTime?: string;
  endTime?: string;
  policyAction?: string;
  appliedLinesCount?: number;
  
  // RADIUS Attribute Profile Group builder elements
  groupName?: string;
  attributes?: PolicyAttribute[];
}

// ----------------------------------------------------
// SaaS Platform Types (Data Isolation & Billing)
// ----------------------------------------------------

export interface TenantSubscription {
  id: string; // Tenant ID
  companyName: string; // Name of the ISP
  planId: string; // Stripe Price ID or internal plan code
  status: "active" | "past_due" | "canceled" | "trialing";
  currentPeriodEnd: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  maxRouters: number;
  maxUsers: number;
}


