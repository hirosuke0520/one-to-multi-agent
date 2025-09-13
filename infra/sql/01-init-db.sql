-- Initialize database for production
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(255) PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    targets TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) REFERENCES jobs(id),
    type VARCHAR(50) NOT NULL,
    path TEXT,
    duration INTEGER,
    language VARCHAR(10) DEFAULT 'ja',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS canonical_content (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) REFERENCES jobs(id),
    title TEXT,
    summary TEXT,
    full_text TEXT,
    key_points TEXT,
    topics TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_content (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) REFERENCES jobs(id),
    platform VARCHAR(50) NOT NULL,
    primary_text TEXT,
    alt_text TEXT,
    tags TEXT,
    link TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publish_results (
    id VARCHAR(255) PRIMARY KEY,
    job_id VARCHAR(255) REFERENCES jobs(id),
    platform VARCHAR(50) NOT NULL,
    success BOOLEAN NOT NULL,
    platform_id TEXT,
    url TEXT,
    status VARCHAR(50),
    message TEXT,
    published_at TIMESTAMP,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_sources_job_id ON sources(job_id);
CREATE INDEX IF NOT EXISTS idx_canonical_content_job_id ON canonical_content(job_id);
CREATE INDEX IF NOT EXISTS idx_platform_content_job_id ON platform_content(job_id);
CREATE INDEX IF NOT EXISTS idx_publish_results_job_id ON publish_results(job_id);
CREATE INDEX IF NOT EXISTS idx_publish_results_platform ON publish_results(platform);