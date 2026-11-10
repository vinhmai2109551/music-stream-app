-- pgvector: the "vector" column type and its distance operators, for semantic search and
-- recommendations. Needs the pgvector build of PostgreSQL (docker-compose.yml, CI); a host that
-- does not ship the extension cannot apply this migration.
CREATE EXTENSION IF NOT EXISTS vector;
