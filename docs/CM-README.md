# 🎯 CASEMANAGERS-DASHBOARD COMPLETION PLAN
**Agent Name:** MERCURY  
**Branch Strategy:** Git Worktree (`feature/casemanagers-dashboard`)  
**Coordination:** QOLAE-MCP.md (Master Control Program)  
**Status:** Phase 1 Ready - 75% Complete  
**Last Updated:** October 31, 2025

---

## 📊 CURRENT STATUS OVERVIEW

### ✅ **COMPLETED INFRASTRUCTURE (October 12-13, 2025)**
| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Tab-Based Dashboard | ✅ DEPLOYED | casemanagers.qolae.com | 4 tabs: My Cases, Reader Mgmt, Approval Queue, CM Mgmt |
| Database Schema | ✅ CREATED | `qolae_casemanagers` | Tables: cases, ina_visits, ina_forms, ina_reports |
| PM2 Service | ✅ ONLINE | Port 3006 | `qolae-cm-dashboard` |
| WebSocket Server | ✅ DEPLOYED | Port 3007 | `socketCaseManagers.js` (api.qolae.com) |
| Pre-INA Contact Component | ✅ READY | `views/partials/pre-InaContact.ejs` | Built Oct 13, needs integration |
| Nginx Routing | ✅ CONFIGURED | casemanagers.qolae.com | SSL, proxy pass working |
| Reader Registration | 🟡 STARTED | 50% complete | Needs NDA generation + email |

### ❌ **MISSING CRITICAL COMPONENTS (Workflow Gaps)**
1. **Case Auto-Assignment** - Lawyers Dashboard → CaseManagers workspace bridge
2. **Backend Database Integration** - Replace sample data with real queries
3. **Pre-INA Contact Integration** - Connect the built component to My Cases tab
4. **INA Workflow (3 Modals)** - INA Checklist, INA Form, INA Report generation
5. **Medical Records Access** - Link to Lawyers Dashboard Document Library
6. **Reader Approval & Payment** - Complete approval queue functionality
7. **Blockchain Compliance** - SHA-256 hashing (match Lawyers Dashboard standard)
8. **WebSocket Real-Time Updates** - Integrate socketCaseManagers.js events

---

## 🚀 COMPLETION STRATEGY: 4-PHASE PARALLEL EXECUTION

**Approach:** Git Worktree + Named Subagents (MERCURY Team)  
**Method:** BMAD (Build, Measure, Analyze, Deploy)  
**Estimated Total Time:** 19-26 hours (spread across 4 agents)

---

## 📋 PHASE 1: CRITICAL INTEGRATION (Priority: 🔴 HIGH)
**Agent Assignment:** MERCURY-ALPHA  
**Branch:** `feature/casemanagers-integration`  
**Estimated Time:** 4-6 hours  
**Dependencies:** Lawyers Dashboard complete ✅

### 🎯 **Objectives:**
Connect CaseManagers-Dashboard to Lawyers Dashboard ecosystem with real-time data flow.

### 📦 **Deliverables:**

#### **1.1 Case Auto-Assignment Endpoint** (90 mins)
**Purpose:** Bridge Lawyers Dashboard referral → CaseManagers workspace

**Files to Create/Modify:**
```
📁 QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/
├── routes/caseManagerRoutes.js (ADD endpoint)
│   └── POST /api/case-managers/assign-case-auto
├── controllers/CaseManagersController.js (ADD logic)
│   └── assignCaseAutomatically()
│
📁 QOLAE-API-Dashboard/
└── routes/workspaceRoute.js (MODIFY)
    └── Trigger assignment after referral submission
```

**Workflow:**
1. Lawyer submits Case Referral form (referralModal.ejs)
2. API calls `POST /api/case-managers/assign-case-auto`
3. System auto-assigns to available CM (Liz initially)
4. Case data saved to `qolae_casemanagers.cases` table
5. WebSocket notifies CM: "NEW_CASE_ASSIGNED"
6. Returns assigned CM details to Lawyers Dashboard

**Endpoint Spec:**
```javascript
// REQUEST
POST /api/case-managers/assign-case-auto
Body: {
  lawyer_pin: 'CT-001234',
  client_name: 'Sarah Johnson',
  client_email: 'sarah@example.com',
  client_phone: '+44...',
  case_type: 'Personal Injury',
  referral_notes: 'Client suffered...',
  consent_status: 'pending'
}

// RESPONSE
{
  success: true,
  case_pin: 'CT-001234-C001',
  assigned_cm: 'Liz',
  cm_email: 'liz@qolae.com',
  estimated_contact_date: '2025-11-02',
  message: 'Case assigned successfully'
}
```

**Database Insert:**
```sql
INSERT INTO cases (
  case_pin, lawyer_pin, case_manager_name,
  client_name, client_email, client_phone,
  case_status, created_at, created_by
) VALUES (
  'CT-001234-C001', 'CT-001234', 'Liz',
  'Sarah Johnson', 'sarah@example.com', '+44...',
  'pending_consent', CURRENT_TIMESTAMP, 'System'
);
```

---

#### **1.2 Backend Database Integration** (2 hours)
**Purpose:** Replace sample data with real database queries

**Files to Update:**
```
📁 views/tabs/
├── my-cases-tab.ejs (MODIFY)
│   └── Fetch cases from qolae_casemanagers.cases
├── reader-management-tab.ejs (MODIFY)
│   └── Fetch readers from qolae_readers
├── approval-queue-tab.ejs (MODIFY)
│   └── Fetch pending approvals from reader_payments
└── cm-management-tab.ejs (MODIFY)
    └── Fetch CM workload metrics
```

**Database Queries Needed:**

**My Cases Tab:**
```sql
-- Fetch CM's assigned cases
SELECT 
  c.case_pin,
  c.client_name,
  c.case_status,
  c.consent_received,
  c.created_at,
  l.law_firm,
  l.contact_name as lawyer_name
FROM cases c
LEFT JOIN qolae_lawyers.lawyers l ON c.lawyer_pin = l.pin
WHERE c.case_manager_name = 'Liz'
ORDER BY c.created_at DESC;
```

**Approval Queue Tab:**
```sql
-- Fetch pending reader payments
SELECT 
  rp.id,
  rp.reader_pin,
  r.reader_name,
  rp.amount,
  rp.payment_type, -- 'first_reader' or 'second_reader'
  rp.case_pin,
  rp.created_at
FROM reader_payments rp
LEFT JOIN qolae_readers.readers r ON rp.reader_pin = r.pin
WHERE rp.status = 'pending_approval'
ORDER BY rp.created_at ASC;
```

**CM Management Tab:**
```sql
-- Fetch CM workload stats
SELECT 
  case_manager_name,
  COUNT(*) as total_cases,
  SUM(CASE WHEN case_status NOT IN ('case_closed') THEN 1 ELSE 0 END) as active_cases,
  SUM(CASE WHEN case_status = 'pending_consent' THEN 1 ELSE 0 END) as awaiting_consent,
  SUM(CASE WHEN case_status = 'consent_received' THEN 1 ELSE 0 END) as ready_for_ina
FROM cases
GROUP BY case_manager_name;
```

**Controller Methods to Add:**
```javascript
// CaseManagersController.js
async getMyCases(req, reply) {
  const { cmName } = req.query;
  const result = await pool.query(
    'SELECT * FROM cases WHERE case_manager_name = $1 ORDER BY created_at DESC',
    [cmName]
  );
  return reply.send({ success: true, cases: result.rows });
}

async getApprovalQueue(req, reply) {
  const result = await pool.query(
    `SELECT rp.*, r.reader_name FROM reader_payments rp
     LEFT JOIN qolae_readers.readers r ON rp.reader_pin = r.pin
     WHERE rp.status = 'pending_approval'`
  );
  return reply.send({ success: true, approvals: result.rows });
}
```

---

#### **1.3 Pre-INA Contact Integration** (1 hour)
**Purpose:** Integrate the Pre-INA Contact component built on Oct 13

**Integration Point:** My Cases Tab → Expandable Case Details

**Files to Modify:**
```
📁 views/tabs/
└── my-cases-tab.ejs (MODIFY)
    └── Add Pre-INA Contact section to expandable row

📁 routes/
└── caseManagerRoutes.js (ADD endpoint)
    └── POST /api/case-managers/pre-ina-contact

📁 controllers/
└── CaseManagersController.js (ADD method)
    └── savePreINAContact()
```

**Database Table:**
```sql
CREATE TABLE pre_ina_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_pin VARCHAR(20) REFERENCES cases(case_pin),
    
    -- Call Details
    call_date DATE NOT NULL,
    call_time TIME NOT NULL,
    call_duration INTEGER, -- minutes
    
    -- Call Outcome
    call_outcome VARCHAR(50) NOT NULL, 
    -- Options: 'Reached-Booking', 'Follow-up', 'Voicemail', 'No Answer', 'Wrong Number'
    
    -- Notes & Booking
    call_notes TEXT,
    ina_visit_date DATE,
    ina_visit_time TIME,
    
    -- Safety Assessment
    safety_concerns TEXT, -- aggressive animals, mental health, access issues
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL
);
```

**Integration Code (my-cases-tab.ejs):**
```html
<!-- Inside expandable case row -->
<div class="expanded-content" id="expanded-<%= case.case_pin %>" style="display: none;">
  
  <!-- Timeline Section (existing) -->
  <div class="timeline-section">
    <!-- ... existing timeline ... -->
  </div>
  
  <!-- Pre-INA Contact Section (NEW) -->
  <% if (case.case_status === 'consent_received' && !case.pre_ina_contact_completed) { %>
  <div class="pre-ina-contact-section" style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
    <h4 style="margin-bottom: 15px; color: #693382;">📞 Initial Client Contact</h4>
    <%- include('../partials/pre-InaContact.ejs', { casePin: case.case_pin }) %>
  </div>
  <% } %>
  
  <!-- Quick Actions (existing) -->
  <div class="quick-actions">
    <!-- ... existing actions ... -->
  </div>
  
</div>
```

---

#### **1.4 WebSocket Real-Time Integration** (90 mins)
**Purpose:** Enable real-time notifications and updates

**Files to Modify:**
```
📁 views/
└── casemanagers-dashboard.ejs (ADD WebSocket client)

📁 api.qolae.com/
└── socketCaseManagers.js (ADD event handlers)

📁 controllers/
└── CaseManagersController.js (EMIT events)
```

**WebSocket Client Connection:**
```javascript
// casemanagers-dashboard.ejs - Add to <script> section

const socket = io('https://api.qolae.com/ws-case-managers', {
    transports: ['websocket'],
    upgrade: false,
    withCredentials: true
});

// Connection events
socket.on('connect', () => {
    console.log('✅ WebSocket connected to Case Managers server');
    socket.emit('JOIN_CM_ROOM', { cmName: '<%= cmName %>', pin: '<%= pin %>' });
});

socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
});

// Real-time event handlers
socket.on('NEW_CASE_ASSIGNED', (data) => {
    console.log('🆕 New case assigned:', data);
    showToast(`New case assigned: ${data.client_name}`, 'success');
    refreshMyCasesTab();
    updateActionCenterBadge('new-cases', +1);
});

socket.on('CONSENT_RECEIVED', (data) => {
    console.log('✅ Consent received:', data);
    showToast(`Consent received for ${data.client_name}`, 'success');
    refreshMyCasesTab();
    playNotificationSound();
});

socket.on('INA_VISIT_REMINDER', (data) => {
    console.log('⏰ INA visit reminder:', data);
    showToast(`INA visit today: ${data.client_name} at ${data.visit_time}`, 'warning');
});

socket.on('READER_PAYMENT_PENDING', (data) => {
    console.log('💰 Reader payment approval needed:', data);
    showToast(`Reader payment approval needed: £${data.amount}`, 'info');
    updateActionCenterBadge('approvals', +1);
    refreshApprovalQueue();
});

socket.on('CASE_STATUS_UPDATE', (data) => {
    console.log('🔄 Case status updated:', data);
    updateCaseRow(data.case_pin, data.new_status);
});
```

**Server-Side Event Emitters (CaseManagersController.js):**
```javascript
// Import WebSocket server
import { emitToCaseManager } from '../../../api.qolae.com/socketCaseManagers.js';

// After assigning a new case
async assignCaseAutomatically(req, reply) {
  // ... assignment logic ...
  
  // Emit WebSocket event
  emitToCaseManager(assignedCM, 'NEW_CASE_ASSIGNED', {
    case_pin: newCase.case_pin,
    client_name: clientData.client_name,
    lawyer_firm: lawyerData.law_firm,
    timestamp: new Date().toISOString()
  });
  
  return reply.send({ success: true, case_pin: newCase.case_pin });
}

// When consent is received from Lawyers Dashboard
async notifyConsentReceived(req, reply) {
  const { case_pin, client_name } = req.body;
  
  // Update case status
  await pool.query(
    'UPDATE cases SET case_status = $1, consent_received = TRUE WHERE case_pin = $2',
    ['consent_received', case_pin]
  );
  
  // Emit to assigned CM
  const caseData = await getCaseDetails(case_pin);
  emitToCaseManager(caseData.case_manager_name, 'CONSENT_RECEIVED', {
    case_pin,
    client_name,
    timestamp: new Date().toISOString()
  });
}
```

---

### 🧪 **Phase 1 Testing Checklist**

**End-to-End Workflow Test:**
- [ ] Lawyer submits Case Referral (Lawyers Dashboard)
- [ ] Case appears in CM's "My Cases" tab (real-time)
- [ ] CM receives WebSocket notification
- [ ] Case data correctly stored in database
- [ ] CM can expand case row to see details
- [ ] Pre-INA Contact form displays when consent received
- [ ] CM can save Pre-INA contact details
- [ ] Database updates correctly
- [ ] WebSocket events trigger UI updates

**Database Verification:**
```sql
-- Verify case was created
SELECT * FROM cases WHERE lawyer_pin = 'TEST-PIN' ORDER BY created_at DESC LIMIT 1;

-- Verify Pre-INA contact saved
SELECT * FROM pre_ina_contacts WHERE case_pin = 'TEST-CASE-PIN';

-- Check WebSocket connection logs
-- (via pm2 logs qolae-wscasemanagers)
```

---

## 📋 PHASE 2: INA WORKFLOW (Priority: 🟡 MEDIUM)
**Agent Assignment:** MERCURY-BETA  
**Branch:** `feature/ina-workflow`  
**Estimated Time:** 6-8 hours  
**Dependencies:** Phase 1 complete

### 🎯 **Objectives:**
Build the complete INA clinical workflow: Checklist → Form → Report generation.

### 📦 **Deliverables:**

#### **2.1 INA Checklist Modal** (2 hours)
**Purpose:** Pre-visit preparation and safety assessment

**Files to Create:**
```
📁 views/modals/
└── ina-checklist-modal.ejs (NEW)

📁 routes/
└── caseManagerRoutes.js (ADD endpoints)
    ├── GET /ina-checklist-modal?case_pin=XXX
    └── POST /api/case-managers/save-ina-checklist

📁 controllers/
└── CaseManagersController.js (ADD methods)
    ├── getINAChecklist()
    └── saveINAChecklist()
```

**Database Table:**
```sql
CREATE TABLE ina_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_pin VARCHAR(20) REFERENCES cases(case_pin),
    
    -- Pre-Visit Preparation
    medical_records_reviewed BOOLEAN DEFAULT FALSE,
    consent_form_verified BOOLEAN DEFAULT FALSE,
    client_address_confirmed BOOLEAN DEFAULT FALSE,
    equipment_prepared BOOLEAN DEFAULT FALSE,
    
    -- Safety Assessment
    aggressive_animals BOOLEAN DEFAULT FALSE,
    aggressive_animals_notes TEXT,
    mental_health_concerns BOOLEAN DEFAULT FALSE,
    mental_health_notes TEXT,
    access_issues BOOLEAN DEFAULT FALSE,
    access_notes TEXT,
    
    -- Visit Planning
    planned_visit_date DATE,
    planned_visit_time TIME,
    estimated_duration INTEGER, -- minutes
    backup_plan TEXT,
    
    -- Equipment Checklist
    camera_checked BOOLEAN DEFAULT FALSE,
    recorder_checked BOOLEAN DEFAULT FALSE,
    consent_forms_printed BOOLEAN DEFAULT FALSE,
    ppe_prepared BOOLEAN DEFAULT FALSE,
    
    -- Additional Notes
    preparation_notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Modal Structure (5 Sections):**
```html
<!-- ina-checklist-modal.ejs -->
<div class="modal" id="inaChecklistModal">
  <div class="modal-content" style="max-width: 800px;">
    <div class="modal-header">
      <h2>INA Checklist - <%= clientName %></h2>
      <span class="close-btn">&times;</span>
    </div>
    
    <div class="modal-body">
      
      <!-- Section 1: Pre-Visit Preparation -->
      <div class="checklist-section">
        <h3>1. Pre-Visit Preparation</h3>
        <label><input type="checkbox" name="medical_records_reviewed"> Medical records reviewed</label>
        <label><input type="checkbox" name="consent_form_verified"> Consent form verified</label>
        <label><input type="checkbox" name="client_address_confirmed"> Client address confirmed</label>
        <label><input type="checkbox" name="equipment_prepared"> Equipment prepared</label>
      </div>
      
      <!-- Section 2: Safety Assessment -->
      <div class="checklist-section">
        <h3>2. Safety Assessment</h3>
        <label><input type="checkbox" name="aggressive_animals"> Aggressive animals present?</label>
        <textarea name="aggressive_animals_notes" placeholder="Details..."></textarea>
        
        <label><input type="checkbox" name="mental_health_concerns"> Mental health concerns?</label>
        <textarea name="mental_health_notes" placeholder="Details..."></textarea>
        
        <label><input type="checkbox" name="access_issues"> Access issues?</label>
        <textarea name="access_notes" placeholder="Details..."></textarea>
      </div>
      
      <!-- Section 3: Visit Planning -->
      <div class="checklist-section">
        <h3>3. Visit Planning</h3>
        <label>Planned Date: <input type="date" name="planned_visit_date"></label>
        <label>Planned Time: <input type="time" name="planned_visit_time"></label>
        <label>Estimated Duration: <input type="number" name="estimated_duration"> minutes</label>
        <label>Backup Plan: <textarea name="backup_plan"></textarea></label>
      </div>
      
      <!-- Section 4: Equipment Checklist -->
      <div class="checklist-section">
        <h3>4. Equipment Checklist</h3>
        <label><input type="checkbox" name="camera_checked"> Camera checked & charged</label>
        <label><input type="checkbox" name="recorder_checked"> Voice recorder ready</label>
        <label><input type="checkbox" name="consent_forms_printed"> Consent forms printed</label>
        <label><input type="checkbox" name="ppe_prepared"> PPE prepared (if needed)</label>
      </div>
      
      <!-- Section 5: Additional Notes -->
      <div class="checklist-section">
        <h3>5. Additional Notes</h3>
        <textarea name="preparation_notes" placeholder="Any additional preparation notes..."></textarea>
      </div>
      
    </div>
    
    <div class="modal-footer">
      <button class="btn-secondary" onclick="saveDraft()">Save Draft</button>
      <button class="btn-primary" onclick="markComplete()">Mark Complete & Continue to INA Form</button>
    </div>
  </div>
</div>
```

---

#### **2.2 INA Form Modal** (3 hours)
**Purpose:** Comprehensive clinical assessment form during home visit

**Files to Create:**
```
📁 views/modals/
└── ina-form-modal.ejs (NEW - Multi-section form)

📁 routes/
└── caseManagerRoutes.js (ADD endpoints)
    ├── GET /ina-form-modal?case_pin=XXX
    ├── POST /api/case-managers/save-ina-form-draft
    ├── POST /api/case-managers/submit-ina-form
    └── POST /api/case-managers/upload-ina-media

📁 controllers/
└── CaseManagersController.js (ADD methods)
```

**Database Table:**
```sql
CREATE TABLE ina_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_pin VARCHAR(20) REFERENCES cases(case_pin),
    
    -- Client Information (Auto-populated from consent)
    client_name VARCHAR(255),
    date_of_birth DATE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    
    -- Section 1: Accident/Injury Details
    accident_date DATE,
    accident_location TEXT,
    injury_description TEXT,
    immediate_treatment TEXT,
    
    -- Section 2: Medical History
    pre_existing_conditions TEXT,
    current_medications TEXT,
    previous_surgeries TEXT,
    allergies TEXT,
    
    -- Section 3: Current Health Status
    current_symptoms TEXT,
    pain_level INTEGER, -- 1-10 scale
    pain_description TEXT,
    mobility_assessment TEXT,
    daily_activities_impact TEXT,
    
    -- Section 4: Functional Assessment
    walking_ability VARCHAR(100),
    stair_climbing_ability VARCHAR(100),
    self_care_ability VARCHAR(100),
    work_impact TEXT,
    
    -- Section 5: Treatment & Therapy
    current_treatment TEXT,
    physiotherapy_details TEXT,
    specialist_consultations TEXT,
    future_treatment_planned TEXT,
    
    -- Section 6: Photos & Recordings
    photos_uploaded JSONB, -- Array of file paths
    recordings_uploaded JSONB, -- Array of file paths
    
    -- Section 7: Home Environment
    home_adaptations_needed TEXT,
    mobility_aids_used TEXT,
    safety_concerns TEXT,
    
    -- Section 8: Client Statement
    client_statement TEXT,
    specific_concerns TEXT,
    expectations TEXT,
    
    -- INA Expectations
    ina_specific_expectations TEXT, -- What does INA need to focus on?
    
    -- Form Status
    draft BOOLEAN DEFAULT TRUE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Blockchain
    form_hash VARCHAR(64) -- SHA-256 hash for blockchain compliance
);
```

**Modal Features:**
- 8 collapsible sections
- Auto-save every 30 seconds
- Photo/recording upload with preview
- Pain scale slider (1-10)
- Progress indicator
- Save draft / Submit final buttons
- Auto-populate from consent form data

---

#### **2.3 INA Report Generation** (3 hours)
**Purpose:** Auto-generate professional INA report from form data

**Files to Create:**
```
📁 views/modals/
└── ina-report-modal.ejs (NEW - Report template with rich text editor)

📁 routes/
└── caseManagerRoutes.js (ADD endpoints)
    ├── GET /ina-report-modal?case_pin=XXX
    ├── POST /api/case-managers/generate-ina-report
    ├── POST /api/case-managers/save-ina-report-draft
    └── POST /api/case-managers/submit-ina-report-final

📁 utils/
└── reportGenerator.js (NEW - Report auto-population logic)
```

**Database Table:**
```sql
CREATE TABLE ina_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_pin VARCHAR(20) REFERENCES cases(case_pin),
    ina_form_id UUID REFERENCES ina_forms(id),
    
    -- Report Sections (Auto-populated from INA Form)
    executive_summary TEXT,
    client_background TEXT,
    injury_details TEXT,
    medical_history TEXT,
    current_status TEXT,
    functional_assessment TEXT,
    treatment_received TEXT,
    prognosis TEXT,
    recommendations TEXT,
    
    -- Clinical Opinion
    cm_clinical_opinion TEXT,
    rehabilitation_needs TEXT,
    care_package_recommendations TEXT,
    
    -- Report Status
    draft BOOLEAN DEFAULT TRUE,
    sent_to_first_reader BOOLEAN DEFAULT FALSE,
    first_reader_feedback TEXT,
    sent_to_second_reader BOOLEAN DEFAULT FALSE,
    second_reader_feedback TEXT,
    report_finalized BOOLEAN DEFAULT FALSE,
    
    -- File Paths
    draft_report_path VARCHAR(500),
    final_report_path VARCHAR(500),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP,
    
    -- Blockchain
    report_hash VARCHAR(64) -- SHA-256 hash
);
```

**Report Generation Logic (reportGenerator.js):**
```javascript
// Auto-populate report sections from INA Form
export async function generateINAReport(inaFormData) {
  const report = {
    executive_summary: generateExecutiveSummary(inaFormData),
    client_background: generateClientBackground(inaFormData),
    injury_details: generateInjuryDetails(inaFormData),
    medical_history: generateMedicalHistory(inaFormData),
    current_status: generateCurrentStatus(inaFormData),
    functional_assessment: generateFunctionalAssessment(inaFormData),
    treatment_received: generateTreatmentSection(inaFormData),
    prognosis: '', // CM fills in manually
    recommendations: '', // CM fills in manually
  };
  
  return report;
}

function generateExecutiveSummary(data) {
  return `
    This Initial Needs Assessment report pertains to ${data.client_name}, 
    who sustained injuries on ${data.accident_date} at ${data.accident_location}.
    
    The client is currently experiencing ${data.current_symptoms} with a pain level 
    of ${data.pain_level}/10. This assessment was conducted to evaluate the client's 
    current needs and rehabilitation requirements.
  `;
}

// ... other generation functions ...
```

---

### 🧪 **Phase 2 Testing Checklist**

**INA Workflow Test:**
- [ ] CM completes INA Checklist
- [ ] INA Form opens with auto-populated client data
- [ ] CM can upload photos/recordings during visit
- [ ] Draft auto-saves every 30 seconds
- [ ] CM submits completed INA Form
- [ ] INA Report auto-generates from form data
- [ ] CM can edit and add clinical opinion
- [ ] Report draft saved to database
- [ ] Blockchain hash generated for report
- [ ] Case status updates to 'ina_completed'

---

## 📋 PHASE 3: READER MANAGEMENT (Priority: 🟡 MEDIUM)
**Agent Assignment:** MERCURY-GAMMA  
**Branch:** `feature/reader-workflow`  
**Estimated Time:** 4-5 hours  
**Dependencies:** Phase 2 complete (INA Reports ready)

### 🎯 **Objectives:**
Complete Reader registration → assignment → review → payment approval cycle.

### 📦 **Deliverables:**

#### **3.1 Reader Registration Completion** (2 hours)
**Purpose:** Complete the NDA generation and email workflow

**Files to Complete:**
```
📁 views/
└── readers-registration-card.ejs (COMPLETE existing partial)

📁 controllers/
└── CaseManagersController.js (ADD methods)
    ├── registerReader()
    ├── generateReaderNDA()
    └── sendReaderInvitation()
```

**Workflow:**
1. CM fills Reader Registration form
2. System generates Reader PIN (RD-XXXXXX)
3. NDA template auto-filled with reader details
4. Introductory email sent with NDA attachment
5. Reader receives email → clicks link → Readers Dashboard
6. Reader signs NDA → HR Compliance approval

**Integration with HR Compliance Dashboard:**
```javascript
// After reader registers
await axios.post('https://api.qolae.com/hr-compliance/register-reader', {
  reader_pin: newReaderPIN,
  reader_name: readerData.name,
  reader_email: readerData.email,
  medical_registration: readerData.nmc_number,
  nda_status: 'pending_signature'
});
```

---

#### **3.2 Reader Assignment System** (1.5 hours)
**Purpose:** Assign readers to completed INA reports

**Files to Create/Modify:**
```
📁 views/tabs/
└── approval-queue-tab.ejs (ADD reader assignment interface)

📁 controllers/
└── CaseManagersController.js (ADD methods)
    ├── assignFirstReader()
    ├── assignSecondReader()
    └── trackReaderDeadline()
```

**Database Table:**
```sql
CREATE TABLE reader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_pin VARCHAR(20) REFERENCES cases(case_pin),
    ina_report_id UUID REFERENCES ina_reports(id),
    
    -- Reader Assignment
    reader_pin VARCHAR(20), -- References qolae_readers.readers
    reader_type VARCHAR(20), -- 'first_reader' or 'second_reader'
    
    -- Status Tracking
    assignment_status VARCHAR(50) DEFAULT 'assigned', 
    -- Options: 'assigned', 'in_review', 'completed', 'overdue'
    
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMP, -- 24-48 hours from assignment
    completed_at TIMESTAMP,
    
    -- Feedback
    reader_feedback TEXT,
    amendments_requested TEXT,
    approved BOOLEAN,
    
    -- Payment
    payment_amount DECIMAL(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending', 
    -- Options: 'pending', 'approved', 'paid'
    
    created_by VARCHAR(255) NOT NULL
);
```

**Assignment Interface:**
```html
<!-- In approval-queue-tab.ejs -->
<div class="reader-assignment-section">
  <h3>Assign Readers to INA Report</h3>
  <p>Case: <%= casePin %> - <%= clientName %></p>
  
  <!-- First Reader Selection -->
  <div class="reader-selection">
    <label>First Reader (Non-Medical)</label>
    <select id="firstReaderSelect">
      <option value="">-- Select First Reader --</option>
      <% availableFirstReaders.forEach(reader => { %>
        <option value="<%= reader.pin %>">
          <%= reader.name %> - Current Load: <%= reader.active_cases %> cases
        </option>
      <% }); %>
    </select>
    <button onclick="assignFirstReader()">Assign & Send Report</button>
  </div>
  
  <!-- Second Reader Selection (enabled after first reader completes) -->
  <div class="reader-selection" <% if (!firstReaderCompleted) { %>disabled<% } %>>
    <label>Second Reader (Medical Professional)</label>
    <select id="secondReaderSelect">
      <option value="">-- Select Second Reader --</option>
      <% availableMedicalReaders.forEach(reader => { %>
        <option value="<%= reader.pin %>">
          <%= reader.name %> - <%= reader.specialization %> - Load: <%= reader.active_cases %>
        </option>
      <% }); %>
    </select>
    <button onclick="assignSecondReader()">Assign & Send Report</button>
  </div>
  
  <!-- Deadline Tracker -->
  <div class="deadline-tracker">
    <p>First Reader Deadline: <span id="firstReaderDeadline"></span></p>
    <p>Second Reader Deadline: <span id="secondReaderDeadline"></span></p>
  </div>
</div>
```

---

#### **3.3 Reader Payment Approval** (1.5 hours)
**Purpose:** Complete approval queue for reader payments

**Files to Modify:**
```
📁 views/tabs/
└── approval-queue-tab.ejs (ADD payment approval actions)

📁 controllers/
└── CaseManagersController.js (ADD methods)
    ├── approveReaderPayment()
    ├── rejectReaderPayment()
    └── processPayment()
```

**Approval Queue Actions:**
```javascript
async approveReaderPayment(req, reply) {
  const { assignment_id, approved_amount, payment_notes } = req.body;
  
  // Update payment status
  await pool.query(
    `UPDATE reader_assignments 
     SET payment_status = 'approved', payment_amount = $1 
     WHERE id = $2`,
    [approved_amount, assignment_id]
  );
  
  // Emit WebSocket event
  emitToCaseManager('Liz', 'PAYMENT_APPROVED', {
    assignment_id,
    amount: approved_amount
  });
  
  // TODO: Integrate with payment processing system
  // await processPaymentToReader(reader_pin, approved_amount);
  
  return reply.send({ success: true, message: 'Payment approved' });
}
```

---

### 🧪 **Phase 3 Testing Checklist**

**Reader Workflow Test:**
- [ ] CM registers new reader
- [ ] Reader PIN generated correctly
- [ ] NDA auto-generated and sent via email
- [ ] Reader appears in Reader Management tab
- [ ] CM can assign first reader to INA report
- [ ] Reader receives report via Readers Dashboard
- [ ] First reader submits feedback
- [ ] CM can assign second reader
- [ ] Second reader reviews and approves
- [ ] Payment approval appears in approval queue
- [ ] Liz approves reader payment
- [ ] Payment status updates correctly

---

## 📋 PHASE 4: BLOCKCHAIN & SECURITY (Priority: 🟡 MEDIUM)
**Agent Assignment:** MERCURY-DELTA  
**Branch:** `feature/blockchain-compliance`  
**Estimated Time:** 3-4 hours  
**Dependencies:** Can run parallel with Phase 2/3

### 🎯 **Objectives:**
Match Lawyers Dashboard blockchain compliance standards with SHA-256 hashing and audit trails.

### 📦 **Deliverables:**

#### **4.1 Blockchain Hash Implementation** (2 hours)
**Purpose:** Add SHA-256 hashing to all critical data

**Files to Update:**
```
📁 views/modals/
├── ina-form-modal.ejs (ADD blockchain badge)
├── ina-report-modal.ejs (ADD blockchain badge)
└── (All modals with sensitive data)

📁 views/partials/
└── pre-InaContact.ejs (ADD hashing)

📁 controllers/
└── CaseManagersController.js (ADD hash generation)
```

**Reuse from Lawyers Dashboard:**
```javascript
// Add to all sensitive data submissions
async function generateHash(data) {
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Example: Hash INA Form data before submission
async function submitINAForm() {
  const formData = collectINAFormData();
  
  // Generate blockchain hash
  const inaFormRecord = {
    case_pin: formData.case_pin,
    client_name: formData.client_name,
    accident_date: formData.accident_date,
    timestamp: new Date().toISOString()
  };
  
  const inaFormHash = await generateHash(inaFormRecord);
  console.log('🔐 INA Form hash generated:', inaFormHash);
  
  // Include hash in submission
  formData.form_hash = inaFormHash;
  
  // Submit to backend
  await fetch('/api/case-managers/submit-ina-form', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  
  // Display hash in completion screen
  showBlockchainBadge(inaFormHash);
}
```

**Blockchain Badge Component:**
```html
<!-- Add to completion screens in all modals -->
<div style="margin-top: 20px; padding: 15px; background: rgba(139, 92, 246, 0.05); 
     border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 8px;">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
    <span style="font-size: 1.2rem;">🔐</span>
    <strong style="color: #8b5cf6;">Blockchain Protected</strong>
  </div>
  <div style="font-size: 0.85rem; color: #64748b; line-height: 1.6; margin-bottom: 10px;">
    This <%= recordType %> has been cryptographically hashed using SHA-256 
    for immutable verification and audit trail compliance.
  </div>
  <div style="font-size: 0.75rem; color: #8b5cf6; word-break: break-all; 
       font-family: 'Courier New', monospace; background: white; padding: 8px; border-radius: 4px;">
    <strong>Hash:</strong> <span id="recordHash">Generating...</span>
  </div>
</div>
```

**Data to Hash:**
- Pre-INA Contact records
- INA Form submissions
- INA Report completions
- Reader assignments
- Reader feedback
- Payment approvals
- Case status changes

---

#### **4.2 Audit Trail System** (1.5 hours)
**Purpose:** Track all CM actions for GDPR compliance

**Database Table:**
```sql
CREATE TABLE cm_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Who & What
    cm_name VARCHAR(255) NOT NULL,
    cm_pin VARCHAR(20),
    action VARCHAR(100) NOT NULL,
    -- Actions: 'case_assigned', 'pre_ina_contact', 'ina_checklist_completed',
    --          'ina_form_submitted', 'ina_report_generated', 'reader_assigned',
    --          'reader_payment_approved', 'case_closed'
    
    -- Context
    case_pin VARCHAR(20),
    target_entity VARCHAR(100), -- 'case', 'reader', 'report', etc.
    target_id UUID,
    
    -- Details
    action_data JSONB, -- Full action details
    blockchain_hash VARCHAR(64), -- SHA-256 hash of action
    
    -- Metadata
    ip_address VARCHAR(50),
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing
    CONSTRAINT fk_case FOREIGN KEY (case_pin) REFERENCES cases(case_pin)
);

-- Indexes for fast querying
CREATE INDEX idx_audit_cm_name ON cm_audit_log(cm_name);
CREATE INDEX idx_audit_case_pin ON cm_audit_log(case_pin);
CREATE INDEX idx_audit_action ON cm_audit_log(action);
CREATE INDEX idx_audit_created_at ON cm_audit_log(created_at);
```

**Audit Logging Function:**
```javascript
// controllers/CaseManagersController.js
async logAuditEvent(cmName, action, contextData) {
  const auditRecord = {
    cm_name: cmName,
    action: action,
    case_pin: contextData.case_pin || null,
    target_entity: contextData.entity_type,
    target_id: contextData.entity_id,
    action_data: contextData,
    timestamp: new Date().toISOString()
  };
  
  // Generate blockchain hash
  const auditHash = await generateHash(auditRecord);
  
  // Store in database
  await pool.query(
    `INSERT INTO cm_audit_log 
     (cm_name, action, case_pin, target_entity, target_id, action_data, blockchain_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      auditRecord.cm_name,
      auditRecord.action,
      auditRecord.case_pin,
      auditRecord.target_entity,
      auditRecord.target_id,
      JSON.stringify(auditRecord.action_data),
      auditHash
    ]
  );
  
  console.log(`📝 Audit logged: ${action} by ${cmName} - Hash: ${auditHash.substring(0, 16)}...`);
}

// Usage examples:
await logAuditEvent('Liz', 'case_assigned', {
  case_pin: 'CT-001234-C001',
  entity_type: 'case',
  entity_id: caseId,
  lawyer_pin: 'CT-001234',
  client_name: 'Sarah Johnson'
});

await logAuditEvent('Liz', 'reader_payment_approved', {
  case_pin: 'CT-001234-C001',
  entity_type: 'reader_payment',
  entity_id: paymentId,
  reader_pin: 'RD-000123',
  amount: 450.00,
  payment_type: 'first_reader'
});
```

**Audit Query Interface (for Liz):**
```javascript
// View audit trail for a specific case
async getCaseAuditTrail(casePin) {
  const result = await pool.query(
    `SELECT * FROM cm_audit_log 
     WHERE case_pin = $1 
     ORDER BY created_at DESC`,
    [casePin]
  );
  return result.rows;
}

// View CM activity summary
async getCMAuditSummary(cmName, startDate, endDate) {
  const result = await pool.query(
    `SELECT 
       action,
       COUNT(*) as action_count,
       MIN(created_at) as first_action,
       MAX(created_at) as last_action
     FROM cm_audit_log
     WHERE cm_name = $1 
       AND created_at BETWEEN $2 AND $3
     GROUP BY action
     ORDER BY action_count DESC`,
    [cmName, startDate, endDate]
  );
  return result.rows;
}
```

---

### 🧪 **Phase 4 Testing Checklist**

**Blockchain & Security Test:**
- [ ] All critical actions generate SHA-256 hashes
- [ ] Hashes stored correctly in database
- [ ] Blockchain badges display in completion screens
- [ ] Audit logs capture all CM actions
- [ ] Audit trail queryable by case PIN
- [ ] CM activity summary reports work
- [ ] Hashes are immutable (cannot be modified)
- [ ] GDPR compliance verified

---

## 🔧 GIT WORKTREE SETUP INSTRUCTIONS

### **Create Isolated Feature Branches:**

```bash
# Navigate to main repo
cd /Users/lizchukwu_1/QOLAE-Online-Portal

# Create worktree for Phase 1 (MERCURY-ALPHA)
git worktree add ../QOLAE-CM-Integration feature/casemanagers-integration
cd ../QOLAE-CM-Integration
# MERCURY-ALPHA works here

# Create worktree for Phase 2 (MERCURY-BETA)
git worktree add ../QOLAE-CM-INA feature/ina-workflow
cd ../QOLAE-CM-INA
# MERCURY-BETA works here

# Create worktree for Phase 3 (MERCURY-GAMMA)
git worktree add ../QOLAE-CM-Readers feature/reader-workflow
cd ../QOLAE-CM-Readers
# MERCURY-GAMMA works here

# Create worktree for Phase 4 (MERCURY-DELTA)
git worktree add ../QOLAE-CM-Blockchain feature/blockchain-compliance
cd ../QOLAE-CM-Blockchain
# MERCURY-DELTA works here
```

### **Merge Strategy:**
```bash
# After each phase completes:
git checkout main
git merge feature/casemanagers-integration --no-ff -m "Phase 1: Critical Integration"
git merge feature/ina-workflow --no-ff -m "Phase 2: INA Workflow"
git merge feature/reader-workflow --no-ff -m "Phase 3: Reader Management"
git merge feature/blockchain-compliance --no-ff -m "Phase 4: Blockchain Compliance"

# Push to remote
git push origin main
```

---

## 🎯 SUBAGENT COORDINATION (BMAD Method)

### **BUILD (Development Phase)**
**Timeline:** Phases 1-4 run in parallel worktrees

| Agent | Branch | Focus | Communication |
|-------|--------|-------|---------------|
| **MERCURY-ALPHA** | feature/casemanagers-integration | Phase 1: Critical Integration | Reports to MERCURY Prime |
| **MERCURY-BETA** | feature/ina-workflow | Phase 2: INA Workflow | Reports to MERCURY Prime |
| **MERCURY-GAMMA** | feature/reader-workflow | Phase 3: Reader Management | Reports to MERCURY Prime |
| **MERCURY-DELTA** | feature/blockchain-compliance | Phase 4: Blockchain & Security | Reports to MERCURY Prime |

### **MEASURE (Testing Phase)**
**After each phase completes:**
- [ ] Run unit tests
- [ ] Database integration tests
- [ ] End-to-end workflow tests
- [ ] Performance benchmarks
- [ ] Browser compatibility tests

### **ANALYZE (Review Phase)**
**After all phases complete:**
- [ ] Code review across all branches
- [ ] Architecture validation
- [ ] Security audit
- [ ] GDPR compliance check
- [ ] Performance optimization

### **DEPLOY (Production Phase)**
**Deployment Order:**
1. Database migrations (all tables)
2. Phase 1 (Critical Integration) - Deploy first, test
3. Phase 4 (Blockchain) - Deploy second, audit
4. Phase 2 (INA Workflow) - Deploy third, test end-to-end
5. Phase 3 (Reader Management) - Deploy final, complete testing

---

## 📊 PROGRESS TRACKING

### **Completion Metrics:**

**Phase 1 (Critical Integration):**
- [ ] Case Auto-Assignment: 0% → Target: 100%
- [ ] Backend Database Integration: 0% → Target: 100%
- [ ] Pre-INA Contact Integration: 0% → Target: 100%
- [ ] WebSocket Real-Time: 0% → Target: 100%

**Phase 2 (INA Workflow):**
- [ ] INA Checklist Modal: 0% → Target: 100%
- [ ] INA Form Modal: 0% → Target: 100%
- [ ] INA Report Generation: 0% → Target: 100%

**Phase 3 (Reader Management):**
- [ ] Reader Registration Complete: 50% → Target: 100%
- [ ] Reader Assignment System: 0% → Target: 100%
- [ ] Reader Payment Approval: 0% → Target: 100%

**Phase 4 (Blockchain & Security):**
- [ ] Blockchain Hash Implementation: 0% → Target: 100%
- [ ] Audit Trail System: 0% → Target: 100%

---

## 🚀 DEPLOYMENT CHECKLIST (When Ready)

### **Pre-Deployment:**
- [ ] All phases tested locally
- [ ] Database migrations prepared
- [ ] Nginx config updated
- [ ] PM2 ecosystem.config.js updated
- [ ] WebSocket server tested
- [ ] SSL certificates verified

### **Deployment Steps:**
```bash
# 1. Deploy database migrations
ssh root@91.99.184.77
cd /var/www/casemanagers.qolae.com/CaseManagersDashboard
psql -U postgres -d qolae_casemanagers -f database/add_ina_tables.sql

# 2. Upload new files
scp -r views/ root@91.99.184.77:/var/www/casemanagers.qolae.com/CaseManagersDashboard/
scp -r routes/ root@91.99.184.77:/var/www/casemanagers.qolae.com/CaseManagersDashboard/
scp -r controllers/ root@91.99.184.77:/var/www/casemanagers.qolae.com/CaseManagersDashboard/

# 3. Restart PM2
cd /root
pm2 flush
pm2 restart ecosystem.config.js --update-env

# 4. Verify
pm2 list
pm2 logs qolae-cm-dashboard --lines 50
curl https://casemanagers.qolae.com/case-managers-dashboard
```

### **Post-Deployment Verification:**
- [ ] Dashboard loads without errors
- [ ] All 4 tabs functional
- [ ] Database connections working
- [ ] WebSocket events triggering
- [ ] Case assignment workflow tested
- [ ] INA workflow tested end-to-end
- [ ] Reader management tested
- [ ] Blockchain hashes generating
- [ ] Audit logs recording

---

## 📝 NOTES FOR SUBAGENTS

### **Coding Standards:**
- ✅ ES6 modules (import/export)
- ✅ Location Block comments for organization
- ✅ Comprehensive error handling
- ✅ Console logging for debugging
- ✅ GDPR-compliant data handling
- ✅ Blockchain hashing for sensitive data
- ✅ WebSocket events for real-time updates

### **Database Best Practices:**
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Add indexes for frequently queried columns
- ✅ Use JSONB for flexible data storage
- ✅ Add foreign key constraints
- ✅ Include created_at/updated_at timestamps
- ✅ Add blockchain_hash columns

### **Integration Points:**
- **Lawyers Dashboard:** Case referral triggers auto-assignment
- **Readers Dashboard:** Reader assignments trigger notifications
- **HR Compliance Dashboard:** Reader registration triggers approval flow
- **API Dashboard (SSOT):** All cross-dashboard data queries

### **Communication Channels:**
- **WebSocket Events:** Real-time notifications
- **Database Triggers:** Automated workflows
- **API Endpoints:** Cross-dashboard integration
- **Audit Logs:** Complete action history

---

## 🎉 SUCCESS CRITERIA

**CaseManagers-Dashboard is COMPLETE when:**

✅ **Phase 1 Complete:**
- Cases auto-assign from Lawyers Dashboard
- Real database integration working
- Pre-INA Contact form functional
- WebSocket real-time updates working

✅ **Phase 2 Complete:**
- INA Checklist modal working
- INA Form modal with photo/recording upload
- INA Report auto-generation functional

✅ **Phase 3 Complete:**
- Reader registration with NDA generation
- Reader assignment to reports
- Reader payment approval workflow

✅ **Phase 4 Complete:**
- All critical data blockchain-protected
- Audit trail capturing all actions
- GDPR compliance verified

✅ **Overall Success:**
- End-to-end workflow tested (Lawyer referral → CM contact → INA → Report → Reader review → Final delivery)
- All 4 phases deployed to live server
- PM2 processes stable
- WebSocket events working
- Database performance optimized
- Security audit passed
- Liz can manage cases efficiently! 🎯

---

## 📞 CONTACT & SUPPORT

**MERCURY Prime (Main Coordinator):** Cursor Claude  
**Deployment Server:** 91.99.184.77 (Hetzner)  
**PM2 Process:** qolae-cm-dashboard (Port 3006)  
**WebSocket Server:** qolae-wscasemanagers (Port 3007)  
**Live URL:** https://casemanagers.qolae.com

**Documentation References:**
- `CaseManagersWorkflow.md` - Complete workflow details
- `DEPLOYMENT_CHECKLIST.md` - Deployment instructions
- `QOLAE-MCP.md` - Master Control Program rules

---

**Ready to build, Liz!** 🚀  
Sleep well, and when you return, the MERCURY team will be ready to execute! 💪🏽✨

**Last Updated:** October 31, 2025 - 02:30 AM  
**Status:** Ready for parallel subagent execution  
**Estimated Completion:** 19-26 hours (across 4 agents)

