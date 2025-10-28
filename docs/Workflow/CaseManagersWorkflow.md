# QOLAE Case Managers'/Liz's Workflow
**Role-Based Access Control: Management vs Operational Tasks**

---

## 📋 QUICK REFERENCE

| **Phase** | **Steps** | **Responsibility** | **Key Activities** | **Time Estimate** |
|-----------|-----------|-------------------|-------------------|-------------------|
| **Phase 1** | 1-6 | 🔐 Management Only | Marketing, Lawyer Registration, Follow-ups | Ongoing |
| **Phase 2** | 8-9 | 🔐 Management Only | Case Allocation, Payment Oversight | 5-10 min/case |
| **Phase 3** | 10-11 | 👥 Delegatable | Client Contact, Data Review | 30-45 min/case |
| **Phase 4** | 12 | 🔐 Management Only | Reader Registration | 15-30 min/reader |
| **HR Compliance** | 12a-12d | 🔐 Delegated System | HR Compliance Management | Via HRCompliance Dashboard |
| **Phase 5** | 13-18 | 👥 Delegatable | INA Assessment, Report Writing | 8-12 hrs/case |
| **Phase 6** | 19-21 | 🔐 Management Only | Reader Payments, Final Approvals | 30 min/case |

**Total Case Cycle:** 10 days (target) | 28 days (maximum allowed)

**Legend:**
- 🔐 = Management Only (Liz) - Strategic, Financial, HR decisions
- 👥 = Delegatable to Case Managers - Operational, Clinical work

**Visual Workflow Diagram:** See [CaseManagersWorkflowDiagram.md](./CaseManagersWorkflowDiagram.md)

**Technical Implementation:** See [CaseManagersWorkflow.md] 

---

## 🔐 PHASE 1: BUSINESS DEVELOPMENT & MARKETING
**[MANAGEMENT ONLY - LIZ]** (Steps 1-6 Admin-Dashboard admin.qolae.com)

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
- Document repository for Liz's CV, Case Studies and Terms of Business

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
- Case Begins at this point.

---

## 👥 PHASE 3: OPERATIONAL CASE MANAGEMENT
**[DELEGATABLE TO CASE MANAGERS]**

**10. Client Data Access & Review** 👥
- Once Lawyer enters client details into Consent form, Case Manager has access to Clients email and telephone number
- Client data auto-populates: INA Referral, INA form, CM's INA Checklist, INA Report
- Data appears on allocated Case Manager's Workspace

**11. Initial Client Contact** 👥
- Case Manager immediately calls Client (Service User/Patient)
- Introduces themselves, fields questions/concerns about Consent form
- Provisionally books INA visit appointment in calendar on CaseManagers Dashboard, can enter information in the INA form during that phone call as well. 

---

## 🔐 PHASE 4: READER REGISTRATION & HR COMPLIANCE
**[MANAGEMENT ONLY - LIZ]**

**12. Reader Registration** 🔐
- Liz registers Readers in the HRCompliance & Operations Dashboard
- Once Consent is sent off, ticks box that auto-generates reader-specific PIN
- Generates Customised NDA attachment sent in Introductory Email to Readers
- Similar workflow to Admin-Dashboard's "Ready to Generate Documents" and "Send Email"
- Copy of NDA saved in central-repository/temp, ready for digital signing 

NOTE THAT READER WORKFLOW IS SEPARATE. NDA will be available for signing digitally on the portal for the Readers once they log on to the system and have gone through the 2 way FA authentication system and compliance requirements. Liz's automatic signature will also be applied.

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

## 🔐 PHASE 6: REVIEW PROCESS & FINANCIAL APPROVALS - THIS IS HRCOMPLIANCE & OPERATIONS DASHBOARD WORKFLOW
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
| **Phase 4** | 🔐 Management Only | 12 | Reader Registration |
| **HR Compliance** | 🔐 Delegated System | 12a-12d | HR Compliance Management |
| **Phase 5** | 👥 Delegatable | 13-18 | INA Assessment, Medical Research, Report Writing |
| **Phase 6** | 🔐 Management Only | 19-21 | Reader Payments, Final Approvals, Invoicing |

**Legend:**
- 🔐 = Management Only (Liz) - Strategic, Financial, HR, Business Development
- 👥 = Delegatable to Case Managers - Operational, Clinical, Administrative

**Scalability Note:** As QOLAE grows, qualified Case Managers can be hired to handle Phases 3 & 5 (~60% of operational workflow), while Liz retains control over strategic business decisions, financial approvals, and HR compliance management through the dedicated HRCompliance Dashboard. 