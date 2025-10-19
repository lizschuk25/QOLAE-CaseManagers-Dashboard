-- ==============================================
-- WORKSPACE ACCESS TABLES FOR CASE MANAGERS
-- ==============================================
-- Purpose: Control feature access for new starters
-- Database: qolae_casemanagers
-- Author: Atlas Agent (Task 1A.4.1)
-- Date: October 19, 2025
-- ==============================================

-- ==============================================
-- CREATE TABLE: case_managers
-- Purpose: Store new starters as case managers
-- Links to: new_starters (via PIN)
-- ==============================================
CREATE TABLE IF NOT EXISTS case_managers (
    id SERIAL PRIMARY KEY,
    pin VARCHAR(20) UNIQUE NOT NULL,        -- NS-LC123456 from new_starters
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,    -- Hashed password from 2FA
    status VARCHAR(50) DEFAULT 'pending',   -- pending → approved → active
    compliance_approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- CREATE TABLE: workspace_access_rules
-- Purpose: Define feature access per case manager
-- Features: create_case, edit_case, view_reports, etc.
-- ==============================================
CREATE TABLE IF NOT EXISTS workspace_access_rules (
    id SERIAL PRIMARY KEY,
    case_manager_pin VARCHAR(20) REFERENCES case_managers(pin) ON DELETE CASCADE,
    feature VARCHAR(100),                   -- 'create_case', 'edit_case', 'view_reports', etc.
    access_level VARCHAR(50),               -- 'full', 'limited', 'read_only', 'none'
    enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_case_managers_pin ON case_managers(pin);
CREATE INDEX IF NOT EXISTS idx_case_managers_email ON case_managers(email);
CREATE INDEX IF NOT EXISTS idx_workspace_rules_pin ON workspace_access_rules(case_manager_pin);
CREATE INDEX IF NOT EXISTS idx_workspace_rules_feature ON workspace_access_rules(feature);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================
-- Run these to verify tables created successfully:
-- \dt case_managers workspace_access_rules
-- SELECT COUNT(*) FROM case_managers;
-- SELECT COUNT(*) FROM workspace_access_rules;
