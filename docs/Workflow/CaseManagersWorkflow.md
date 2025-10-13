# QOLAE Case Managers' Workflow
**Role-Based Access Control: Management vs Operational Tasks**

---

## 📋 QUICK REFERENCE

| **Phase** | **Steps** | **Responsibility** | **Key Activities** | **Time Estimate** |
|-----------|-----------|-------------------|-------------------|-------------------|
| **Phase 1** | 1-6 | 🔐 Management Only | Marketing, Lawyer Registration, Follow-ups | Ongoing |
| **Phase 2** | 8-9 | 🔐 Management Only | Case Allocation, Payment Oversight | 5-10 min/case |
| **Phase 3** | 10-11 | 👥 Delegatable | Client Contact, Data Review | 30-45 min/case |
| **Phase 4** | 12, 12a-12b | 🔐 Management Only | Reader Registration, HR Compliance | 2-3 hrs/reader |
| **Phase 5** | 13-18 | 👥 Delegatable | INA Assessment, Report Writing | 8-12 hrs/case |
| **Phase 6** | 19-21 | 🔐 Management Only | Reader Payments, Final Approvals | 30 min/case |

**Total Case Cycle:** 10 days (target) | 28 days (maximum allowed)

**Legend:**
- 🔐 = Management Only (Liz) - Strategic, Financial, HR decisions
- 👥 = Delegatable to Case Managers - Operational, Clinical work

**Visual Workflow Diagram:** See [CaseManagersWorkflowDiagram.md](./CaseManagersWorkflowDiagram.md)

**Technical Implementation:** See [DailyWorkingDocument.md](../DailyWorkingDocument.md) (Dashboard build tasks)

---

## 🔐 PHASE 1: BUSINESS DEVELOPMENT & MARKETING
**[MANAGEMENT ONLY - LIZ]** (Steps 1-6)

**1. Marketing & Outreach** 🔐
- Liz reaches out to Law Firms through the Web, Telephone or email
- Strategic business development activity

**2. Lawyer Registration** 🔐
- Liz fills out the Lawyers Registration card on the QOLAE Admin Portal
- Fields: Law Firm Name, Contact, email, telephone number
- Triggers auto-generated PIN added to Lawyers Tracking Database (LTDb)
- Access buttons to call up LTDb

**3. Lawyers Tracking Database Management** 🔐
- Status updates, initial contact date, follow up fields, next steps, notes
- Document repository for Liz's CV, Addenda and Terms of Business

**4. Email PIN Generation** 🔐
- Tick box within LTDb generates clickable PIN in introductory email letter

**5. Document Package Sending** 🔐
- CV, TOB and Case Studies sent with Introductory letter
- Triggered when 'Send documents' box is ticked

**6. Follow-up Management** 🔐
- Liz uses LTDb for ongoing relationship management

---

## 🔐 PHASE 2: CASE ALLOCATION & OVERSIGHT
**[MANAGEMENT ONLY - LIZ]**

**8. Case Assignment Decision** 🔐
- When Lawyers engage QOLAE, they click email hyperlinked PIN and commence workflow
- Lawyers sign TOB and make payment
- System notifies Liz/other CMs → **Liz must select** who gets the case
- Strategic workload distribution decision

**9. Payment Notification** 🔐
- Liz receives notification when payment is made on portal
- Financial oversight responsibility

---

## 👥 PHASE 3: OPERATIONAL CASE MANAGEMENT
**[DELEGATABLE TO CASE MANAGERS]**

**10. Client Data Access & Review** 👥
- Once Lawyer enters client details into Consent form, Case Manager has access
- Client data auto-populates: INA Referral, INA form, CM's INA Checklist, INA Report
- Data appears on allocated Case Manager's Workspace

**11. Initial Client Contact** 👥
- Case Manager immediately calls Client (Service User/Patient)
- Introduces themselves, fields questions/concerns about Consent form
- Provisionally books INA visit appointment in calendar on CaseManagers Dashboard

---

## 🔐 PHASE 4: READER REGISTRATION & HR COMPLIANCE
**[MANAGEMENT ONLY - LIZ]**

**12. Reader Registration** 🔐
- Liz registers Readers in her workspace
- Once Consent is sent off, ticks box that auto-generates reader-specific PIN
- Generates Customised NDA attachment sent in Introductory Email to Readers
- Similar workflow to Admin-Dashboard's "Ready to Generate Documents" and "Send Email"
- Copy of NDA saved in central-repository/temp, ready for digital signing 

NOTE THAT READER WORKFLOW IS SEPARATE. NDA will be available for signing digitally on the portal for the Readers once they log on to the system and have gone through the 2 way FA authentication system and compliance requirements. Liz's automatic signature will also be applied.

---

## 🔐 READERS COMPLIANCE REVIEW (New HR Workflow)
**[MANAGEMENT ONLY - LIZ]**

**12a. Reader Compliance Submission:**
- After the Reader completes their initial login (PIN, 2FA, password creation), they are redirected to the **HR Compliance Gate** (`readers.qolae.com/compliance`)
- Reader must submit:
  - **CV (PDF upload)**
  - **2 References:** 1 professional + 1 character (referee contact details only at this stage)
- On submission, Liz receives a **notification** in her Case Managers Dashboard
- Status badge appears: "[Reader Name] - Compliance Submitted" (pending)
- Reader cannot access their dashboard until compliance is approved

**12b. Liz's Compliance Review Process:**

**Step 1: Initial Review**
- Click "Review" button on Case Managers Dashboard
- Modal opens showing:
  - Reader's CV (can download/view)
  - Professional reference details (name, title, organisation, email, phone, relationship)
  - Character reference details (name, relationship, email, phone, duration known)

**Step 2: Reference Collection (Flexible Process)**

**Option A - Phone Reference (Preferred):**
1. Liz calls the referee
2. Liz fills out `reference-form.ejs` with referee's answers during the call
3. System automatically emails the **pre-filled** form to referee for review and digital signature
4. Referee receives email → reviews pre-filled form (takes 30 seconds) → signs digitally → submits
5. Signed reference is saved to `qolae_hrcompliance` database
6. Liz receives notification: "Reference received from [Referee Name]"

**Option B - Email Reference (if referee prefers):**
1. Referee prefers not to have phone call
2. Liz sends blank `reference-form.ejs` via system email
3. Referee fills out entire form themselves and signs digitally
4. Signed reference is saved to `qolae_hrcompliance` database
5. Liz receives notification: "Reference received from [Referee Name]"

**Step 3: Final Approval**
- Once **both references** are received and signed
- Liz reviews all compliance documents (CV + 2 signed references)
- Liz clicks "Approve Compliance"
- Actions triggered:
  - Compliance record is **locked** in `qolae_hrcompliance` database (audit-ready)
  - Reader's account is fully activated
  - Reader receives email: "Your compliance has been approved. You can now access your dashboard."
- Status updates to: "[Reader Name] - Compliance Approved ✓"

**Database & Security:**
- All HR compliance data (CVs, references) stored in separate `qolae_hrcompliance` database
- Only Case Managers have access to HR compliance records
- Audit log tracks all access: who viewed/downloaded/approved what and when
- Readers do NOT have access to their own compliance records from their dashboard

**Next Login:**
- Reader logs in → automatically redirected to their Readers Dashboard (no compliance gate)
- Reader can now access NDA workflow and begin their tasks

---

## 👥 PHASE 5: INA ASSESSMENT & CLINICAL WORK
**[DELEGATABLE TO CASE MANAGERS]**

**13. Medical Records Review & INA Preparation** 👥
- Once consent is received, CM's signature is automatically applied
- INA workflow process commences
- Case Manager has access to Medical notes and documents uploaded in Lawyers Dashboard Documents Library
- Case Manager reviews all medical documentation meticulously
- Details from notes are added to the INA form

**14. Lawyer Communication** 👥
- Lawyers are informed of next steps via system-generated email

**15. INA Assessment Execution** 👥
- Case Manager fills out INA Checklist the day before home visit
- Case Manager visits client at their home
- Completes INA Form, takes pictures and recordings
- Uploads assessment materials to portal upon return to office

**16. INA Report Auto-Population** 👥
- INA Form data automatically populates into INA Report template
- Reduces duplicate data entry

**17. Medical Research & Coordination** 👥
- Case Manager conducts research
- Makes phone calls: medication requests from GP, Specialist Nurses, Physios, Physicians, Surgeons
- Gathers all necessary clinical information

**18. INA Report Completion** 👥
- Case Manager completes comprehensive report
- Includes recommendations for client's Rehabilitation and overall healthcare needs

---

## 🔐 PHASE 6: REVIEW PROCESS & FINANCIAL APPROVALS
**[MANAGEMENT ONLY - LIZ]**

**19. First Reader Review & Payment Approval** 🔐
- First redacted draft sent to First Reader (non-medically trained)
- 24-48 hour deadline for amended copy
- **Liz approves and sends payment to First Reader**
- Financial authorization required

**20. Second Reader Review & Payment Approval** 🔐
- Second draft sent to Second Reader (clinically trained Nurse or Doctor)
- 24-48 hour deadline for amended copy
- **Liz approves and sends payment to Second Reader**
- Financial authorization required

**21. Final Report & Invoice Approval** 🔐
- Final draft is amended, corrected and signed (by Liz or authorized CM)
- Report added/sent to Lawyers portal in secure environment
- Target: 10 days completion (28 day cycle allowed)
- Email triggered to lawyer with link to access final report
- Lawyer can download for their records
- **Liz approves expenses and final 25% payment for Law Firm's Invoice**
- Invoice uploaded as reminder to Lawyers Dashboard
- System sends confirmation email
- Financial authorization and business closure

---

## 📊 WORKFLOW SUMMARY

| **Phase** | **Responsibility** | **Steps** | **Key Activities** |
|-----------|-------------------|-----------|-------------------|
| **Phase 1** | 🔐 Management Only | 1-6 | Marketing, Lawyer Registration, Follow-ups |
| **Phase 2** | 🔐 Management Only | 8-9 | Case Allocation, Payment Oversight |
| **Phase 3** | 👥 Delegatable | 10-11 | Client Contact, Data Review |
| **Phase 4** | 🔐 Management Only | 12, 12a-12b | Reader Registration, HR Compliance |
| **Phase 5** | 👥 Delegatable | 13-18 | INA Assessment, Medical Research, Report Writing |
| **Phase 6** | 🔐 Management Only | 19-21 | Reader Payments, Final Approvals, Invoicing |

**Legend:**
- 🔐 = Management Only (Liz) - Strategic, Financial, HR, Business Development
- 👥 = Delegatable to Case Managers - Operational, Clinical, Administrative

**Scalability Note:** As QOLAE grows, qualified Case Managers can be hired to handle Phases 3 & 5 (~60% of operational workflow), while Liz retains control over strategic business decisions, financial approvals, and HR compliance. 