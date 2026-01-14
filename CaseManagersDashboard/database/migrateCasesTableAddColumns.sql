-- ==============================================
-- MIGRATION: Add Missing Columns to cases Table
-- Date: October 12, 2025
-- Purpose: Update cases table schema to match Phase 2A requirements
-- ==============================================

-- Connect to database
\c qolae_casemanagers

-- Add missing columns to cases table
ALTER TABLE cases

  -- Workflow tracking columns
  ADD COLUMN IF NOT EXISTS workflow_stage INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Lawyer information
  ADD COLUMN IF NOT EXISTS lawyer_name VARCHAR(255),

  -- Case Manager assignment columns
  ADD COLUMN IF NOT EXISTS assigned_cm_pin VARCHAR(20),
  ADD COLUMN IF NOT EXISTS assigned_cm_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,

  -- Case details
  ADD COLUMN IF NOT EXISTS case_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS referral_data JSONB,

  -- INA visit tracking
  ADD COLUMN IF NOT EXISTS ina_visit_date TIMESTAMP;

-- Update existing rows with default values
UPDATE cases
SET
  workflow_stage = 1,
  stage_updated_at = created_at,
  case_type = 'INA'
WHERE workflow_stage IS NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cases_workflow_stage ON cases(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_cases_stage_updated_at ON cases(stage_updated_at);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_cm_pin ON cases(assigned_cm_pin);
CREATE INDEX IF NOT EXISTS idx_cases_ina_visit_date ON cases(ina_visit_date);

-- Add check constraint for workflow_stage (1-14 stages)
ALTER TABLE cases
  DROP CONSTRAINT IF EXISTS cases_workflow_stage_check;

ALTER TABLE cases
  ADD CONSTRAINT cases_workflow_stage_check
  CHECK (workflow_stage >= 1 AND workflow_stage <= 14);

-- Add trigger to auto-update stage_updated_at when workflow_stage changes
CREATE OR REPLACE FUNCTION update_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.workflow_stage IS DISTINCT FROM NEW.workflow_stage THEN
    NEW.stage_updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stage_timestamp ON cases;

CREATE TRIGGER trigger_update_stage_timestamp
  BEFORE UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION update_stage_timestamp();

-- Display updated table structure
\d cases;

-- Success message
SELECT 'Migration completed successfully!' AS status;
