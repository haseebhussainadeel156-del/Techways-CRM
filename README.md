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

### Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL Database
- PM2 (for production process management)

### 1. Installation

Clone/extract the project to your deployment server, then install dependencies:
```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:
```bash
cp .env.example .env
```
Edit the `.env` file with your actual database and server details:
- **Database variables**: `PGUSER`, `PGHOST`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`
- *Note: Leave `PGSSL="false"` if connecting to a local unencrypted database or change to `"true"` if using cloud hosting like Neon/Supabase.*
- **Stripe Variables** are optional, used if SaaS online payment is enabled later.

### 3. Build the Application

Build the application bundle for production (creates a single Node.js script bundling the Express server and Vite frontend):
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
