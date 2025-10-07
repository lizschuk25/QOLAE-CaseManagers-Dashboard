# 🗄️ DEPLOY QOLAE_CASEMANAGERS DATABASE

**Server**: 91.99.184.77 (Hetzner Live Server)
**PostgreSQL Port**: 5432
**Database Name**: qolae_casemanagers

---

## 📋 DEPLOYMENT STEPS

### **Step 1: SSH into Live Server**
```bash
ssh root@91.99.184.77
```

### **Step 2: Create Database & User**
```bash
# Connect to PostgreSQL as postgres user
sudo -u postgres psql

# Run these SQL commands:
```

```sql
-- Create database
CREATE DATABASE qolae_casemanagers;

-- Create user
CREATE USER casemanagers_user WITH PASSWORD 'your-secure-password-here';

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE qolae_casemanagers TO casemanagers_user;

-- Connect to the new database
\c qolae_casemanagers;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO casemanagers_user;

-- Exit psql
\q
```

### **Step 3: Run Schema File**
```bash
# Schema file is already on server at:
# /var/www/casemanagers.qolae.com/CaseManagersDashboard/database/setup_qolae_casemanagers.sql

# Run the schema
sudo -u postgres psql -d qolae_casemanagers -f /var/www/casemanagers.qolae.com/CaseManagersDashboard/database/setup_qolae_casemanagers.sql
```

### **Step 4: Verify Tables Created**
```bash
sudo -u postgres psql -d qolae_casemanagers

# List all tables
\dt

# Expected output:
# cases
# ina_visits
# ina_forms
# ina_reports
# case_activity_log

# Check cases table structure
\d cases

# Exit
\q
```

### **Step 5: Test Database Connection**
```bash
# Test connection with casemanagers_user
PGPASSWORD='your-password-here' psql -U casemanagers_user -d qolae_casemanagers -h localhost -c "SELECT version();"
```

---

## ✅ VERIFICATION

**Success indicators**:
- ✅ Database `qolae_casemanagers` exists
- ✅ User `casemanagers_user` can connect
- ✅ 5 tables created (cases, ina_visits, ina_forms, ina_reports, case_activity_log)
- ✅ Triggers and functions created
- ✅ Indexes created for performance

---

## 🔐 UPDATE .ENV FILE

**Location on server**: `/var/www/casemanagers.qolae.com/.env`

Add this new connection string:

```env
CASEMANAGERS_DATABASE_URL=postgresql://casemanagers_user:your-secure-password-here@localhost:5432/qolae_casemanagers
```

**Note**: The existing `READERS_DATABASE_URL` should remain in the .env file. The Case Managers Dashboard will connect to **both** databases:
- `qolae_readers` - For reader registration and management
- `qolae_casemanagers` - For case management, INA visits, forms, and reports

---

## 📊 DATABASE OVERVIEW

### **Table 1: cases**
Master case tracking table linking lawyers to clients

**Key Fields**:
- `case_pin` - Unique case identifier (e.g., CT-001234-C001)
- `lawyer_pin` - Links to lawyer who referred the case
- `case_manager_name` - Liz or other CM
- `case_status` - Workflow stage tracking
- `consent_received` - Consent form status

### **Table 2: ina_visits**
INA visit scheduling and completion tracking

**Key Fields**:
- `visit_date`, `visit_time` - Scheduled appointment
- `visit_status` - scheduled/completed/cancelled
- `checklist_completed` - Preparation status
- `photos_taken`, `recordings_taken` - Media collected

### **Table 3: ina_forms**
INA form data collected during visit

**Key Fields**:
- `client_medical_history` - JSONB flexible structure
- `client_mobility_assessment` - JSONB flexible structure
- `client_daily_living_needs` - JSONB flexible structure
- `form_status` - draft/completed/locked
- `data_transferred_to_report` - Auto-population tracking

### **Table 4: ina_reports**
Final INA reports with reader workflow

**Key Fields**:
- `report_number` - Unique report ID (e.g., INA-2025-001)
- `report_status` - draft → readers → signed → delivered
- `first_reader_pin`, `second_reader_pin` - Reader assignments
- `signed_report_path` - Final PDF location
- `lawyer_download_count` - Tracking lawyer access

### **Table 5: case_activity_log**
GDPR-compliant audit trail

**Key Fields**:
- `activity_type` - What happened
- `performed_by` - Who did it
- `ip_address` - Security tracking
- `activity_timestamp` - When it happened

---

## 🔄 WORKFLOW INTEGRATION

**Case Managers Dashboard connects to TWO databases**:

1. **qolae_readers** (Reader Registration)
   - Register first readers (non-medical)
   - Register second readers (medical professionals)
   - NMC/GMC verification
   - Reader PINs and authentication

2. **qolae_casemanagers** (Case Management)
   - Case tracking and status
   - INA visit scheduling
   - INA form data collection
   - INA report writing and reader assignment
   - Report delivery to lawyers

---

**Ready for PM2 deployment!** 🚀
