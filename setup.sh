#!/usr/bin/env bash
# ==============================================================================
# Nexus ISP Billing Platform - Automated Server Setup and Dependency Installer
# Security Mode: Sandboxed / Restricted Least-Privilege Database User Support
# Target Environment: Ubuntu/Debian/RHEL/macOS
# ==============================================================================

set -e

# Decorative Color Scheme
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Clear Screen & Print Header Banner
clear
echo -e "${CYAN}${BOLD}======================================================================${NC}"
echo -e "${CYAN}${BOLD}       _  _                     ___  ____  ____    _  _         ${NC}"
echo -e "${CYAN}${BOLD}      | \| |_____ _  _ _  _ ___|_ _ / ___||  _ \  | || |_  _ ___ ${NC}"
echo -e "${CYAN}${BOLD}      | .  / -_) \ \/ / || (_-< | |  \___ \| |_) | | __ | || | _ \_ ${NC}"
echo -e "${CYAN}${BOLD}      |_|\_\___|_\_/\_/\_,_/__/|___| |____/|  __/  |_||_|\_,_| .__/${NC}"
echo -e "${CYAN}${BOLD}                                           |_|               |_|   ${NC}"
echo -e "${CYAN}${BOLD}                 ENTERPRISE PLATFORM INSTALLATION SYSTEM              ${NC}"
echo -e "${CYAN}${BOLD}======================================================================${NC}"
echo -e "This script installs Node.js dependencies, sets up configuration environment files,"
echo -e "builds the integrated server bundles, and guides database hardening."
echo ""

# 1. PREREQUISITES AND ENVIRONMENT AUDIT
echo -e "${BLUE}${BOLD}[Step 1/5] Executing environment dependencies audit...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}${BOLD}Error: Node.js is not installed.${NC} Please install Node.js (v18+) and try again."
    exit 1
else
    NODE_VER=$(node -v)
    echo -e "  - Node.js Detected: ${GREEN}${NODE_VER}${NC} (Required: >= v18)"
fi

# Check Npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}${BOLD}Error: npm package manager is not installed.${NC} Please install npm and run script again."
    exit 1
else
    NPM_VER=$(npm -v)
    echo -e "  - NPM Detected: ${GREEN}v${NPM_VER}${NC}"
fi

# Check Git
if command -v git &> /dev/null; then
    echo -e "  - Git Source Control: ${GREEN}Active${NC}"
else
    echo -e "  - Git Source Control: ${YELLOW}Not Detected (Non-blocking)${NC}"
fi

# Check Postgres local command presence (CLI tool confirmation)
if command -v psql &> /dev/null; then
    echo -e "  - PostgreSQL Client: ${GREEN}Available${NC}"
else
    echo -e "  - PostgreSQL Client: ${YELLOW}Not Installed Locally (Connection still works externally)${NC}"
fi
echo ""

# 2. DEPENDENCY ACCELERATION INSTALLATION
echo -e "${BLUE}${BOLD}[Step 2/5] Deploying backend & frontend libraries...${NC}"
echo -e "Running local package tree evaluation and compiling node_modules folder..."
npm install
echo -e "${GREEN}${BOLD}✓ Library installation completed successfully.${NC}"
echo ""

# 3. LEAST-PRIVILEGE SECURITY EXPLANATION & USER GENERATION
echo -e "${CYAN}${BOLD}[Step 3/5] Security Guide: Sandbox Restricted Database User${NC}"
echo -e "----------------------------------------------------------------------"
echo -e "Running an online ISP platform using administrative superusers (e.g. 'postgres')"
echo -e "is extremely dangerous as any vulnerability or unauthorized access can compromise"
echo -e "internal router information, subscriber caches, or core system services."
echo ""
echo -e "${GREEN}${BOLD}Architectural Solution: Non-Admin Application User (Security Best-Practice)${NC}"
echo -e "We recommend creating a specialized, unprivileged PostgreSQL database user"
echo -e "named ${YELLOW}nexus_app${NC} which is strictly isolated to regular table CRUD operations"
echo -e "and cannot run database management DDL lines, access file system, or drop structures."
echo ""
echo -e "${BOLD}Recommended PostgreSQL Initialization Matrix:${NC}"
echo -e "----------------------------------------------------------------------"
echo -e "1. Open pgAdmin, or connect to your database shell using psql as superuser."
echo -e "2. Copy/execute the following queries to create the database and unprivileged user:"
echo ""
echo -e "${YELLOW}# --- SQL QUERIES START ---"
echo -e "  -- Create the limited account"
echo -e "  CREATE USER nexus_app WITH PASSWORD 'SetYourSecureAppPasswordHere';"
echo ""
echo -e "  -- Create the dedicated application container database"
echo -e "  CREATE DATABASE nexus_db OWNER postgres;"
echo -e "  \c nexus_db"
echo ""
echo -e "  -- Import schema tables as DB administrator FIRST"
echo -e "  -- Command: psql -U postgres -d nexus_db < database_dump.sql"
echo ""
echo -e "  -- Grant limited execution execution privileges to our isolated user"
echo -e "  GRANT CONNECT ON DATABASE nexus_db TO nexus_app;"
echo -e "  GRANT USAGE ON SCHEMA public TO nexus_app;"
echo -e "  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexus_app;"
echo -e "  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexus_app;"
echo ""
echo -e "  -- Establish safety defaults for subsequent tables/migrations"
echo -e "  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexus_app;"
echo -e "  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO nexus_app;"
echo -e "# --- SQL QUERIES END ---${NC}"
echo -e "----------------------------------------------------------------------"
read -p "Press [Enter] to continue and establish environment profile Configuration..." dummy
echo ""

# 4. ENVIRONMENT PROFILE GENERATION
echo -e "${BLUE}${BOLD}[Step 4/5] Inbound connection profile variables (.env)${NC}"
if [ -f .env ]; then
    echo -e "  - Found existing configuration ${GREEN}.env${NC} file."
    read -p "    Overwirte this .env file with new PostgreSQL inputs? (y/n): " overwrite
else
    overwrite="y"
fi

if [[ "$overwrite" =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "Please configure your restricted PostgreSQL user credentials below (or enter defaults/blank to skip):"
    read -p "PostgreSQL Host (Default: localhost): " DB_HOST
    DB_HOST=${DB_HOST:-"localhost"}

    read -p "PostgreSQL DB Name (Default: nexus_db): " DB_NAME
    DB_NAME=${DB_NAME:-"nexus_db"}

    read -p "PostgreSQL User (Recommended: nexus_app): " DB_USER
    DB_USER=${DB_USER:-"nexus_app"}

    read -p "PostgreSQL User Password: " -s DB_PASS
    echo ""

    read -p "PostgreSQL Connection Port (Default: 5432): " DB_PORT
    DB_PORT=${DB_PORT:-"5432"}

    read -p "SSL Required? (true / false - Default: false): " DB_SSL
    DB_SSL=${DB_SSL:-"false"}

    # Write target production configuration file
    cat <<EOF > .env
# ==============================================================================
# NEXUS HOST ISP PLATFORM - PRODUCTION CONFIGURATION PROFILE
# Generated via setup.sh helper system
# ==============================================================================

# Database Connectivity Configuration (Using limited database user)
PGHOST="${DB_HOST}"
PGPORT="${DB_PORT}"
PGUSER="${DB_USER}"
PGPASSWORD="${DB_PASS}"
PGDATABASE="${DB_NAME}"
PGSSL="${DB_SSL}"

# System Runtime Environments
PORT=3000
NODE_ENV="production"
EOF
    echo -e "  - Saved dynamic credentials inside ${GREEN}.env${NC} securely."
else
    echo -e "  - Retention chosen. Keeping current ${GREEN}.env${NC} profile intact."
fi
echo ""

# 5. PRODUCTION BUNDLING AND COMPILATION check
echo -e "${BLUE}${BOLD}[Step 5/5] Compiling and Bundling Nexus Portal...${NC}"
echo -e "Building full-stack modules via Vite and esbuild server bundlers..."
npm run build
echo ""
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e "${GREEN}${BOLD}             ✓ NEXUS BROADBAND PLATFORM SUITE IS READY!               ${NC}"
echo -e "${GREEN}${BOLD}======================================================================${NC}"
echo -e ""
echo -e "All systems are built and ready for immediate secure server execution."
echo -e "Deploy to continuous background operations via PM2:"
echo -e "  ${BOLD}pm2 start dist/server.cjs --name \"nexus-isp\"${NC}"
echo -e ""
echo -e "For standalone debugging starting on port 3000, call:"
echo -e "  ${BOLD}npm start${NC}"
echo -e "======================================================================"
echo ""
