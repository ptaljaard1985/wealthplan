-- migration-012-fix-jsonb-encoding.sql
-- Fix double-encoded JSONB values that were stored as JSON strings instead of arrays.
-- E.g. '"[\"auth\",\"api\"]"' (a JSONB string) should be '["auth","api"]' (a JSONB array).

-- Fix ai_affected_areas: if stored as a JSON string, parse it back to a proper JSONB array
UPDATE support_requests
SET ai_affected_areas = ai_affected_areas::text::jsonb
WHERE ai_analysis_status = 'done'
  AND ai_affected_areas IS NOT NULL
  AND jsonb_typeof(ai_affected_areas) = 'string';

-- Fix ai_implementation: if stored as a JSON string, parse it back to a proper JSONB array
UPDATE support_requests
SET ai_implementation = ai_implementation::text::jsonb
WHERE ai_analysis_status = 'done'
  AND ai_implementation IS NOT NULL
  AND jsonb_typeof(ai_implementation) = 'string';
