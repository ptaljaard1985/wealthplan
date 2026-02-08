-- migration-010-ai-prompt.sql
-- Add ai_prompt column to support_requests for copy-paste Claude Code prompts

ALTER TABLE support_requests
  ADD COLUMN ai_prompt text;
