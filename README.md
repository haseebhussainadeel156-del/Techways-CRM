# Nexus ISP Billing Platform

A modern ISP Billing and AAA Gateway application. 

## Features
- Reseller & Franchise Hierarchy (Super Admin, Franchise, Dealer, Sub-Dealer, Customer)
- PPPoE / Hotspot Customer Management
- Mikrotik RouterOS native integration via API
- FreeRADIUS Database Synching (PostgreSQL)
- SaaS Billing (Invoicing)
- Advanced Analytics Dashboard

## Server Deployment Instructions

The project provides an automated, interactive terminal wizard `setup.sh` that checks dependencies, installs modules, guides security configuration, handles credentials, and compiles production bundles completely.

### 🌐 Automated Setup (Recommended)

1. Connect to your production terminal, navigate to the project directory, and run the automated wizard:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
2. The interactive script will automatically execute all steps needed to boot the platform.

---

### 🛡️ Core Security Design: Restricted Database Isolation Account (Least-Privilege)

For production deployment, running the web service with administrative accounts (such as `postgres`) exposes your central routers, database rows, and operational billing records to critical security vulnerabilities. 

We highly recommend using a dedicated, unprivileged sandbox database user (e.g. `nexus_app`) configured with read/write CRUD privileges limited only to the tables defined inside the system schema.

#### 1. Initialize PostgreSQL Schema & Seed Data
Log in to your PostgreSQL instance as administrative owner (`postgres`) and import the database dump file to create the tables:
```bash
# Connect and import seed schema inside your target database
psql -U postgres -d nexus_db < database_dump.sql
```

#### 2. Configure Restricted Authorization User
Execute the following commands in PGAdmin or psql CLI tool to restrict the web app's authorization boundaries:
```sql
-- Create an unprivileged sandbox user account for the application
CREATE USER nexus_app WITH PASSWORD 'your_secure_app_password';

-- Connect to your application database instance
\c nexus_db

-- Allow the app user connection and table scope usage
GRANT CONNECT ON DATABASE nexus_db TO nexus_app;
GRANT USAGE ON SCHEMA public TO nexus_app;

-- Grant limited CRUD command parameters for application tables (keeps structural schema locked)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexus_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexus_app;

-- Ensure subsequent tables/seeds are safely authorized to the user boundaries
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexus_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO nexus_app;
```

#### 3. Setup Connection Secrets
Use this restricted user in your production `.env` file instead of `postgres` to isolate database vulnerability paths completely:
- Fill in: `PGUSER="nexus_app"`, `PGPASSWORD="your_secure_app_password"`, `PGDATABASE="nexus_db"`.

---

### 🛠️ Manual Alternative Setup (Step-by-Step)

If you prefer to run setup scripts manually step-by-step:

#### 1. Installation

Install Node.js packages:
```bash
npm install
```

#### 2. Environment Configuration

Copy the sample profile and fill in parameters:
```bash
cp .env.example .env
```

#### 3. Build the Application

Build the full-stack bundle (creates single `dist/server.cjs` containing Express backend and Vite frontend static routes):
```bash
npm run build
```

### 4. Running the Application

You can start the production server directly with Node:
```bash
npm start
```
*The default port is 3000. Access it at `http://localhost:3000` or `http://your_server_ip:3000`.*

### 5. Running with PM2 (Recommended for Production)

To keep the application running continuously in the background, use PM2:
```bash
# Install pm2 globally
npm install -g pm2

# Start the built server with pm2
pm2 start dist/server.cjs --name "nexus-isp"

# Setup pm2 to start on system boot
pm2 startup
pm2 save
```

### Default Credentials
You can bypass standard authentication for demo/testing via the Quick Login buttons on the main screen. The default admin payload uses `admin` as the username. 
