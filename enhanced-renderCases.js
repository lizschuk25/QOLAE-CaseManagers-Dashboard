// ===== ENHANCED RENDER CASES FUNCTION =====
// This will replace the simple placeholder in my-cases-tab.ejs
// Generates full 7-section expandable details dynamically

function renderCases(cases) {
    const tbody = document.getElementById('casesTableBody');

    if (!cases || cases.length === 0) {
        showEmptyState();
        return;
    }

    // Clear existing sample data
    tbody.innerHTML = '';

    cases.forEach(caseData => {
        // Create main case row
        const row = document.createElement('tr');
        row.setAttribute('data-case-id', caseData.casePin);
        row.setAttribute('data-priority', caseData.priority.level);
        row.setAttribute('data-stage', caseData.workflowStage);

        // Map priority level to CSS class
        const priorityClass = caseData.priority.level === 'urgent' ? 'priority-urgent' :
                             caseData.priority.level === 'attention' ? 'priority-attention' :
                             'priority-on-track';

        row.innerHTML = `
            <td>
                <span class="priority-dot ${priorityClass}" title="${caseData.priority.label} - ${caseData.priority.days} days"></span>
                <span class="case-id">${caseData.casePin}</span>
            </td>
            <td>${caseData.clientName}</td>
            <td>${caseData.assignedCM || 'Unassigned'}</td>
            <td>
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${caseData.progressPercent}%"></div>
                    </div>
                    <span class="progress-percent">${caseData.progressPercent}%</span>
                </div>
                <div class="progress-stage">${caseData.stageLabel}</div>
            </td>
            <td>${caseData.consentReceivedAt ? '✅ Received' : '🔒 Pending'}</td>
            <td>${getNextActionLabel(caseData.workflowStage)}</td>
            <td>
                <span style="color: ${caseData.priority.color}; font-weight: 600;">
                    ${caseData.priority.days} days
                </span>
            </td>
            <td>
                <button class="expand-btn" onclick="toggleCaseDetails('${caseData.casePin}')">+</button>
            </td>
        `;

        tbody.appendChild(row);

        // Create FULL expandable details row with 7 sections
        const detailsRow = document.createElement('tr');
        detailsRow.className = 'case-details-row';
        detailsRow.id = `${caseData.casePin}-details`;

        // Check workflow gates
        const consentReceived = caseData.consentReceivedAt !== null;
        const inaCompleted = caseData.workflowStage >= 6;
        const rdComplete = caseData.workflowStage >= 7;
        const reportComplete = caseData.workflowStage >= 8;
        const internalReviewComplete = caseData.workflowStage >= 9;

        detailsRow.innerHTML = `
            <td colspan="8" class="case-details-cell">
                <div class="case-details">
                    <!-- 7-Section Tabs -->
                    <div class="details-tabs">
                        <button class="detail-tab active" onclick="switchDetailTab('${caseData.casePin}', 'timeline')">Timeline</button>
                        <button class="detail-tab" onclick="switchDetailTab('${caseData.casePin}', 'rd')">R&D</button>
                        <button class="detail-tab" onclick="switchDetailTab('${caseData.casePin}', 'report')">Report</button>
                        <button class="detail-tab" onclick="switchDetailTab('${caseData.casePin}', 'documents')">Documents</button>
                        <button class="detail-tab" onclick="switchDetailTab('${caseData.casePin}', 'readers')">Readers</button>
                        <button class="detail-tab" onclick="switchDetailTab('${caseData.casePin}', 'ina')">INA Visit</button>
                        <button class="detail-tab" onclick="switchDetailTab('${caseData.casePin}', 'actions')">Actions</button>
                    </div>

                    <!-- Section 1: Timeline -->
                    <div class="detail-section active" id="${caseData.casePin}-timeline">
                        <div class="details-section">
                            <h3 class="details-section-title">Workflow Timeline</h3>
                            ${generateTimelineHTML(caseData)}
                        </div>
                    </div>

                    <!-- Section 2: R&D Tracker -->
                    <div class="detail-section" id="${caseData.casePin}-rd">
                        <div class="details-section">
                            <h3 class="details-section-title">R&D Tracker</h3>
                            ${rdComplete ? generateRDTrackerHTML(caseData) : generateLockedGateHTML('R&D phase', 'INA visit must be completed')}
                        </div>
                    </div>

                    <!-- Section 3: Report Writing Status -->
                    <div class="detail-section" id="${caseData.casePin}-report">
                        <div class="details-section">
                            <h3 class="details-section-title">Report Writing Status</h3>
                            ${reportComplete ? generateReportStatusHTML(caseData) : generateLockedGateHTML('Report writing', 'R&D phase must be completed')}
                        </div>
                    </div>

                    <!-- Section 4: Documents -->
                    <div class="detail-section" id="${caseData.casePin}-documents">
                        <div class="details-section">
                            <h3 class="details-section-title">Document Library</h3>
                            ${consentReceived ? generateDocumentsHTML(caseData) : generateLockedGateHTML('Medical notes', 'Consent must be received')}
                        </div>
                    </div>

                    <!-- Section 5: Readers -->
                    <div class="detail-section" id="${caseData.casePin}-readers">
                        <div class="details-section">
                            <h3 class="details-section-title">Reader Assignments</h3>
                            ${internalReviewComplete ? generateReadersHTML(caseData) : generateLockedGateHTML('Reader assignment', 'Internal review must be completed')}
                        </div>
                    </div>

                    <!-- Section 6: INA Visit -->
                    <div class="detail-section" id="${caseData.casePin}-ina">
                        <div class="details-section">
                            <h3 class="details-section-title">INA Visit Details</h3>
                            ${inaCompleted ? generateINADetailsHTML(caseData) : '<p style="color: #64748b;">INA visit not yet completed</p>'}
                        </div>
                    </div>

                    <!-- Section 7: Quick Actions -->
                    <div class="detail-section" id="${caseData.casePin}-actions">
                        <div class="details-section">
                            <h3 class="details-section-title">Quick Actions</h3>
                            ${generateQuickActionsHTML(caseData, consentReceived, internalReviewComplete)}
                        </div>
                    </div>
                </div>
            </td>
        `;

        tbody.appendChild(detailsRow);
    });

    // Hide empty state, show table
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('compactView').style.display = 'table';
}

// ===== HELPER FUNCTIONS FOR SECTION GENERATION =====

function generateTimelineHTML(caseData) {
    const stageNames = [
        'Case opened',
        'Client contacted',
        'Consent sent',
        'Consent received',
        'INA visit scheduled',
        'INA visit completed',
        'R&D phase started',
        'Report writing started',
        'Internal review completed',
        '1st reader assigned',
        '1st reader corrections received',
        '2nd reader assigned',
        '2nd reader corrections received',
        'Case closed'
    ];

    let html = '';
    for (let i = 1; i <= caseData.workflowStage; i++) {
        const icon = '✅';
        html += `
            <div class="timeline-item">
                <span class="timeline-icon">${icon}</span>
                <span class="timeline-text"><strong>Stage ${i}:</strong> ${stageNames[i-1]}</span>
            </div>
        `;
    }

    // Show upcoming stages
    for (let i = caseData.workflowStage + 1; i <= Math.min(caseData.workflowStage + 2, 14); i++) {
        html += `
            <div class="timeline-item">
                <span class="timeline-icon pending">⏳</span>
                <span class="timeline-text" style="color: #cbd5e1;"><strong>Stage ${i}:</strong> ${stageNames[i-1]}</span>
            </div>
        `;
    }

    return html;
}

function generateLockedGateHTML(section, requirement) {
    return `
        <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
            <span class="gate-lock">🔒 ${section} locked until ${requirement}</span>
        </p>
        <p style="font-size: 13px; color: #94a3b8;">
            This section will unlock automatically when the required workflow stage is reached.
        </p>
    `;
}

function generateRDTrackerHTML(caseData) {
    return `
        <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
            R&D phase for case ${caseData.casePin}
        </p>
        <button class="action-btn" onclick="alert('R&D Workspace Modal - Coming in Phase 2B!')">
            📚 Open R&D Workspace
        </button>
    `;
}

function generateReportStatusHTML(caseData) {
    return `
        <p style="font-size: 13px; color: #64748b; margin-bottom: 12px;">
            Report writing for case ${caseData.casePin}
        </p>
        <button class="action-btn" onclick="alert('Report Editor Modal - Coming in Phase 2B!')">
            ✍️ Open Report Editor
        </button>
    `;
}

function generateDocumentsHTML(caseData) {
    return `
        <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <span>📄 Consent Form ${caseData.consentReceivedAt ? '(signed)' : '(pending)'}</span>
                <button class="action-btn" style="padding: 4px 12px;" ${!caseData.consentReceivedAt ? 'disabled' : ''}>View</button>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
                <span>📋 Medical Notes</span>
                <button class="action-btn" style="padding: 4px 12px;" ${!caseData.consentReceivedAt ? 'disabled' : ''}>View</button>
            </div>
        </div>
    `;
}

function generateReadersHTML(caseData) {
    return `
        <div style="padding: 12px; background: #f8fafc; border-radius: 6px; margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;">1st Reader</div>
            <div style="font-size: 13px; color: #64748b;">Not yet assigned</div>
            <button class="action-btn" style="margin-top: 8px;" onclick="alert('Reader assignment - Coming soon!')">
                👤 Assign 1st Reader
            </button>
        </div>
        <div style="padding: 12px; background: #f8fafc; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 4px;">2nd Reader</div>
            <div style="font-size: 13px; color: #64748b;">Not yet assigned</div>
        </div>
    `;
}

function generateINADetailsHTML(caseData) {
    return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
                <div style="font-size: 12px; color: #64748b;">Date</div>
                <div style="font-weight: 600;">${caseData.inaVisitDate ? new Date(caseData.inaVisitDate).toLocaleDateString() : 'Not scheduled'}</div>
            </div>
            <div>
                <div style="font-size: 12px; color: #64748b;">Status</div>
                <div style="font-weight: 600;">${caseData.workflowStage >= 6 ? 'Completed' : 'Pending'}</div>
            </div>
        </div>
        <div style="margin-top: 16px;">
            <button class="action-btn" onclick="alert('INA Form viewer - Coming in Phase 2C!')">View INA Form</button>
        </div>
    `;
}

function generateQuickActionsHTML(caseData, consentReceived, internalReviewComplete) {
    return `
        <div class="quick-actions">
            <button class="action-btn">📞 Contact Client</button>
            <button class="action-btn">📧 Email Lawyer</button>
            <button class="action-btn" ${!internalReviewComplete ? 'disabled' : ''}>👤 Assign 1st Reader</button>
            <button class="action-btn" ${!consentReceived ? 'disabled' : ''}>📄 View Medical Notes</button>
            <button class="action-btn">🗓️ Schedule Follow-up</button>
            <button class="action-btn">💬 Add Note</button>
            <button class="action-btn" ${caseData.workflowStage < 7 ? 'disabled' : ''} onclick="alert('R&D Workspace - Phase 2B!')">📚 R&D Workspace</button>
            <button class="action-btn" onclick="alert('Mark stage complete - Coming soon!')">✅ Mark Stage Complete</button>
        </div>
    `;
}
