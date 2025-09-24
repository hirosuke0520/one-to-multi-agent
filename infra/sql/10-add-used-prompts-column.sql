-- Add used_prompts column to content_metadata table for PostgreSQL
-- This column stores the prompts used during content generation

ALTER TABLE content_metadata
ADD COLUMN IF NOT EXISTS used_prompts JSONB;

-- Add comment for documentation
COMMENT ON COLUMN content_metadata.used_prompts IS 'JSON object containing prompts used for content generation, keyed by platform';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_content_metadata_used_prompts ON content_metadata USING GIN (used_prompts);