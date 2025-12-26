Migration: entrepriseRequests → requests

Purpose
-------
This migration script helps move a single field (default: `statut`) from legacy `entrepriseRequests` documents into the unified `requests` collection.

Safety
------
- The script defaults to dry-run mode. It will *not* modify Firestore unless you pass `--apply`.
- It writes a JSON report to `migration-report-enterprise-requests.json` with a summary of proposed changes.
- Optionally supports `--create-missing` to create a minimal request when no match is found and `--delete-legacy` to remove legacy docs (only allowed when `--apply` is provided).

Requirements
------------
- Node.js installed
- `firebase-admin` is required. Install in your environment (recommended as a dev dependency):

  npm install --save-dev firebase-admin

- A service account JSON key or application default credentials: set `GOOGLE_APPLICATION_CREDENTIALS` to the key file path.

Usage
-----
Dry-run (recommended):

  node scripts/migrate_enterprise_requests.js --dry-run

Apply changes (careful):

  node scripts/migrate_enterprise_requests.js --apply

Apply and delete legacy docs (destructive):

  node scripts/migrate_enterprise_requests.js --apply --delete-legacy

Create missing requests when no match found:

  node scripts/migrate_enterprise_requests.js --apply --create-missing
GitHub Actions (automated run)
-----------------------------
You can run the migration in CI via a manual GitHub Actions workflow. Steps:

1. Add your Firebase service account JSON to the repository secrets as `FIREBASE_SERVICE_ACCOUNT` (value may be the raw JSON or base64-encoded JSON).
2. Open the repository Actions -> Workflows -> "Migrate enterpriseRequests → requests" and click "Run workflow".
3. Fill inputs:
   - `apply`: set to `yes` to perform writes; default is `no` (dry-run).
   - `deleteLegacy`: set `yes` to remove `entrepriseRequests` documents after update (only when `apply` = `yes`).
   - `createMissing`: create minimal `requests` where no match is found (only when `apply` = `yes`).
   - `limit`: optional integer to limit processed documents for testing.

The action will upload the generated `migration-report-enterprise-requests.json` as an artifact.
Options
-------
--field=FIELD           Field to migrate from entrepriseRequests (defaults to `statut`)
--dry-run               Default. Simulate changes only until --apply is passed.
--apply                 Perform writes instead of simulating.
--delete-legacy         Delete legacy entrepriseRequests docs after successful update (requires --apply).
--create-missing        Create a minimal request in `requests` when no matching request is found (requires --apply).
--limit=N               Only process up to N entrepriseRequests (for testing)

Recommendation
--------------
1. Run a dry-run: `node scripts/migrate_enterprise_requests.js --dry-run` and inspect `migration-report-enterprise-requests.json`.
2. Confirm with stakeholders.
3. Run with `--apply` (and optionally `--delete-legacy`) on a maintenance window.

Support
-------
If you'd like, I can: prepare a migration preview for a small sample, or add an optional `--preview` output with example document diffs.