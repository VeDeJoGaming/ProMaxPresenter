CREATE TABLE IF NOT EXISTS private_spaces (
  token_hash TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  manifest_json TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS private_blobs (
  space TEXT NOT NULL REFERENCES private_spaces(token_hash),
  hash TEXT NOT NULL,
  data TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  PRIMARY KEY(space, hash)
);
