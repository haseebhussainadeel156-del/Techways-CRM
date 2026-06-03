-- ============================================================================
-- NEXUS HUB V3 - POSTGRESQL DATABASE DUMP / INITIALIZATION SCHEMA
-- Purpose: Schema DDL definitions and complete seed dataset to test locally.
-- Target Database: PostgreSQL 12+
-- ============================================================================

-- Drop tables if they exist to facilitate fresh rebuilds (Postgres foreign key-aware drop order)
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS payroll CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS hrm_staff CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS resellers CASCADE;
DROP TABLE IF EXISTS routers CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS bandwidth_logs CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- ============================================================================
-- 0. ADMINS TABLE (Administrative accounts)
-- ============================================================================
CREATE TABLE admins (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(120) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 1. PACKAGES TABLE (Bandwidth Packages)
-- ============================================================================
CREATE TABLE packages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    speed_mbps INTEGER NOT NULL,
    price_monthly NUMERIC(12, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('pppoe', 'hotspot', 'static')),
    description TEXT,
    
    -- Extended Nexus Fields
    group_name VARCHAR(100),
    duration INTEGER DEFAULT 30,
    duration_type VARCHAR(20) DEFAULT 'days',
    volume_gb INTEGER DEFAULT 0,
    pool VARCHAR(100),
    expire_pool VARCHAR(100),
    qt_enabled BOOLEAN DEFAULT FALSE,
    vat NUMERIC(5, 2) DEFAULT 0,
    extra_fee NUMERIC(12, 2) DEFAULT 0,
    invoice_description TEXT
);

-- ============================================================================
-- 1.5. POLICIES TABLE (Nexus Core ISP Routing, FUP & Queue Policies)
-- ============================================================================
CREATE TABLE policies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fup', 'burst', 'scheduler', 'restrict', 'radius_group')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    speed_trigger_mbps INTEGER,
    quota_threshold_gb INTEGER,
    burst_limit_mbps INTEGER,
    burst_time_seconds INTEGER,
    start_time TIME,
    end_time TIME,
    policy_action VARCHAR(200),
    applied_lines_count INTEGER DEFAULT 0,
    group_name VARCHAR(100),
    attributes TEXT
);

-- ============================================================================
-- 2. ROUTERS TABLE (MikroTik RouterOS / Core NAS Nodes)
-- ============================================================================
CREATE TABLE routers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('online', 'offline')),
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    uptime VARCHAR(50) DEFAULT '0m',
    active_users INTEGER DEFAULT 0
);

-- ============================================================================
-- 3. RESELLERS TABLE (AAA Reseller Hierarchy: Franchises -> Dealers -> Subdealers)
-- ============================================================================
CREATE TABLE resellers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL, -- franchise, dealer, sub_dealer
    parent_reseller_id VARCHAR(50) REFERENCES resellers(id) ON DELETE SET NULL,
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    phone_number VARCHAR(30),
    email VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended')),
    user_count INTEGER DEFAULT 0,
    location VARCHAR(120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. CUSTOMERS TABLE (Broadband / PPPoE Subscribers)
-- ============================================================================
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    package_id VARCHAR(50) REFERENCES packages(id) ON DELETE SET NULL,
    parent_reseller_id VARCHAR(50) REFERENCES resellers(id) ON DELETE SET NULL,
    parent_role VARCHAR(30) NOT NULL, -- franchise, dealer, sub_dealer
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended', 'expired')),
    expiry_date TIMESTAMP WITH TIME ZONE,
    address TEXT,
    ip_address VARCHAR(45),
    mac_address VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. INVOICES TABLE (Subscriber Billing Invoices)
-- ============================================================================
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(120) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    billing_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'unpaid', 'cancelled')),
    package_name VARCHAR(100) NOT NULL,
    reseller_id VARCHAR(50) REFERENCES resellers(id) ON DELETE SET NULL,
    payment_method VARCHAR(50),
    paid_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 6. WALLET TRANSACTIONS TABLE (Franchise Ledger Logs)
-- ============================================================================
CREATE TABLE wallet_transactions (
    id VARCHAR(50) PRIMARY KEY,
    from_id VARCHAR(50) NOT NULL, -- can be 'admin' or reseller ID
    from_name VARCHAR(150) NOT NULL,
    to_id VARCHAR(50) NOT NULL, -- can be reseller ID
    to_name VARCHAR(150) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type VARCHAR(30) NOT NULL, -- transfer, topup
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- ============================================================================
-- 7. HRM STAFF TABLE (Company employees at different operational tiers)
-- ============================================================================
CREATE TABLE hrm_staff (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(30),
    role VARCHAR(50) NOT NULL, -- manager, technician, support_agent, line_man
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hired_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended', 'terminated')),
    level_id VARCHAR(50) NOT NULL, -- Either 'admin' OR Reseller Node's ID
    level_role VARCHAR(30) NOT NULL -- ADMIN, FRANCHISE, DEALER, SUB_DEALER
);

-- ============================================================================
-- 8. ATTENDANCE RECORD TABLE (HRM Clock-ins)
-- ============================================================================
CREATE TABLE attendance (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) REFERENCES hrm_staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    check_in VARCHAR(20),
    check_out VARCHAR(20),
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'leave'))
);

-- ============================================================================
-- 9. PAYROLL RECORD TABLE (Salary payments)
-- ============================================================================
CREATE TABLE payroll (
    id VARCHAR(50) PRIMARY KEY,
    staff_id VARCHAR(50) REFERENCES hrm_staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(100) NOT NULL,
    month VARCHAR(10) NOT NULL, -- Format 'YYYY-MM'
    base_salary NUMERIC(12, 2) NOT NULL,
    bonus NUMERIC(12, 2) DEFAULT 0.00,
    deduction NUMERIC(12, 2) DEFAULT 0.00,
    net_paid NUMERIC(12, 2) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'paid'))
);

-- ============================================================================
-- 10. SUPPORT TICKETS TABLE (Helpdesk Issues)
-- ============================================================================
CREATE TABLE tickets (
    id VARCHAR(50) PRIMARY KEY,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_staff_id VARCHAR(50) REFERENCES hrm_staff(id) ON DELETE SET NULL,
    assigned_staff_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. BANDWIDTH REALTIME TELEMETRY LOGS
-- ============================================================================
-- Matches the active telemetry logs for graph rendering
CREATE TABLE bandwidth_logs (
    id SERIAL PRIMARY KEY,
    timestamp VARCHAR(20) NOT NULL,
    rx_mbps INTEGER NOT NULL,
    tx_mbps INTEGER NOT NULL,
    active_sessions INTEGER NOT NULL
);

-- ============================================================================
-- 12. ACTIVITY LOGS (Audits and Logging of Admin actions)
-- Matches original table `activitylog`
-- ============================================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    datetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    admin_id VARCHAR(50),
    activity VARCHAR(255) NOT NULL,
    user_id VARCHAR(50),
    station_ip VARCHAR(100)
);

-- ============================================================================
-- 13. CASHFLOW & CATEGORIES (Accounting cash entries, in/out tracking)
-- Matches original tables `cashflow` and `cashflowcategory`
-- ============================================================================
CREATE TABLE cashflow_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL -- income, expense
);

CREATE TABLE cashflow (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(20) NOT NULL, -- income, expense
    category_id INTEGER REFERENCES cashflow_categories(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    user_id VARCHAR(50),
    admin_id VARCHAR(50),
    added_by VARCHAR(50) NOT NULL,
    franchise_id VARCHAR(50) REFERENCES resellers(id) ON DELETE SET NULL,
    dealer_id VARCHAR(50) REFERENCES resellers(id) ON DELETE SET NULL,
    subdealer_id VARCHAR(50) REFERENCES resellers(id) ON DELETE SET NULL
);

-- ============================================================================
-- 14. RADIUS SESSIONS & ACCOUNTING LOG (Session history tracker)
-- Matches original table `radacct`
-- ============================================================================
CREATE TABLE radius_sessions (
    radacct_id BIGSERIAL PRIMARY KEY,
    acct_session_id VARCHAR(64) UNIQUE NOT NULL,
    username VARCHAR(64) NOT NULL,
    nas_ip_address VARCHAR(15) NOT NULL,
    acct_start_time TIMESTAMP WITH TIME ZONE,
    acct_update_time TIMESTAMP WITH TIME ZONE,
    acct_stop_time TIMESTAMP WITH TIME ZONE,
    acct_session_time BIGINT,
    acct_input_octets BIGINT, -- Raw bytes downloaded
    acct_output_octets BIGINT, -- Raw bytes uploaded
    calling_station_id VARCHAR(50), -- MAC address
    framed_ip_address VARCHAR(15)
);


-- ============================================================================
-- ============================================================================
-- 15. FREERADIUS CORE TABLES (radcheck, radreply, radusergroup)
-- Enables native AAA integration with MikroTik/Cisco NAS devices
-- ============================================================================
CREATE TABLE radcheck (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op VARCHAR(2) NOT NULL DEFAULT '==',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radcheck_username_idx ON radcheck (username(32));

CREATE TABLE radreply (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op VARCHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radreply_username_idx ON radreply (username(32));

CREATE TABLE radusergroup (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) NOT NULL DEFAULT '',
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    priority INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX radusergroup_username_idx ON radusergroup (username(32));

CREATE TABLE radgroupreply (
    id SERIAL PRIMARY KEY,
    groupname VARCHAR(64) NOT NULL DEFAULT '',
    attribute VARCHAR(64) NOT NULL DEFAULT '',
    op VARCHAR(2) NOT NULL DEFAULT '=',
    value VARCHAR(253) NOT NULL DEFAULT ''
);
CREATE INDEX radgroupreply_groupname_idx ON radgroupreply (groupname(32));

-- CORE SEED INSERT DATA STATEMENTS (Matches exactly INITIAL_DB)
-- ============================================================================

-- Packages
INSERT INTO packages (id, name, speed_mbps, price_monthly, type, description) VALUES
('pkg-1', 'Bronze 10M', 10, 1200.00, 'pppoe', 'Standard home unlimited package'),
('pkg-2', 'Silver 25M', 25, 2000.00, 'pppoe', 'Premium family high-speed deal'),
('pkg-3', 'Gold 50M', 50, 3500.00, 'pppoe', 'SOHO / Gaming low latency profile'),
('pkg-4', 'Platinum 100M', 100, 6000.00, 'pppoe', 'Corporate fiber-speed bandwidth'),
('pkg-5', 'Hotspot Basic Daily', 5, 100.00, 'hotspot', 'Daily card for public Wi-Fi zones');

-- Routers (Core MikroTiks)
INSERT INTO routers (id, name, ip_address, status, cpu_usage, memory_usage, uptime, active_users) VALUES
('router-1', 'NOC-MikroTik-CCR1036', '103.45.12.1', 'online', 24, 42, '14d 6h 12m', 642),
('router-2', 'Franchise-A-RB4011', '103.45.15.5', 'online', 12, 28, '3d 11h 45m', 198),
('router-3', 'Dealer-S-CCR2004', '192.168.88.1', 'online', 8, 19, '27d 1h 22m', 84),
('router-4', 'Backup-Core-CCR1009', '10.0.1.1', 'offline', 0, 0, '0m', 0);

-- Resellers Hierarchy
INSERT INTO resellers (id, name, owner_name, role, parent_reseller_id, balance, phone_number, email, status, user_count, location, created_at) VALUES
('res-1', 'Alpha Broadband Franchise', 'Zahid Ahmed Khan', 'franchise', NULL, 145000.00, '+92 300 1234567', 'alpha.franchise@nexus.net', 'active', 382, 'Lahore Central NOC', '2025-01-10 08:00:00+00'),
('res-2', 'OmniNet Reseller Group', 'Rahat Chowdhury', 'franchise', NULL, 98000.00, '+880 1711 998877', 'dhaka-omni@nexus.net', 'active', 144, 'Dhaka North Division', '2025-02-15 10:30:00+00'),
('res-3', 'Saddar Area Cable Dealer', 'Kamran Malik', 'dealer', 'res-1', 32000.00, '+92 321 9876543', 'kamran.saddar@alpha.net', 'active', 92, 'Saddar Sector B', '2025-03-01 12:00:00+00'),
('res-4', 'Mirpur Dynamic Reseller', 'Asif Faisal', 'dealer', 'res-2', 12500.00, '+880 1622 345678', 'asif.mirpur@omni.net', 'active', 52, 'Mirpur-10 Block C', '2025-03-12 14:15:00+00'),
('res-5', 'Lane 4 MicroNet', 'Tariq Mahmood', 'sub_dealer', 'res-3', 4500.00, '+92 333 4445556', 'tariq.lanes@saddar-isp.net', 'active', 18, 'Saddar Cantt Lanes', '2025-04-01 09:00:00+00'),
('res-6', 'M-11 Cyber Cable', 'Hasan Tariq', 'sub_dealer', 'res-4', 1200.00, '+880 1819 123456', 'hasan.m11@mirpur-res.net', 'active', 12, 'Mirpur Section 11', '2025-04-10 16:40:00+00');

-- Broadband Customers
INSERT INTO customers (id, username, full_name, email, phone, package_id, parent_reseller_id, parent_role, balance, status, expiry_date, address, ip_address, mac_address, created_at) VALUES
('cust-1', 'zahid_fiber_home', 'Zahid Ahmed Shah', 'zahid.shah@gmail.com', '+92 301 9993322', 'pkg-3', 'res-3', 'dealer', 1500.00, 'active', '2026-06-30 23:59:59+00', 'House 12, Street 3, Saddar Cantt, Lahore', '103.45.12.89', 'B4:F2:E8:11:AA:FF', '2025-03-05 12:00:00+00'),
('cust-2', 'sub_user_lan4', 'Bilal Siddiqui', 'bilal.sid@yahoo.com', '+92 345 8887766', 'pkg-1', 'res-5', 'sub_dealer', 200.00, 'active', '2026-06-15 23:59:59+00', 'Flat 2B, Saddar Lane 4, Lahore', '103.45.12.181', 'D8:C4:4E:EF:88:55', '2025-04-02 10:00:00+00'),
('cust-3', 'mirpur_gamer_99', 'Naimur Rahman', 'naimur.dhaka@gmail.com', '+880 1912 345600', 'pkg-3', 'res-4', 'dealer', 3500.00, 'active', '2026-06-25 23:59:59+00', 'Apartment C4, Road 14, Mirpur-10, Dhaka', '103.45.15.44', 'FC:AA:14:23:CD:12', '2025-03-15 11:00:00+00'),
('cust-4', 'sec11_subscriber', 'Sultana Jahan', 'sultana.j@hotmail.com', '+880 1515 990011', 'pkg-2', 'res-6', 'sub_dealer', 0.00, 'suspended', '2026-05-10 23:59:59+00', 'House 10, Line B, Section 11, Mirpur, Dhaka', '103.45.15.98', '94:10:3B:AA:22:11', '2025-04-12 15:20:00+00'),
('cust-5', 'alpha_direct_client', 'Imran Siddiq', 'imran_siddiq@gmail.com', '+92 300 8765432', 'pkg-4', 'res-1', 'franchise', 6000.00, 'active', '2026-07-01 23:59:59+00', 'Commercial Office Block B, Lahore', '103.45.12.12', '24:E3:44:11:55:92', '2025-01-20 09:12:00+00');

-- Billing Invoices
INSERT INTO invoices (id, customer_id, customer_name, amount, billing_date, expiry_date, status, package_name, reseller_id, payment_method, paid_at) VALUES
('inv-1001', 'cust-1', 'Zahid Ahmed Shah', 3500.00, '2026-05-30 12:00:00+00', '2026-06-30 23:59:59+00', 'paid', 'Gold 50M', 'res-3', 'JazzCash', '2026-05-30 14:22:00+00'),
('inv-1002', 'cust-2', 'Bilal Siddiqui', 1200.00, '2026-05-15 10:00:00+00', '2026-06-15 23:59:59+00', 'paid', 'Bronze 10M', 'res-5', 'Cash', '2026-05-15 11:45:00+00'),
('inv-1003', 'cust-3', 'Naimur Rahman', 3500.00, '2026-05-25 11:00:00+00', '2026-06-25 23:59:59+00', 'paid', 'Gold 50M', 'res-4', 'bKash', '2026-05-25 11:05:00+00'),
('inv-1004', 'cust-4', 'Sultana Jahan', 2000.00, '2026-05-10 15:20:00+00', '2026-06-10 23:59:59+00', 'unpaid', 'Silver 25M', 'res-6', NULL, NULL),
('inv-1005', 'cust-5', 'Imran Siddiq', 6000.00, '2026-06-01 00:00:00+00', '2026-07-01 23:59:59+00', 'unpaid', 'Platinum 100M', 'res-1', NULL, NULL);

-- Reseller Ledger Transactions
INSERT INTO wallet_transactions (id, from_id, from_name, to_id, to_name, amount, type, timestamp, notes) VALUES
('tx-201', 'admin', 'System Super Admin', 'res-1', 'Alpha Broadband Franchise', 250000.00, 'transfer', '2026-05-01 10:00:00+00', 'Main wallet credit recharge for May operations'),
('tx-202', 'admin', 'System Super Admin', 'res-2', 'OmniNet Reseller Group', 150000.00, 'transfer', '2026-05-02 11:30:00+00', 'Monthly bandwidth quota allocation topup'),
('tx-203', 'res-1', 'Alpha Broadband Franchise', 'res-3', 'Saddar Area Cable Dealer', 50000.00, 'transfer', '2026-05-05 14:00:00+00', 'Dealer balance provisioning'),
('tx-204', 'res-3', 'Saddar Area Cable Dealer', 'res-5', 'Lane 4 MicroNet', 10000.00, 'transfer', '2026-05-07 16:20:00+00', 'Emergency balance replenish');

-- HRM Employees
INSERT INTO hrm_staff (id, name, email, phone, role, salary, hired_at, status, level_id, level_role) VALUES
('st-1', 'Sikandar Shah', 'sikandar@nexus.net', '+92 300 1112233', 'manager', 75000.00, '2025-01-01 00:00:00+00', 'active', 'admin', 'admin'),
('st-2', 'Tanveer Elahi', 'tanveer@nexus.net', '+92 321 4443322', 'technician', 45000.00, '2025-02-01 00:00:00+00', 'active', 'admin', 'admin'),
('st-3', 'Aria Ahmed', 'aria.admin@nexus.net', '+92 333 5556677', 'support_agent', 35000.00, '2025-03-01 00:00:00+00', 'active', 'admin', 'admin'),
('st-4', 'Sajid Baloch', 'sajid@alpha.net', '+92 312 3334445', 'technician', 38000.00, '2025-02-10 00:00:00+00', 'active', 'res-1', 'franchise'),
('st-5', 'Maria Khan', 'maria@alpha.net', '+92 345 5551112', 'support_agent', 28000.00, '2025-03-15 00:00:00+00', 'active', 'res-1', 'franchise'),
('st-6', 'Yasin Patel', 'yasin@saddar-isp.net', '+92 302 7776655', 'line_man', 22000.00, '2025-04-01 00:00:00+00', 'active', 'res-3', 'dealer'),
('st-7', 'Waqas Alam', 'waqas@lan4.net', '+92 332 1119998', 'line_man', 18000.00, '2025-04-20 00:00:00+00', 'active', 'res-5', 'sub_dealer');

-- Staff Attendance (Current status)
INSERT INTO attendance (id, staff_id, staff_name, date, check_in, check_out, status) VALUES
('att-1', 'st-1', 'Sikandar Shah', '2026-05-31', '08:52:12', '17:05:44', 'present'),
('att-2', 'st-2', 'Tanveer Elahi', '2026-05-31', '09:12:00', '18:00:15', 'present'),
('att-3', 'st-3', 'Aria Ahmed', '2026-05-31', '08:30:22', '16:30:00', 'present'),
('att-4', 'st-4', 'Sajid Baloch', '2026-05-31', '09:05:00', '17:15:30', 'present'),
('att-5', 'st-5', 'Maria Khan', '2026-05-31', '08:58:30', NULL, 'present'),
('att-6', 'st-6', 'Yasin Patel', '2026-05-31', '09:30:00', '16:00:00', 'late'),
('att-7', 'st-7', 'Waqas Alam', '2026-05-31', NULL, NULL, 'absent');

-- Salary Payroll Rollouts
INSERT INTO payroll (id, staff_id, staff_name, month, base_salary, bonus, deduction, net_paid, paid_at, status) VALUES
('pay-1', 'st-1', 'Sikandar Shah', '2026-05', 75000.00, 5000.00, 0.00, 80000.00, '2026-05-28 10:00:00+00', 'paid'),
('pay-2', 'st-2', 'Tanveer Elahi', '2026-05', 45000.00, 2000.00, 500.00, 46500.00, '2026-05-28 10:15:00+00', 'paid'),
('pay-3', 'st-3', 'Aria Ahmed', '2026-05', 35000.00, 0.00, 0.00, 35000.00, '2026-05-28 10:30:00+00', 'paid'),
('pay-4', 'st-4', 'Sajid Baloch', '2026-05', 38000.00, 1500.00, 800.00, 38700.00, '2026-05-29 11:00:00+00', 'paid'),
('pay-5', 'st-5', 'Maria Khan', '2026-05', 28000.00, 0.00, 0.00, 28000.00, '2026-05-29 11:30:00+00', 'paid'),
('pay-6', 'st-6', 'Yasin Patel', '2026-05', 22000.00, 0.00, 1000.00, 21000.00, NULL, 'draft'),
('pay-7', 'st-7', 'Waqas Alam', '2026-05', 18000.00, 500.00, 1500.00, 17000.00, NULL, 'draft');

-- Helpdesk Support Tickets
INSERT INTO tickets (id, customer_id, customer_name, title, description, priority, status, assigned_staff_id, assigned_staff_name, created_at, updated_at) VALUES
('tkt-501', 'cust-1', 'Zahid Ahmed Shah', 'Router frequent disconnects', 'My PPPoE session drops every 30 minutes. LAN light on modern remains orange. Please check fiber splicing.', 'high', 'in_progress', 'st-4', 'Sajid Baloch', '2026-05-30 09:00:00+00', '2026-05-31 11:00:00+00'),
('tkt-502', 'cust-4', 'Sultana Jahan', 'Account suspended warning', 'My connection says suspended on the landing page, but I made payment via offline agent Hasan on Section 11.', 'medium', 'open', NULL, NULL, '2026-05-31 08:15:00+00', '2026-05-31 18:12:00+00'),
('tkt-503', 'cust-3', 'Naimur Rahman', 'Need static IP for gaming port', 'Requesting static public IP lease for port forwarding. Ready to pay additional fee if required.', 'low', 'resolved', 'st-5', 'Maria Khan', '2026-05-28 16:00:00+00', '2026-05-29 10:00:00+00');

-- Telemetry Logs
INSERT INTO bandwidth_logs (timestamp, rx_mbps, tx_mbps, active_sessions) VALUES
('18:00:00', 345, 789, 914),
('18:02:00', 350, 802, 917),
('18:04:00', 368, 844, 921),
('18:06:00', 320, 790, 911),
('18:08:00', 340, 815, 915),
('18:10:00', 395, 910, 932),
('18:12:00', 412, 930, 940);

-- Nexus Broadband Policies Seeds
INSERT INTO policies (id, name, type, status, description, speed_trigger_mbps, quota_threshold_gb, burst_limit_mbps, burst_time_seconds, start_time, end_time, policy_action, applied_lines_count, group_name, attributes) VALUES
('pol-1', 'Standard FUP Fair Usage Limit', 'fup', 'active', 'Automated speed decrease rule on PPPoE customer line once customer downloads exceed 500GB volume during a billing period.', 2, 500, NULL, NULL, NULL, NULL, 'Reduce subscriber bandwidth to 2 Mbps', 142, NULL, NULL),
('pol-2', 'Night Speed Booster Tunnel', 'scheduler', 'active', 'Automated speed burst multiplier designed to boost low tier packages starting 2:00 AM till 8:00 AM every night.', NULL, NULL, NULL, NULL, '02:00:00', '08:00:00', 'Double speed profile parameters', 419, NULL, NULL),
('pol-3', 'Unpaid Intercept Web Portal Redirect', 'restrict', 'active', 'Walled Garden network redirection forcing expired or un-billed customer routers to landing portal advising bill pay options.', NULL, NULL, NULL, NULL, NULL, NULL, 'Intercept and display billing warning page', 88, NULL, NULL),
('pol-4', 'Burst Booster Turbo Mode', 'burst', 'inactive', 'Configures MikroTik Address List Queue parameters giving 50 Mbps burst speed boost for first 15 seconds of any new HTTP connection.', NULL, NULL, 50, 15, NULL, NULL, 'Activate 50M Burst Queue Limit Rule', 0, NULL, NULL),
('pol-5', 'Ultra Gaming Profile Specs', 'radius_group', 'active', 'Specific RADIUS attributes configuration for premium gamers with routing queue parameters and custom address pool mapping.', NULL, NULL, NULL, NULL, NULL, NULL, 'Assign high-priority RADIUS profile', 75, 'UltraGamingGroup', '[{"id":"attr-1","name":"Mikrotik-Rate-Limit","op":":=","type":"Reply","value":"50M/50M"},{"id":"attr-2","name":"Mikrotik-Address-List","op":":=","type":"Reply","value":"Gaming-Fast-Route"},{"id":"attr-3","name":"Simultaneous-Use","op":":=","type":"Check","value":"1"}]');

