-- ==============================================
-- QOLAE CASE MANAGERS DATABASE SCHEMA
-- ==============================================
-- Purpose: Case management for INA visits, forms and reports
-- Author: Liz
-- Date: October 7, 2025
-- Database: qolae_casemanagers
-- ==============================================

-- ==============================================
-- TABLE 1: CASES
-- Master table for all cases managed by Case Managers
-- ==============================================
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Case Identification
    case_pin VARCHAR(20) UNIQUE NOT NULL, -- Links to lawyer's case (e.g., CT-001234-C001)
    lawyer_pin VARCHAR(20) NOT NULL, -- Links to lawyer who referred the case
    case_manager_name VARCHAR(255) NOT NULL, -- Liz or other CM

    -- Client Information
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255),
    client_phone VARCHAR(50),
    client_address TEXT,

    -- Case Status
    case_status VARCHAR(50) DEFAULT 'pending_consent' CHECK (case_status IN (
        'pending_consent',      -- Waiting for client consent
        'consent_received',     -- Consent form signed
        'ina_scheduled',        -- INA visit booked
        'ina_completed',        -- INA visit done
        'report_in_progress',   -- Writing report
        'report_with_readers',  -- Sent to readers for review
        'report_final',         -- Final report ready
        'report_delivered',     -- Delivered to lawyer
        'case_closed'          -- Case completed
    )),

    -- Consent Tracking
    consent_received BOOLEAN DEFAULT FALSE,
    consent_received_at TIMESTAMP,
    consent_form_path VARCHAR(500), -- Path to signed consent PDF

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL, -- Who created the case
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Notes
    case_notes TEXT
);

CREATE INDEX idx_cases_case_pin ON cases(case_pin);
CREATE INDEX idx_cases_lawyer_pin ON cases(lawyer_pin);
CREATE INDEX idx_cases_case_status ON cases(case_status);
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- ==============================================
-- TABLE 2: INA_VISITS
-- Tracks Initial Needs Assessment visit scheduling and completion
-- ==============================================
CREATE TABLE ina_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Case Link
    case_pin VARCHAR(20) NOT NULL REFERENCES cases(case_pin) ON DELETE CASCADE,

    -- Visit Scheduling
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    visit_duration_minutes INTEGER DEFAULT 120, -- 2 hours default

    -- Visit Location
    visit_location_address TEXT NOT NULL,
    visit_location_postcode VARCHAR(20),
    visit_location_notes TEXT, -- e.g., "Ring doorbell twice, dog friendly"

    -- Visit Status
    visit_status VARCHAR(50) DEFAULT 'scheduled' CHECK (visit_status IN (
        'scheduled',           -- Booked with client
        'confirmed',          -- Client confirmed attendance
        'in_progress',        -- Currently happening
        'completed',          -- Visit finished
        'cancelled',          -- Cancelled by client/CM
        'rescheduled'         -- Moved to new date
    )),

    -- Visit Preparation
    checklist_completed BOOLEAN DEFAULT FALSE,
    checklist_completed_at TIMESTAMP,
    medical_notes_reviewed BOOLEAN DEFAULT FALSE,

    -- Visit Completion
    visit_completed_at TIMESTAMP,
    visit_completed_by VARCHAR(255), -- Case Manager who conducted visit

    -- Media Collected
    photos_taken INTEGER DEFAULT 0,
    recordings_taken INTEGER DEFAULT 0,
    media_uploaded BOOLEAN DEFAULT FALSE,
    media_upload_path VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Notes
    visit_notes TEXT
);

CREATE INDEX idx_ina_visits_case_pin ON ina_visits(case_pin);
CREATE INDEX idx_ina_visits_visit_date ON ina_visits(visit_date);
CREATE INDEX idx_ina_visits_visit_status ON ina_visits(visit_status);

-- ==============================================
-- TABLE 3: INA_FORMS
-- Initial Needs Assessment form data collected during visit
-- ==============================================
CREATE TABLE ina_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Case & Visit Link
    case_pin VARCHAR(20) NOT NULL REFERENCES cases(case_pin) ON DELETE CASCADE,
    visit_id UUID REFERENCES ina_visits(id) ON DELETE SET NULL,

    -- Form Status
    form_status VARCHAR(50) DEFAULT 'draft' CHECK (form_status IN (
        'draft',              -- Being filled out
        'completed',          -- All sections done
        'reviewed',           -- CM reviewed for accuracy
        'locked'              -- Finalized, no more edits
    )),

    -- Client Assessment Data (JSON for flexibility)
    -- This will store structured data from the INA form
    client_medical_history JSONB, -- Medical conditions, medications, allergies
    client_mobility_assessment JSONB, -- Mobility aids, transfers, falls risk
    client_daily_living_needs JSONB, -- Personal care, eating, dressing
    client_communication_needs JSONB, -- Speech, hearing, cognitive
    client_environmental_assessment JSONB, -- Home layout, accessibility, hazards
    client_support_network JSONB, -- Family, carers, current services

    -- Populated from Medical Notes
    medical_notes_summary TEXT,
    key_diagnoses TEXT[],
    current_medications TEXT[],

    -- Form Completion
    form_completed_at TIMESTAMP,
    form_completed_by VARCHAR(255), -- Case Manager

    -- Auto-population to INA Report
    data_transferred_to_report BOOLEAN DEFAULT FALSE,
    data_transferred_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Notes
    form_notes TEXT
);

CREATE INDEX idx_ina_forms_case_pin ON ina_forms(case_pin);
CREATE INDEX idx_ina_forms_visit_id ON ina_forms(visit_id);
CREATE INDEX idx_ina_forms_form_status ON ina_forms(form_status);

-- ==============================================
-- TABLE 4: INA_REPORTS
-- Final Initial Needs Assessment reports
-- ==============================================
CREATE TABLE ina_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Case Link
    case_pin VARCHAR(20) NOT NULL REFERENCES cases(case_pin) ON DELETE CASCADE,
    form_id UUID REFERENCES ina_forms(id) ON DELETE SET NULL,

    -- Report Identification
    report_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., INA-2025-001
    report_title VARCHAR(500),

    -- Report Status
    report_status VARCHAR(50) DEFAULT 'draft' CHECK (report_status IN (
        'draft',                  -- Being written
        'research_in_progress',   -- CM doing research
        'ready_for_first_reader', -- Ready to send to first reader
        'with_first_reader',      -- First reader reviewing
        'first_reader_complete',  -- First reader returned corrections
        'ready_for_second_reader',-- Ready to send to second reader
        'with_second_reader',     -- Second reader reviewing
        'second_reader_complete', -- Second reader returned corrections
        'final_amendments',       -- CM making final corrections
        'signed',                 -- CM signed final version
        'delivered_to_lawyer',    -- Sent to lawyer portal
        'archived'                -- Case closed
    )),

    -- Report Content (could be stored as file path or JSONB sections)
    report_content JSONB, -- Structured sections of the report
    report_pdf_path VARCHAR(500), -- Path to generated PDF

    -- Report Sections
    executive_summary TEXT,
    client_background TEXT,
    medical_history TEXT,
    assessment_findings TEXT,
    rehabilitation_recommendations TEXT,
    care_recommendations TEXT,
    equipment_recommendations TEXT,
    environmental_recommendations TEXT,
    cost_projections JSONB, -- Breakdown of care costs

    -- Reader Review Tracking
    first_reader_pin VARCHAR(20), -- Links to readers table
    first_reader_sent_at TIMESTAMP,
    first_reader_deadline TIMESTAMP,
    first_reader_returned_at TIMESTAMP,
    first_reader_corrections_path VARCHAR(500),

    second_reader_pin VARCHAR(20), -- Links to readers table
    second_reader_sent_at TIMESTAMP,
    second_reader_deadline TIMESTAMP,
    second_reader_returned_at TIMESTAMP,
    second_reader_corrections_path VARCHAR(500),

    -- Final Sign-off
    signed_by VARCHAR(255), -- Case Manager who signed
    signed_at TIMESTAMP,
    signed_report_path VARCHAR(500),

    -- Delivery to Lawyer
    delivered_to_lawyer_at TIMESTAMP,
    lawyer_notified BOOLEAN DEFAULT FALSE,
    lawyer_download_count INTEGER DEFAULT 0,
    lawyer_first_accessed_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Notes
    report_notes TEXT
);

CREATE INDEX idx_ina_reports_case_pin ON ina_reports(case_pin);
CREATE INDEX idx_ina_reports_report_number ON ina_reports(report_number);
CREATE INDEX idx_ina_reports_report_status ON ina_reports(report_status);
CREATE INDEX idx_ina_reports_first_reader_pin ON ina_reports(first_reader_pin);
CREATE INDEX idx_ina_reports_second_reader_pin ON ina_reports(second_reader_pin);
CREATE INDEX idx_ina_reports_created_at ON ina_reports(created_at);

-- ==============================================
-- TABLE 5: CASE_ACTIVITY_LOG
-- GDPR-compliant audit trail for all case activities
-- ==============================================
CREATE TABLE case_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Activity Tracking
    case_pin VARCHAR(20) REFERENCES cases(case_pin) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- e.g., 'consent_received', 'visit_scheduled', 'report_signed'
    activity_description TEXT NOT NULL,

    -- User Tracking
    performed_by VARCHAR(255) NOT NULL, -- Who did the action
    user_role VARCHAR(50), -- 'case_manager', 'reader', 'lawyer', 'system'

    -- IP & Security
    ip_address VARCHAR(50),
    user_agent TEXT,

    -- Timestamp
    activity_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_activity_log_case_pin ON case_activity_log(case_pin);
CREATE INDEX idx_case_activity_log_activity_type ON case_activity_log(activity_type);
CREATE INDEX idx_case_activity_log_timestamp ON case_activity_log(activity_timestamp);

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Auto-update updated_at timestamp for cases
CREATE OR REPLACE FUNCTION update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cases_updated_at_trigger
BEFORE UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_cases_updated_at();

-- Auto-update updated_at timestamp for ina_visits
CREATE OR REPLACE FUNCTION update_ina_visits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ina_visits_updated_at_trigger
BEFORE UPDATE ON ina_visits
FOR EACH ROW
EXECUTE FUNCTION update_ina_visits_updated_at();

-- Auto-update updated_at timestamp for ina_forms
CREATE OR REPLACE FUNCTION update_ina_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ina_forms_updated_at_trigger
BEFORE UPDATE ON ina_forms
FOR EACH ROW
EXECUTE FUNCTION update_ina_forms_updated_at();

-- Auto-update updated_at timestamp for ina_reports
CREATE OR REPLACE FUNCTION update_ina_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ina_reports_updated_at_trigger
BEFORE UPDATE ON ina_reports
FOR EACH ROW
EXECUTE FUNCTION update_ina_reports_updated_at();

-- ==============================================
-- INITIAL DATA
-- ==============================================

-- Create initial test case (optional - remove in production)
-- INSERT INTO cases (
--     case_pin,
--     lawyer_pin,
--     case_manager_name,
--     client_name,
--     created_by
-- ) VALUES (
--     'CT-001234-C001',
--     'CT-001234',
--     'Liz',
--     'Test Client',
--     'System'
-- );

-- ==============================================
-- SCHEMA COMPLETE
-- ==============================================
-- Database ready for Case Managers workflow!
-- Tables: 5
-- - cases (master case tracking)
-- - ina_visits (visit scheduling & completion)
-- - ina_forms (assessment data collection)
-- - ina_reports (final reports & reader workflow)
-- - case_activity_log (GDPR audit trail)
-- ==============================================
