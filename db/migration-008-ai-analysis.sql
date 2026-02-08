-- migration-008-ai-analysis.sql
-- Add AI ticket analysis columns to support_requests

ALTER TABLE support_requests
  ADD COLUMN ai_summary text,
  ADD COLUMN ai_affected_areas jsonb,
  ADD COLUMN ai_implementation jsonb,
  ADD COLUMN ai_analysis_status text NOT NULL DEFAULT 'pending';
