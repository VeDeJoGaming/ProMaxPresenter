CREATE TABLE IF NOT EXISTS bible_uploads (
 id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id), owner_member_id TEXT NOT NULL REFERENCES members(id),
 name TEXT NOT NULL, verse_count INTEGER NOT NULL, chunk_count INTEGER NOT NULL, byte_length INTEGER NOT NULL,
 digest TEXT NOT NULL, base_version TEXT, created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS bible_chunks (
 upload_id TEXT NOT NULL REFERENCES bible_uploads(id) ON DELETE CASCADE, chunk_index INTEGER NOT NULL,
 text TEXT NOT NULL, PRIMARY KEY(upload_id,chunk_index)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS group_bibles (
 group_id TEXT PRIMARY KEY REFERENCES groups(id), version_id TEXT NOT NULL REFERENCES bible_uploads(id),
 owner_member_id TEXT NOT NULL REFERENCES members(id), updated_at INTEGER NOT NULL
);
