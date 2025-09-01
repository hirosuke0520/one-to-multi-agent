-- Content metadata tables for Cloud SQL

-- Content generation history
CREATE TABLE IF NOT EXISTS content_metadata (
    id VARCHAR(255) PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('text', 'audio', 'video')),
    original_file_name VARCHAR(255),
    file_size BIGINT,
    mime_type VARCHAR(100),
    duration INTEGER, -- in seconds
    user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audio/Video preview data
CREATE TABLE IF NOT EXISTS preview_data (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(255) REFERENCES content_metadata(id) ON DELETE CASCADE,
    preview_type VARCHAR(20) NOT NULL CHECK (preview_type IN ('audio', 'video')),
    duration INTEGER,
    waveform_data JSONB, -- for audio: array of amplitude values
    thumbnail_base64 TEXT, -- for video: base64 encoded thumbnail
    video_width INTEGER,
    video_height INTEGER,
    transcript_preview TEXT, -- first few sentences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generated platform content
CREATE TABLE IF NOT EXISTS platform_content (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(255) REFERENCES content_metadata(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    title TEXT,
    description TEXT,
    content TEXT,
    hashtags JSONB, -- array of strings
    script TEXT,
    chapters JSONB, -- array of {title, timestamp} objects
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_metadata_user_id ON content_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_content_metadata_created_at ON content_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_metadata_source_type ON content_metadata(source_type);
CREATE INDEX IF NOT EXISTS idx_preview_data_content_id ON preview_data(content_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_content_id ON platform_content(content_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_platform ON platform_content(platform);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automatic updated_at
CREATE TRIGGER update_content_metadata_updated_at
    BEFORE UPDATE ON content_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();