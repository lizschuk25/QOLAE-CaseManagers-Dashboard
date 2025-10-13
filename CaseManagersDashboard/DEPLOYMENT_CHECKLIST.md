# Case Managers Dashboard - Deployment Checklist
**Date**: October 12, 2025
**Phase**: Phase 2A - Tab-Based Dashboard Architecture
**Server**: 91.99.184.77 (casemanagers.qolae.com)

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### ✅ Files Ready for Upload (Local → Live Server)

**Parent Dashboard File:**
```
Local:  /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/views/case-managers-dashboard.ejs
Server: /var/www/casemanagers.qolae.com/CaseManagersDashboard/views/case-managers-dashboard.ejs
```

**Tab Components (NEW - Create Directory First):**
```
Local:  /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/views/tabs/
Server: /var/www/casemanagers.qolae.com/CaseManagersDashboard/views/tabs/

Files to upload:
1. my-cases-tab.ejs
2. reader-management-tab.ejs
3. approval-queue-tab.ejs
4. cm-management-tab.ejs
```

**Updated Routes File:**
```
Local:  /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/routes/caseManagerRoutes.js
Server: /var/www/casemanagers.qolae.com/CaseManagersDashboard/routes/caseManagerRoutes.js
Status: MODIFIED (lines 26-44 updated with role-based rendering logic)
```

---

## 🚀 DEPLOYMENT STEPS

### Step 1: SSH into Live Server
```bash
ssh root@91.99.184.77
```

### Step 2: Navigate to Case Managers Dashboard Directory
```bash
cd /var/www/casemanagers.qolae.com/CaseManagersDashboard
```

### Step 3: Create tabs Directory
```bash
mkdir -p views/tabs
```

### Step 4: Upload Files from Local Machine
**From your local terminal (NOT on server):**

```bash
# Upload parent dashboard file
scp /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/views/case-managers-dashboard.ejs root@91.99.184.77:/var/www/casemanagers.qolae.com/CaseManagersDashboard/views/

# Upload all tab components
scp /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/views/tabs/*.ejs root@91.99.184.77:/var/www/casemanagers.qolae.com/CaseManagersDashboard/views/tabs/

# Upload updated routes file
scp /Users/lizchukwu_1/QOLAE-Online-Portal/QOLAE-CaseManagers-Dashboard/CaseManagersDashboard/routes/caseManagerRoutes.js root@91.99.184.77:/var/www/casemanagers.qolae.com/CaseManagersDashboard/routes/
```

### Step 5: Verify File Permissions (on server)
```bash
# Check permissions
ls -la views/
ls -la views/tabs/
ls -la routes/

# Fix permissions if needed
chmod 644 views/*.ejs
chmod 644 views/tabs/*.ejs
chmod 644 routes/*.js
```

### Step 6: Restart PM2 Service
```bash
# Using ecosystem.config.js (preferred - avoids cache issues)
pm2 restart ecosystem.config.js --only qolae-cm-dashboard

# OR restart by name
pm2 restart qolae-cm-dashboard

# Verify service is running
pm2 list
pm2 logs qolae-cm-dashboard --lines 50
```

### Step 7: Clear Browser Cache
- Open Chrome DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"
- OR use Incognito mode for testing

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Test Checklist:

**1. Dashboard Loads:**
- [ ] Navigate to https://casemanagers.qolae.com/case-managers-dashboard
- [ ] Page loads without errors
- [ ] Header displays with correct date
- [ ] Action Center visible with 4 cards

**2. Role-Based Tabs (Management View):**
- [ ] "My Cases" tab visible and active by default
- [ ] "Reader Management" tab visible
- [ ] "Approval Queue" tab visible (with badge "2")
- [ ] "CM Management" tab visible
- [ ] Total: 4 tabs showing (Management role confirmed)

**3. Tab Switching:**
- [ ] Click "Reader Management" → Content changes
- [ ] Click "Approval Queue" → Content changes
- [ ] Click "CM Management" → Content changes
- [ ] Click "My Cases" → Returns to cases table
- [ ] Active tab styling updates correctly

**4. My Cases Tab:**
- [ ] Case table displays with headers
- [ ] Sample case visible (INA-2024-002, Michael Chen)
- [ ] Click "+" button → Row expands
- [ ] Timeline and Quick Actions visible
- [ ] Click "+" again → Row collapses

**5. Action Center Filtering:**
- [ ] Click "🔴 URGENT" card → Should filter cases (none match in sample data)
- [ ] Click "🟢 READY" card → Should show cases
- [ ] Filter notice appears at top
- [ ] "Clear filter" button works
- [ ] Case count updates dynamically

**6. Reader Management Tab:**
- [ ] 3 sample reader cards display
- [ ] "Register New Reader" button visible
- [ ] "View Details" and "Process Payment" buttons visible

**7. Approval Queue Tab:**
- [ ] 2 approval items display (payment + case closure)
- [ ] Approve/Review/Reject buttons visible
- [ ] Amounts display correctly (£450)

**8. CM Management Tab:**
- [ ] 3 CM cards display
- [ ] "Onboard New CM" button visible
- [ ] "View Workload" and "Reassign Cases" buttons visible

---

## 🐛 TROUBLESHOOTING

### Issue: Dashboard Not Loading
**Check:**
```bash
pm2 logs qolae-cm-dashboard --lines 100
```
**Look for:**
- EJS template errors
- Missing file errors
- Port 3006 conflicts

### Issue: Tabs Not Visible
**Possible Cause:** userRole not being passed correctly
**Fix:** Check routes/caseManagerRoutes.js line 37-41 (userData object)

### Issue: Tab Content Not Displaying
**Possible Cause:** Include paths incorrect
**Check:** views/case-managers-dashboard.ejs lines 254-272
**Verify paths:** `<%- include('tabs/my-cases-tab.ejs') %>`

### Issue: 404 on Tab Switch
**Possible Cause:** JavaScript not loading
**Check:** Browser console for errors
**Fix:** Clear cache and hard reload

### Issue: Styling Issues
**Possible Cause:** CSS conflicts
**Check:** Each tab has its own `<style>` block
**Verify:** No duplicate class names across tabs

---

## 📝 ROLLBACK PROCEDURE (If Needed)

If deployment causes issues:

```bash
# Stop the service
pm2 stop qolae-cm-dashboard

# Restore previous version (if you backed up)
cp views/case-managers-dashboard.ejs.backup views/case-managers-dashboard.ejs

# Restart service
pm2 restart qolae-cm-dashboard
```

---

## 🎯 NEXT STEPS AFTER DEPLOYMENT

Once dashboard is confirmed working:

1. **Test Role-Based Rendering:**
   - Change `userRole: 'operational'` in routes (line 39)
   - Verify only "My Cases" tab shows for operational users
   - Change back to `'management'` for Liz

2. **Build Auto-Assignment Endpoint:**
   - POST `/api/case-managers/assign-case-auto`
   - Triggered when Case Referral form submitted
   - Returns assigned CM details to Lawyers Dashboard

3. **Add Workload Management:**
   - Real-time CM capacity tracking
   - Manual reassignment functionality
   - Workload balance algorithm

4. **Connect to Databases:**
   - qolae_casemanagers (cases, ina_visits, ina_reports)
   - qolae_readers (for Reader Management tab)
   - Replace sample data with real database queries

---

## 📊 FILES SUMMARY

**Total Files Created:** 5
**Total Files Modified:** 1
**New Directories:** 1 (views/tabs/)

**Lines of Code:**
- case-managers-dashboard.ejs: ~300 lines
- my-cases-tab.ejs: ~509 lines
- reader-management-tab.ejs: ~140 lines
- approval-queue-tab.ejs: ~134 lines
- cm-management-tab.ejs: ~138 lines
- **Total:** ~1,221 lines

---

## ✅ DEPLOYMENT COMPLETE WHEN:

- [ ] All 5 EJS files uploaded successfully
- [ ] PM2 service restarted without errors
- [ ] Dashboard loads at https://casemanagers.qolae.com/case-managers-dashboard
- [ ] All 4 tabs visible and functional
- [ ] Tab switching works smoothly
- [ ] Action Center filtering operational
- [ ] No console errors in browser
- [ ] All sample data displays correctly

**Ready for Phase 2B: Backend Integration & Database Connections**

---

**Deployment Prepared By:** Claude Code
**Date:** October 12, 2025
**Session Context:** Tab-based dashboard architecture complete
