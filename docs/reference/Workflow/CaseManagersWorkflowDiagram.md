# QOLAE Case Managers Workflow - Visual Diagram
**Role-Based Access Control: Management vs Operational Separation**

---

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🏢 QOLAE CASE MANAGEMENT WORKFLOW                      │
│                         Strategic vs Operational Separation                      │
└─────────────────────────────────────────────────────────────────────────────────┘


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔐 PHASE 1: BUSINESS DEVELOPMENT & MARKETING                                  ┃
┃  [MANAGEMENT ONLY - LIZ]                                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
         │
         │  Step 1: Marketing & Outreach
         │  ├─ Web, Telephone, Email outreach to Law Firms
         │  └─ Strategic business development
         │
         ▼
    ┌─────────────────┐
    │  Admin Portal   │ 🔐 Liz Only
    │   (Admin DB)    │
    └─────────────────┘
         │
         │  Step 2: Lawyer Registration
         │  ├─ Law Firm details entered
         │  └─ Auto-generate PIN → Lawyers Tracking DB
         │
         ▼
    ┌─────────────────────────┐
    │ Lawyers Tracking DB     │ 🔐 Liz Only
    │ (LTDb)                  │
    │ ├─ Status updates       │
    │ ├─ Follow-ups           │
    │ ├─ Notes                │
    │ └─ Document repo        │
    └─────────────────────────┘
         │
         │  Steps 3-6: Marketing Process
         │  ├─ Generate PIN email
         │  ├─ Send CV, TOB, Case Studies
         │  └─ Follow-up management
         │
         ▼
    ┌──────────────────────────┐
    │  Email with Hyperlinked  │ ✉️ Sent to Law Firm
    │  PIN + Documents         │
    └──────────────────────────┘
         │
         │
         │ ⏱️ Law Firm decides to engage...
         │
         ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔐 PHASE 2: CASE ALLOCATION & OVERSIGHT                                       ┃
┃  [MANAGEMENT ONLY - LIZ]                                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
         │
         │  Step 8: Lawyer engages QOLAE
         │  ├─ Lawyer signs TOB
         │  └─ Payment processed
         │
         ▼
    ┌─────────────────────────┐
    │  💰 Payment Notification │ 🔐 Liz receives alert
    └─────────────────────────┘
         │
         │  Step 9: Case Assignment
         │  ├─ System notifies: Liz + other CMs
         │  └─ 🔐 LIZ MUST SELECT who gets case
         │
         ▼
    ┌──────────────────────────────────────────────┐
    │      ⚡ HANDOFF POINT                        │
    │   Management → Operations                    │
    │   Case assigned to: _____________            │
    └──────────────────────────────────────────────┘
         │
         │
         ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👥 PHASE 3: OPERATIONAL CASE MANAGEMENT                                       ┃
┃  [DELEGATABLE TO CASE MANAGERS]                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
         │
         │  Step 10: Client Data Access
         │  ├─ Lawyer submits Consent form with client details
         │  └─ Auto-populates: INA Referral, INA Form, Checklist, Report
         │
         ▼
    ┌─────────────────────────────────────┐
    │  Case Manager's Workspace           │ 👥 CM Access
    │  (qolae_casemanagers DB)            │
    │  ├─ Client data                     │
    │  ├─ INA Referral                    │
    │  ├─ INA Checklist                   │
    │  └─ INA Report template             │
    └─────────────────────────────────────┘
         │
         │  Step 11: Initial Client Contact
         │  ├─ CM calls client
         │  ├─ Introduces self, answers questions
         │  └─ Books INA visit appointment
         │
         ▼
         │
         │ 🚧 PARALLEL PROCESS: Reader Registration (Management Task)
         │
         ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔐 PHASE 4: READER REGISTRATION & HR COMPLIANCE                               ┃
┃  [MANAGEMENT ONLY - LIZ]                                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
         │
         │  Step 12: Reader Registration
         │  ├─ 🔐 Liz registers Readers
         │  ├─ Auto-generate Reader PIN
         │  ├─ Generate customized NDA
         │  └─ Send invitation email with hyperlinked PIN
         │
         ▼
    ┌──────────────────────────────────────┐
    │  📧 Reader Invitation Email          │
    │  ├─ Hyperlinked PIN                  │
    │  └─ NDA attachment                   │
    └──────────────────────────────────────┘
         │
         │  Reader clicks PIN → Login Portal
         │  ├─ 2FA authentication
         │  ├─ Password creation
         │  └─ Redirected to HR COMPLIANCE GATE ⚠️
         │
         ▼
    ┌──────────────────────────────────────┐
    │  📋 HR Compliance Gate               │
    │  (readers.qolae.com/compliance)      │
    │  Reader must submit:                 │
    │  ├─ CV (PDF upload)                  │
    │  └─ 2 References (contact details)   │
    │      • 1 Professional                │
    │      • 1 Character                   │
    └──────────────────────────────────────┘
         │
         │  ⚠️ Reader BLOCKED from dashboard until compliance approved
         │
         ▼
    ┌──────────────────────────────────────┐
    │  🔔 Notification to Liz              │
    │  "[Reader Name] - Compliance         │
    │   Submitted" (pending)               │
    └──────────────────────────────────────┘
         │
         │  Step 12a-12b: Liz's Compliance Review
         │  
         ▼
    ┌─────────────────────────────────────────────────────────┐
    │  🔐 Liz's Compliance Review Dashboard                   │
    │  (qolae_hrcompliance DB - SEPARATE & SECURE)            │
    │                                                          │
    │  Step 1: Initial Review                                 │
    │  ├─ View/Download Reader CV                             │
    │  ├─ Professional reference details                      │
    │  └─ Character reference details                         │
    │                                                          │
    │  Step 2: Reference Collection (Flexible)                │
    │  ┌─────────────────────────────────────────────┐        │
    │  │ Option A: Phone Reference (Preferred)       │        │
    │  │ 1. Liz calls referee                        │        │
    │  │ 2. Liz fills form during call               │        │
    │  │ 3. System emails PRE-FILLED form to referee │        │
    │  │ 4. Referee reviews & signs (30 seconds)     │        │
    │  │ 5. Signed reference saved to DB             │        │
    │  │ 6. Notification to Liz                      │        │
    │  └─────────────────────────────────────────────┘        │
    │  ┌─────────────────────────────────────────────┐        │
    │  │ Option B: Email Reference (if preferred)    │        │
    │  │ 1. Referee prefers no phone call            │        │
    │  │ 2. Liz sends BLANK form via email           │        │
    │  │ 3. Referee fills out & signs                │        │
    │  │ 4. Signed reference saved to DB             │        │
    │  │ 5. Notification to Liz                      │        │
    │  └─────────────────────────────────────────────┘        │
    │                                                          │
    │  Step 3: Final Approval                                 │
    │  ├─ ✓ CV reviewed                                       │
    │  ├─ ✓ Professional reference received & signed          │
    │  ├─ ✓ Character reference received & signed             │
    │  └─ 🔐 Liz clicks "Approve Compliance"                  │
    │                                                          │
    │  ⚡ Actions Triggered:                                   │
    │  ├─ Compliance record LOCKED (audit-ready)              │
    │  ├─ Reader account fully activated                      │
    │  ├─ Email to Reader: "Compliance approved"              │
    │  └─ Status: "[Reader Name] - Compliance Approved ✓"     │
    └─────────────────────────────────────────────────────────┘
         │
         │  🔒 Security & Audit:
         │  ├─ HR data in separate qolae_hrcompliance DB
         │  ├─ Only CMs have access
         │  ├─ Audit log: who/what/when
         │  └─ Readers do NOT see their own compliance records
         │
         ▼
         │
         │ ✅ Reader compliance approved → Continue case workflow
         │
         ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  👥 PHASE 5: INA ASSESSMENT & CLINICAL WORK                                    ┃
┃  [DELEGATABLE TO CASE MANAGERS]                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
         │
         │  Step 13: Medical Records Review
         │  ├─ Consent received → CM signature auto-applied
         │  ├─ CM accesses medical notes from Lawyers Dashboard
         │  └─ Details added to INA form
         │
         ▼
    ┌─────────────────────────────────────┐
    │  Lawyers Dashboard Documents        │ 👥 CM Access
    │  ├─ Medical notes                   │
    │  ├─ Consent forms                   │
    │  └─ Case documentation              │
    └─────────────────────────────────────┘
         │
         │  Step 14: Lawyer Communication
         │  └─ System email: "What's next"
         │
         ▼
         │
         │  Step 15: INA Assessment Execution
         │  ├─ CM fills INA Checklist (day before)
         │  ├─ Home visit to client
         │  ├─ Complete INA Form
         │  ├─ Take photos/recordings
         │  └─ Upload to portal
         │
         ▼
    ┌─────────────────────────────────────┐
    │  INA Form Completed                 │ 👥 CM Work
    └─────────────────────────────────────┘
         │
         │  Step 16: Auto-Population
         │  └─ INA Form data → INA Report
         │
         ▼
         │
         │  Step 17: Medical Research & Coordination
         │  ├─ CM conducts research
         │  └─ Calls: GPs, Specialists, Physios, etc.
         │
         ▼
         │
         │  Step 18: INA Report Completion
         │  ├─ CM completes report
         │  └─ Rehabilitation recommendations
         │
         ▼
    ┌─────────────────────────────────────┐
    │  📄 INA Report DRAFT COMPLETE       │ 👥 CM Deliverable
    └─────────────────────────────────────┘
         │
         │
         ▼

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔐 PHASE 6: REVIEW PROCESS & FINANCIAL APPROVALS                              ┃
┃  [MANAGEMENT ONLY - LIZ]                                                        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
         │
         │  Step 19: First Reader Review
         │  ├─ Redacted draft → First Reader (non-medical)
         │  ├─ 24-48 hour deadline
         │  ├─ Amended copy returned
         │  └─ 🔐 Liz approves payment to First Reader 💰
         │
         ▼
    ┌─────────────────────────────────────┐
    │  First Reader Payment Approved      │ 🔐 Liz Only
    │  £50 per report                     │
    └─────────────────────────────────────┘
         │
         │
         │  Step 20: Second Reader Review
         │  ├─ Second draft → Second Reader (medical professional)
         │  ├─ 24-48 hour deadline
         │  ├─ Clinical review & amendments
         │  └─ 🔐 Liz approves payment to Second Reader 💰
         │
         ▼
    ┌─────────────────────────────────────┐
    │  Second Reader Payment Approved     │ 🔐 Liz Only
    │  £75-100 per report                 │
    └─────────────────────────────────────┘
         │
         │
         │  Step 21: Final Report & Business Closure
         │  ├─ Final draft amended & corrected
         │  ├─ Signed by Liz (or authorized CM)
         │  ├─ Report uploaded to Lawyers portal
         │  ├─ Email triggered with download link
         │  ├─ 🔐 Liz approves expenses
         │  └─ 🔐 Liz approves 25% final payment to Law Firm 💰
         │
         ▼
    ┌─────────────────────────────────────┐
    │  📄 Final Report Delivered          │
    │  💰 Final Payment Approved          │ 🔐 Liz Only
    │  📧 Confirmation Email Sent         │
    │  ✅ Case CLOSED                     │
    └─────────────────────────────────────┘
         │
         │
         ▼
    ┌─────────────────────────────────────┐
    │  🎯 Target: 10 days                 │
    │  ⏰ Max cycle: 28 days               │
    └─────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════════════════════
                              📊 WORKFLOW BREAKDOWN
═══════════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          MANAGEMENT vs OPERATIONAL SPLIT                         │
└─────────────────────────────────────────────────────────────────────────────────┘

🔐 MANAGEMENT ONLY (LIZ)                        👥 DELEGATABLE TO CASE MANAGERS
━━━━━━━━━━━━━━━━━━━━━━━━                        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Marketing & Outreach (Steps 1-6)      Phase 3: Client Contact (Steps 10-11)
├─ Law firm prospecting                        ├─ Client introduction calls
├─ Lawyer registration                         ├─ INA appointment booking
├─ Tracking database management                └─ Calendar management
├─ Marketing materials                         
├─ Email campaigns                             Phase 5: Clinical Work (Steps 13-18)
└─ Follow-ups                                  ├─ Medical records review
                                                ├─ INA assessment execution
Phase 2: Case Allocation (Steps 8-9)           ├─ Home visits
├─ Payment monitoring                          ├─ Medical research
└─ Workload distribution                       ├─ Coordination with healthcare providers
                                                └─ INA report completion
Phase 4: HR Compliance (Steps 12, 12a-12b)     
├─ Reader registration                         
├─ Compliance review                           
├─ Reference collection                        
└─ Approval decisions                          

Phase 6: Financial Approvals (Steps 19-21)     
├─ First Reader payment
├─ Second Reader payment
├─ Final invoice approval
└─ Expense authorization


═══════════════════════════════════════════════════════════════════════════════════
                                  ⚖️ WORKLOAD SPLIT
═══════════════════════════════════════════════════════════════════════════════════

    🔐 MANAGEMENT (Liz)                      👥 OPERATIONAL (Delegatable)
    ═══════════════════════                  ═══════════════════════════════

    40% of workflow                          60% of workflow
    
    ├─ Strategic decisions                   ├─ Client interactions
    ├─ Financial authority                   ├─ Clinical assessments
    ├─ HR & compliance                       ├─ Medical research
    ├─ Business development                  ├─ Report writing
    └─ Payment approvals                     └─ Data entry


═══════════════════════════════════════════════════════════════════════════════════
                              🚀 SCALABILITY STRATEGY
═══════════════════════════════════════════════════════════════════════════════════

As QOLAE Grows:

1. 🔐 Liz retains full control over:
   ├─ Business development & marketing
   ├─ Case allocation decisions
   ├─ All financial approvals & payments
   ├─ HR compliance & reader management
   └─ Strategic oversight

2. 👥 Hire Case Managers to handle:
   ├─ Client communications
   ├─ INA assessments & home visits
   ├─ Medical research & coordination
   ├─ Report writing
   └─ Administrative tasks

3. 📈 Growth Path:
   Stage 1: Liz alone (100% of workflow)
   Stage 2: Liz + 1 CM (Liz: management 40%, CM: operations 60%)
   Stage 3: Liz + 2-3 CMs (Liz: strategic oversight, CMs: all fieldwork)
   Stage 4: Liz + team + Operations Manager


═══════════════════════════════════════════════════════════════════════════════════
                                  🔒 SECURITY NOTES
═══════════════════════════════════════════════════════════════════════════════════

Database Access Control:
├─ qolae_admin: Admin portal (Liz only)
├─ qolae_lawyers: Lawyers tracking (Liz only in Phase 1-2)
├─ qolae_casemanagers: Case management workspace (CMs + Liz)
├─ qolae_readers: Reader accounts (CMs + Liz)
├─ qolae_hrcompliance: HR data (Liz only - separate DB)
└─ qolae_clients: Client data (CMs + Liz)

Financial Controls:
├─ All payments require Liz's explicit approval
├─ Payment buttons visible only to management role
├─ Audit trail for all financial transactions
└─ Invoice generation restricted to management


═══════════════════════════════════════════════════════════════════════════════════

Legend:
🔐 = Management Only (Liz) - Strategic, Financial, HR
👥 = Delegatable to Case Managers - Operational, Clinical
✉️ = System-generated email
💰 = Financial transaction/approval
⚠️ = Critical gate/checkpoint
✅ = Completion milestone
🔒 = Security/audit checkpoint
```

---

## Key Takeaways

1. **40% Management / 60% Operational** - Clear separation allows for future delegation
2. **Strategic Control Retained** - Liz maintains oversight of business-critical decisions
3. **Scalability Built-In** - Operational phases can be delegated without losing control
4. **Financial Authority** - All payment approvals remain with management
5. **HR Compliance** - Separate, secure database with management-only access
6. **Audit-Ready** - All critical actions logged and traceable

This structure supports QOLAE's growth from a solo operation to a team-based business while maintaining quality control and financial oversight.

