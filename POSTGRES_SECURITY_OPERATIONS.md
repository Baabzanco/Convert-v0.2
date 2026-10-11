# Standalone PostgreSQL Infrastructure, Security & Operations Guide

## 1. Architectural Architecture & Firebase Prohibition Guarantee

This system operates on a **standalone PostgreSQL database** with a direct server-side connection via **Prisma ORM**. 

- **No Firebase packages, dependencies, SDKs, or services** are installed or permitted in this project.
- **Zero Firebase Authentication or Firestore** is required or referenced.
- Administration and content management data persist exclusively in PostgreSQL tables.
- **User Files & Media:** In strict adherence to security constraints, **no tables or storage endpoints exist for user file uploads or converted media**. All user file operations occur locally in the client browser.

---

## 2. Normalized Schema Specification

The PostgreSQL schema (`prisma/schema.prisma`) comprises seven normalized tables:

| Table | Purpose | Security & Integrity Rules |
| :--- | :--- | :--- |
| `admin_users` | Administrator accounts | Unique `username`, unique `email`, Argon2id password hash, lockout tracking (`failedLoginAttempts`, `lockedUntil`), role-based access |
| `admin_sessions` | Database-backed admin sessions | Unique `sessionToken` (SHA-256 hash), foreign key with `ON DELETE CASCADE` to `admin_users`, expiration index |
| `pages` | Structured CMS pages | Unique `slug`, status index (`DRAFT`, `PUBLISHED`, `ARCHIVED`), `JSONB` structured content |
| `page_seo` | Per-page SEO metadata | 1-to-1 foreign key to `pages` with `ON DELETE CASCADE`, meta tags, OpenGraph, JSON-LD schema |
| `content_revisions` | Versioned content history | Foreign key with `ON DELETE CASCADE` to `pages`, optional `authorId` (`ON DELETE SET NULL`), composite unique constraint `[pageId, revisionNumber]` |
| `redirect_rules` | SEO 301/302/307/308 redirects | Unique `sourcePath`, status code verification, hit counter, active status index |
| `security_audit_events` | Immutable security log | Records authentication events, resource modifications, client IP, user agent. **Strictly redacts passwords, tokens, and secrets.** |

---

## 3. Environment Variables & Connection Configuration

Server-only connection string defined in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/cms_admin?schema=public"
SESSION_SECRET="CHANGE_THIS_TO_A_SECURE_RANDOM_SECRET_KEY_AT_LEAST_64_CHARS"
ADMIN_INITIAL_USERNAME="admin"
ADMIN_INITIAL_EMAIL="admin@example.com"
ADMIN_INITIAL_PASSWORD="SecureAdminPassword2026!"
```

**Security Rules:**
- `DATABASE_URL` is never exposed to client bundles or browser responses.
- Client applications access database records exclusively through authenticated backend proxy endpoints (`/api/admin/...`).

---

## 4. Prisma Migration Workflows

### Generating & Applying Migrations in Development
```bash
# 1. Update schema in prisma/schema.prisma
# 2. Run Prisma migration generator:
npx prisma migrate dev --name <descriptive_change_name>

# 3. Regenerate Prisma Client:
npx prisma generate
```

### Applying Migrations in Staging & Production
```bash
# Runs version-controlled migration files in order against the production database:
npx prisma migrate deploy
```

### Checking Migration Status
```bash
npx prisma migrate status
```

---

## 5. Standalone PostgreSQL Prerequisites & Setup

### Option A: Local / Self-Hosted Linux (Debian / Ubuntu)
```bash
# 1. Install PostgreSQL and contrib modules
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# 2. Create database and admin user
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "CREATE DATABASE cms_admin OWNER postgres;"

# 3. Set connection string in .env:
DATABASE_URL="postgresql://postgres:your_secure_password@127.0.0.1:5432/cms_admin?schema=public"
```

### Option B: Standalone Managed PostgreSQL (Independent of Firebase)
Any PostgreSQL 14+ database (e.g., self-hosted VM, Amazon RDS PostgreSQL, Neon standalone, DigitalOcean Managed PostgreSQL) can be used simply by setting `DATABASE_URL`:
```env
DATABASE_URL="postgresql://db_user:db_password@postgres.yourdomain.com:5432/cms_admin?sslmode=require"
```

---

## 6. Backup & Restore Procedures

### Database Backup (Logical Dump)
To generate an atomic, consistent SQL dump:
```bash
# Backup plain SQL
pg_dump -h 127.0.0.1 -p 5432 -U postgres -d cms_admin -F c -b -v -f "/backups/cms_admin_$(date +%Y%m%d_%H%M%S).dump"

# Or plain text SQL script:
pg_dump -h 127.0.0.1 -p 5432 -U postgres -d cms_admin > "/backups/cms_admin_$(date +%Y%m%d_%H%M%S).sql"
```

### Database Restore
```bash
# 1. Drop and recreate clean database target:
dropdb -h 127.0.0.1 -p 5432 -U postgres cms_admin
createdb -h 127.0.0.1 -p 5432 -U postgres cms_admin

# 2. Restore from custom dump:
pg_restore -h 127.0.0.1 -p 5432 -U postgres -d cms_admin -v "/backups/cms_admin_YYYYMMDD_HHMMSS.dump"

# Or from plain SQL:
psql -h 127.0.0.1 -p 5432 -U postgres -d cms_admin -f "/backups/cms_admin_YYYYMMDD_HHMMSS.sql"
```

---

## 7. Defense-in-Depth Security Controls

1. **Password Hashing (Argon2id):**
   - Memory cost: 64 MB (`65536` KiB)
   - Time iterations: `3`
   - Parallelism: `1`
   - Resists GPU and ASIC brute-force attacks.

2. **Session Security:**
   - 256-bit cryptographically random tokens (`crypto.randomBytes(32)`).
   - Only the SHA-256 hash is stored in PostgreSQL. If the database is read maliciously, attacker cannot forge session tokens.
   - Sent via `httpOnly`, `sameSite=lax`, and `secure` cookies.

3. **Rate Limiting:**
   - Sliding window limiter (5 attempts per minute per IP address on authentication endpoints).
   - Account lockout after 5 consecutive failed attempts for 15 minutes.

4. **Stored XSS Prevention:**
   - Input sanitization strips dangerous HTML tags, `javascript:` URIs, and event handlers from all administrator-editable content before database persistence.

5. **SQL Injection Defense:**
   - All queries utilize Prisma ORM parameterized queries. Raw string concatenation in queries is strictly prohibited.

6. **Audit Event Sanitization:**
   - All events filter keys matching `password`, `token`, `secret`, `cookie`, `session`, `credential`. Only safe contextual metadata is logged.
