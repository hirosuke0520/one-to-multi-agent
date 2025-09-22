-- Add generated_content column to content_metadata table for PostgreSQL
-- This column stores the generated content for all platforms

ALTER TABLE content_metadata
ADD COLUMN IF NOT EXISTS generated_content JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN content_metadata.generated_content IS 'JSON array containing generated content for all platforms';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_content_metadata_generated_content ON content_metadata USING GIN (generated_content);