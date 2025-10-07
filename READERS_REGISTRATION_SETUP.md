# 📖 READERS REGISTRATION SYSTEM - SETUP & DEPLOYMENT GUIDE

**Date**: October 7, 2025
**Author**: Liz & Claude
**System**: Case Managers Dashboard → Readers Dashboard Integration
**Database**: qolae_readers (PostgreSQL)

---

## 🎯 SYSTEM OVERVIEW

The Readers Registration System allows Liz (Case Managers Dashboard) to register readers who will review confidential INA reports. Readers are assigned unique PINs and receive email invitations to access the Readers Portal.

### **Key Features**:
- ✅ **Reader PIN Generation** (RDR-prefix pattern)
- ✅ **NMC/GMC Medical Verification** (for Second Readers)
- ✅ **Email Invitation System** (hyperlinked PIN)
- ✅ **Two Reader Types**:
  - First Reader (Non-Medical) - £50/report
  - Second Reader (Medical Professional) - £75-100/report

---

## 📂 FILES CREATED

### **1. Database Schema**
**Location**: `/QOLAE-Readers-Dashboard/database/setup_qolae_readers.sql`

**Tables Created**:
- `readers` - Master registry with NMC/GMC verification fields
- `reader_assignments` - Report assignments (anonymous to readers)
- `reader_activity_log` - GDPR audit trail
- `reader_nda_versions` - NDA template versioning

**Key Features**:
- Auto-generated UUID primary keys
- Automatic deadline calculation (24 hours)
- Turnaround time tracking
- Payment approval workflow
- GDPR-compliant audit trails

### **2. Frontend - Registration Card**
**Location**: `/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/views/readers-registration-card.ejs`

**Form Fields**:
- Reader Full Name
- Email Address
- Phone Number
- Reader Type (First/Second dropdown)
- **Medical Section** (Second Readers only):
  - Medical Specialization
  - Registration Body (NMC/GMC/Other)
  - Registration Number
  - 🔍 **Verify Button** (checks NMC/GMC)
- Reader PIN Generation
- Send Email Checkbox

**Validation**:
- PIN generation disabled until all fields valid
- Medical readers must be verified before registration
- Real-time form validation
- Success/error message display

### **3. Backend - Controller**
**Location**: `/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/controllers/CaseManagersController.js`

**Functions**:
1. `generateReaderPIN()` - Creates unique RDR-{INITIALS}{6-DIGIT} PIN
2. `verifyMedicalRegistration()` - NMC/GMC verification (mock for now)
3. `registerReader()` - Saves to qolae_readers database + sends email

**PIN Generation Example**:
```javascript
"John Smith" → "RDR-JS123456"
"Mary Doe" → "RDR-MD789012"
```

**Database Fields Saved**:
- Basic: PIN, name, email, phone, type
- Medical: specialization, registration_body, registration_number, verified
- Tracking: payment_rate, created_by, timestamps

### **4. Backend - Routes**
**Location**: `/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/routes/caseManagerRoutes.js`

**API Endpoints**:
```
POST /api/case-managers/generate-reader-pin
POST /api/case-managers/verify-medical-registration
POST /api/case-managers/register-reader
GET  /api/case-managers/health
```

### **5. Server Configuration**
**Location**: `/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/server.js`

**Features**:
- Fastify server on port 3006
- EJS view engine
- CORS configuration
- Form body parsing
- Static file serving
- Error handling
- Health check endpoint

### **6. Environment Configuration**
**Location**: `/QOLAE-CaseManagers-Dashboard/.env.example`

**Required Variables**:
```env
PORT=3006
READERS_DATABASE_URL=postgresql://readers_user:readers_password@localhost:5432/qolae_readers
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=noreply@qolae.com
EMAIL_PASSWORD=your-app-password
```

**Port Allocation Strategy**:
```
3006: Case Managers Dashboard
3007: Case Managers WebSocket
3008: Readers Dashboard
3009: Readers WebSocket
3010: Clients Dashboard
3011: Clients WebSocket
```

### **7. Dependencies**
**Location**: `/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/package.json`

**Packages**:
- `fastify` - Web framework
- `@fastify/view` - EJS templating
- `@fastify/cors` - CORS support
- `@fastify/formbody` - Form parsing
- `@fastify/static` - Static files
- `pg` - PostgreSQL client
- `ejs` - Template engine
- `dotenv` - Environment variables
- `pino-pretty` - Logging

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Create Database**
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE qolae_readers;

-- Create user
CREATE USER readers_user WITH PASSWORD 'readers_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE qolae_readers TO readers_user;

-- Connect to database
\c qolae_readers

-- Run schema
\i /path/to/QOLAE-Readers-Dashboard/database/setup_qolae_readers.sql

-- Verify tables
\dt
```

### **Step 2: Install Dependencies**
```bash
cd /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard

# Install with yarn
yarn install

# Or with npm
npm install
```

### **Step 3: Configure Environment**
```bash
# Copy example env file
cp ../.env.example ../.env

# Edit with actual values
nano ../.env
```

**Update these values**:
```env
READERS_DATABASE_URL=postgresql://readers_user:YOUR_PASSWORD@localhost:5432/qolae_readers
JWT_SECRET=your-actual-secret-key-here
EMAIL_PASSWORD=your-actual-email-app-password
```

### **Step 4: Start Server (Development)**
```bash
# Start server
yarn start

# Or with auto-reload
yarn dev
```

**Expected Output**:
```
╔══════════════════════════════════════════════════╗
║   🏥 QOLAE CASE MANAGERS DASHBOARD STARTED     ║
╚══════════════════════════════════════════════════╝

📍 Server running at: http://0.0.0.0:3007
🌍 Environment: development
📊 Database: qolae_readers

Ready to register readers! 🚀
```

### **Step 5: Test Registration Flow**

**Test 1: Access Registration Card**
```
http://localhost:3006/readers-registration-card
```

**Test 2: Generate PIN (API)**
```bash
curl -X POST http://localhost:3006/api/case-managers/generate-reader-pin \
  -H "Content-Type: application/json" \
  -d '{"readerName":"John Smith"}'
```

**Expected Response**:
```json
{
  "success": true,
  "pin": "RDR-JS123456",
  "message": "Reader PIN generated successfully!"
}
```

**Test 3: Verify Medical Registration (API)**
```bash
curl -X POST http://localhost:3006/api/case-managers/verify-medical-registration \
  -H "Content-Type: application/json" \
  -d '{
    "registrationBody":"NMC",
    "registrationNumber":"12A3456E"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "verified": true,
  "name": "Registered Nurse",
  "registrationBody": "NMC",
  "registrationNumber": "12A3456E",
  "status": "Active"
}
```

**Test 4: Register Reader (API)**
```bash
curl -X POST http://localhost:3006/api/case-managers/register-reader \
  -H "Content-Type: application/json" \
  -d '{
    "readerPin":"RDR-JS123456",
    "readerName":"John Smith",
    "email":"john.smith@email.com",
    "phone":"+44 7700 900000",
    "readerType":"first_reader",
    "sendEmail":true
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "John Smith has been successfully registered!",
  "readerPin": "RDR-JS123456",
  "emailSent": true
}
```

### **Step 6: Production Deployment**

**PM2 Configuration** (add to ecosystem.config.js):
```javascript
{
  name: 'qolae-case-managers-dashboard',
  script: 'server.js',
  cwd: '/var/www/casemanagers.qolae.com/CaseManagersDashboard',
  instances: 1,
  env: {
    NODE_ENV: 'production',
    PORT: 3006
  }
}
```

**Nginx Configuration**:
```nginx
server {
    listen 443 ssl http2;
    server_name casemanagers.qolae.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Deploy Commands**:
```bash
# Copy files to server
scp -r CaseManagersDashboard root@91.99.184.77:/var/www/casemanagers.qolae.com/

# SSH into server
ssh root@91.99.184.77

# Navigate to directory
cd /var/www/casemanagers.qolae.com/CaseManagersDashboard

# Install dependencies
yarn install --production

# Set up .env
cp ../.env.example ../.env
nano ../.env

# Start with PM2
pm2 start server.js --name qolae-case-managers-dashboard
pm2 save
```

---

## 🔧 NEXT STEPS (NOT YET IMPLEMENTED)

### **1. Email Integration** ⏳
Currently email sending is logged but not sent. Need to integrate with existing email infrastructure:

**Location to update**: `CaseManagersController.js` (line ~270)
```javascript
// TODO: Integrate with existing email infrastructure
await sendReaderInvitationEmail(readerPin, readerName, email);
```

**Email Template Required**:
- Subject: "QOLAE Reader Access - NDA Signature Required"
- Body: Welcome message with hyperlinked PIN
- Link: `https://readers.qolae.com/login?pin=${readerPin}`

### **2. NMC/GMC API Integration** ⏳
Currently using mock verification. Need to integrate with real APIs:

**NMC API**: https://www.nmc.org.uk/registration/search-the-register/
**GMC API**: https://www.gmc-uk.org/registration-and-licensing/the-medical-register

**Location to update**: `CaseManagersController.js` (lines 56-94)

### **3. Readers Dashboard** ⏳
Build complete Readers Portal:
- 2FA authentication
- NDA workflow (similar to TOB)
- Report download
- Corrections submission
- Payment tracking

### **4. Report Assignment Workflow** ⏳
Build assignment interface in Case Managers Dashboard:
- Upload redacted report
- Select reader from pool
- Set deadline
- Send notification

### **5. Payment Approval Workflow** ⏳
Build payment management:
- View pending corrections
- Review corrections
- Approve payment
- Process payment (£50 or £75-100)

---

## 📊 DATABASE QUERIES (USEFUL FOR LIZ)

### **View All Registered Readers**
```sql
SELECT
  reader_pin,
  reader_name,
  email,
  reader_type,
  registration_verified,
  nda_signed,
  portal_access_status,
  created_at
FROM readers
ORDER BY created_at DESC;
```

### **View Readers Awaiting NDA Signature**
```sql
SELECT
  reader_pin,
  reader_name,
  email,
  created_at
FROM readers
WHERE nda_signed = FALSE
  AND portal_access_status = 'pending'
ORDER BY created_at ASC;
```

### **View Active Readers (Available for Assignment)**
```sql
SELECT
  reader_pin,
  reader_name,
  reader_type,
  specialization,
  total_assignments_completed,
  average_turnaround_hours
FROM readers
WHERE portal_access_status = 'active'
  AND nda_signed = TRUE
ORDER BY reader_type, reader_name;
```

### **View Payment Rates**
```sql
SELECT
  reader_type,
  COUNT(*) as reader_count,
  AVG(payment_rate) as avg_payment_rate,
  MIN(payment_rate) as min_payment_rate,
  MAX(payment_rate) as max_payment_rate
FROM readers
GROUP BY reader_type;
```

---

## ✅ SUMMARY

**Phase 1 Complete**:
- ✅ Database schema created (4 tables with triggers)
- ✅ Registration Card UI built (with NMC/GMC verification)
- ✅ Backend controller implemented (PIN generator + registration)
- ✅ API endpoints created (3 routes)
- ✅ Server configured (Fastify + EJS)
- ✅ Dependencies listed (package.json)
- ✅ Environment template created (.env.example)

**Architecture Pattern**:
- Self-contained (following Admin Dashboard pattern)
- PostgreSQL database: `qolae_readers`
- Port: 3006 (Case Managers Dashboard)
- Port: 3007 (Case Managers WebSocket)
- Port: 3008 (Readers Dashboard)
- Port: 3009 (Readers WebSocket)
- Port: 3010 (Clients Dashboard)
- Port: 3011 (Clients WebSocket)
- Domain: casemanagers.qolae.com

**Ready for Testing**: ✅ All core functionality built and ready to deploy!

**Next Phase**: Email integration + Readers Dashboard authentication + NDA workflow

---

**End of Setup Guide** 🎉
