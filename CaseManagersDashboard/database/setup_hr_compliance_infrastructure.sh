#!/bin/bash
# ==============================================
# HR COMPLIANCE INFRASTRUCTURE SETUP SCRIPT
# ==============================================
# Purpose: Set up qolae_hrcompliance database and update qolae_readers table
# Author: Liz & Claude
# Date: October 10, 2025
# ==============================================

set -e  # Exit on any error

echo "=========================================="
echo "QOLAE HR COMPLIANCE - Infrastructure Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Creating qolae_hrcompliance database...${NC}"
sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE qolae_hrcompliance;

-- Create dedicated user for HR compliance
CREATE USER hrcompliance_user WITH PASSWORD 'HRqolae25!';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE qolae_hrcompliance TO hrcompliance_user;

-- Connect to new database and grant schema privileges
\c qolae_hrcompliance

-- Grant usage on schema
GRANT ALL ON SCHEMA public TO hrcompliance_user;

-- Grant default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO hrcompliance_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO hrcompliance_user;

EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database qolae_hrcompliance created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create database${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Creating tables in qolae_hrcompliance...${NC}"
sudo -u postgres psql -d qolae_hrcompliance -f /var/www/casemanagers.qolae.com/CaseManagersDashboard/database/setup_qolae_hrcompliance.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ HR Compliance tables created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create tables${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 3: Adding compliance columns to qolae_readers.readers table...${NC}"
sudo -u postgres psql -d qolae_readers << EOF
-- Add compliance tracking columns
ALTER TABLE readers 
  ADD COLUMN IF NOT EXISTS compliance_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS compliance_submitted_at TIMESTAMP;

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_readers_compliance_submitted 
  ON readers(compliance_submitted);

-- Add comments
COMMENT ON COLUMN readers.compliance_submitted IS 
  'TRUE if reader has submitted HR compliance (CV + references). Used as gate to dashboard access.';

COMMENT ON COLUMN readers.compliance_submitted_at IS 
  'Timestamp when reader submitted their compliance documents.';

EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Compliance columns added to readers table${NC}"
else
    echo -e "${RED}✗ Failed to add columns to readers table${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 4: Creating directory structure for HR compliance files...${NC}"

# Create directories
mkdir -p /var/www/api.qolae.com/central-repository/hr-compliance/cv
mkdir -p /var/www/api.qolae.com/central-repository/hr-compliance/references
mkdir -p /var/www/api.qolae.com/central-repository/hr-compliance/signatures

# Set permissions
chown -R www-data:www-data /var/www/api.qolae.com/central-repository/hr-compliance
chmod -R 750 /var/www/api.qolae.com/central-repository/hr-compliance

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ HR compliance directories created${NC}"
else
    echo -e "${RED}✗ Failed to create directories${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Verifying setup...${NC}"

# Verify qolae_hrcompliance database
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w qolae_hrcompliance | wc -l)
if [ $DB_EXISTS -eq 1 ]; then
    echo -e "${GREEN}✓ qolae_hrcompliance database verified${NC}"
else
    echo -e "${RED}✗ Database verification failed${NC}"
    exit 1
fi

# Verify tables exist
TABLE_COUNT=$(sudo -u postgres psql -d qolae_hrcompliance -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('reader_compliance', 'compliance_access_log', 'reference_forms');")
if [ $TABLE_COUNT -eq 3 ]; then
    echo -e "${GREEN}✓ All 3 HR compliance tables verified${NC}"
else
    echo -e "${RED}✗ Table verification failed (found $TABLE_COUNT/3 tables)${NC}"
    exit 1
fi

# Verify readers table columns
COLUMN_EXISTS=$(sudo -u postgres psql -d qolae_readers -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'readers' AND column_name IN ('compliance_submitted', 'compliance_submitted_at');")
if [ $COLUMN_EXISTS -eq 2 ]; then
    echo -e "${GREEN}✓ Compliance columns in readers table verified${NC}"
else
    echo -e "${RED}✗ Readers table column verification failed${NC}"
    exit 1
fi

# Verify directories
if [ -d "/var/www/api.qolae.com/central-repository/hr-compliance/cv" ] && 
   [ -d "/var/www/api.qolae.com/central-repository/hr-compliance/references" ] && 
   [ -d "/var/www/api.qolae.com/central-repository/hr-compliance/signatures" ]; then
    echo -e "${GREEN}✓ HR compliance directories verified${NC}"
else
    echo -e "${RED}✗ Directory verification failed${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ HR COMPLIANCE INFRASTRUCTURE SETUP COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "  • Database: qolae_hrcompliance created"
echo "  • User: hrcompliance_user created"
echo "  • Tables: reader_compliance, compliance_access_log, reference_forms"
echo "  • Readers table updated with compliance columns"
echo "  • File directories created in central-repository"
echo ""
echo "Database Connection String:"
echo "  postgresql://hrcompliance_user:HRqolae25!@localhost:5432/qolae_hrcompliance"
echo ""
echo "Next Steps:"
echo "  1. Update Case Managers backend with HR compliance database connection"
echo "  2. Create readers-compliance.ejs form"
echo "  3. Create reference-form.ejs"
echo "  4. Build HR compliance routes and controllers"
echo ""
echo "=========================================="

