#!/usr/bin/env node
/*
  scripts/migrate_enterprise_requests.js

  Usage:
    node scripts/migrate_enterprise_requests.js --dry-run
    node scripts/migrate_enterprise_requests.js --field=statut --delete-legacy --create-missing

  Notes:
  - Requires a Firebase Admin SDK credential to be available via
    GOOGLE_APPLICATION_CREDENTIALS environment variable or other application default means.
  - Defaults to migrating 'statut' -> 'status' (French to English mapping).
  - By default, this script runs in dry-run mode. Use --apply to perform writes.
  - Use --delete-legacy to remove enterprise docs after successful migration (only allowed when --apply is set).
  - Use --create-missing to create a minimal request in `requests` when no match is found.
*/

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Simple args parsing (no external deps required)
const argv = process.argv.slice(2);
const args = argv.reduce((acc, cur) => {
  const [k, v] = cur.replace(/^--/, '').split('=');
  if (v === undefined) acc[k] = true; else acc[k] = v;
  return acc;
}, {});

const DRY_RUN = args['dry-run'] !== undefined || args['dryrun'] !== undefined || !args['apply'];
const FIELD = args['field'] || 'statut';
const DELETE_LEGACY = args['delete-legacy'] || args['deleteLegacy'] || false;
const CREATE_MISSING = args['create-missing'] || args['createMissing'] || false;
const LIMIT = Number(args['limit'] || 0) || 0; // 0 means no limit

// Mapping from French enterprise 'statut' to normalized 'status'
const STATUS_MAP = {
  'en_attente': 'pending',
  'approuvée': 'approved',
  'approuvee': 'approved',
  'rejetée': 'rejected',
  'rejetee': 'rejected',
  'en_cours': 'in_progress',
  'terminee': 'completed',
  'terminee': 'completed'
};

function mapStatus(value) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  return STATUS_MAP[v] || v;
}

async function initFirebase() {
  try {
    // Support service account provided via env var (useful for CI): FIREBASE_SERVICE_ACCOUNT
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saEnv) {
      try {
        let content = saEnv;
        // If looks base64-ish, attempt to decode
        if (/^[A-Za-z0-9+\/=\s]+$/.test(content) && content.length > 800) {
          try { content = Buffer.from(content, 'base64').toString('utf8'); } catch (e) { /* not base64 */ }
        }
        const saPath = path.join(process.cwd(), 'tmp_service_account.json');
        fs.writeFileSync(saPath, content, { encoding: 'utf8' });
        process.env.GOOGLE_APPLICATION_CREDENTIALS = saPath;
        console.log('Wrote service account to', saPath);
      } catch (e) {
        console.warn('Failed to write service account from env var FIREBASE_SERVICE_ACCOUNT:', e.message);
      }
    }

    // Initialize app with application default credentials - expects GOOGLE_APPLICATION_CREDENTIALS set
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    const db = admin.firestore();
    return db;
  } catch (err) {
    console.error('Firebase admin initialization failed. Ensure GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT is set to a service account JSON.');
    throw err;
  }
}

async function run() {
  const db = await initFirebase();
  console.log('Migration script started');
  console.log('Options:', { DRY_RUN, FIELD, DELETE_LEGACY, CREATE_MISSING, LIMIT });

  const entrepriseColl = db.collection('entrepriseRequests');
  const requestsColl = db.collection('requests');

  let snapshot;
  if (LIMIT > 0) {
    snapshot = await entrepriseColl.limit(LIMIT).get();
  } else {
    snapshot = await entrepriseColl.get();
  }

  console.log(`Found ${snapshot.size} entrepriseRequests to examine`);

  const report = {
    examined: 0,
    updated: 0,
    skipped: 0,
    missingMatches: [],
    ambiguousMatches: []
  };

  for (const docSnap of snapshot.docs) {
    report.examined += 1;
    const ent = docSnap.data();
    const entId = docSnap.id;
    const fieldValue = ent[FIELD];
    if (fieldValue === undefined) {
      report.skipped += 1;
      console.log(`Doc ${entId} has no field '${FIELD}', skipping`);
      continue;
    }

    const mappedValue = (FIELD === 'statut') ? mapStatus(fieldValue) : fieldValue;

    // Best-effort match: prefer requests where entrepriseId or createdBy equals entreprise's entrepriseId
    const entrepriseOwner = ent.entrepriseId || ent.createdBy || ent.orderGiverId || null;
    const title = ent.titre || ent.title || '';
    const entCreated = ent.createdAt ? (ent.createdAt.toDate ? ent.createdAt.toDate() : new Date(ent.createdAt)) : null;

    let candidates = [];

    try {
      if (entrepriseOwner) {
        const q1 = await requestsColl.where('entrepriseId', '==', entrepriseOwner).get().catch(() => null);
        const q2 = await requestsColl.where('createdBy', '==', entrepriseOwner).get().catch(() => null);
        if (q1 && q1.docs.length) q1.docs.forEach(d => candidates.push(d));
        if (q2 && q2.docs.length) q2.docs.forEach(d => candidates.push(d));
      }

      // Also try matching by title if we don't have results yet
      if (candidates.length === 0 && title) {
        const q3 = await requestsColl.where('title', '==', title).limit(10).get().catch(() => null);
        if (q3 && q3.docs.length) q3.docs.forEach(d => candidates.push(d));
      }

      // If still none, try simple text match on entreprise name or description (not ideal but may help)
      if (candidates.length === 0 && ent.entrepriseNom) {
        const q4 = await requestsColl.where('entrepriseNom', '==', ent.entrepriseNom).limit(10).get().catch(() => null);
        if (q4 && q4.docs.length) q4.docs.forEach(d => candidates.push(d));
      }
    } catch (e) {
      console.warn('Query failed for matching candidates, continuing:', e.message);
    }

    // Deduplicate candidates
    const uniqueCandidates = Array.from(new Map(candidates.map(d => [d.id, d])).values());

    if (uniqueCandidates.length === 0) {
      // No match found
      report.missingMatches.push({ entrepriseId: entId, entrepriseOwner, title });
      console.log(`No request match found for entreprise ${entId} (${title})`);
      if (CREATE_MISSING) {
        const createPayload = {
          title: title || ('Request from ' + (ent.entrepriseNom || entrepriseOwner || 'unknown')),
          description: ent.description || ent.description || '',
          serviceType: ent.typeService || ent.serviceType || '',
          status: mappedValue,
          location: ent.location || (ent.localisation ? { address: ent.localisation } : {}),
          entrepriseId: entrepriseOwner || null,
          entrepriseNom: ent.entrepriseNom || null,
          files: ent.files || ent.fichiers || [],
          createdBy: entrepriseOwner || null
        };

        console.log('Would create new request with:', createPayload);
        if (!DRY_RUN) {
          const newReqRef = await requestsColl.add({ ...createPayload, createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          console.log('Created new request', newReqRef.id);
          report.updated += 1;
        }
      }
      continue;
    }

    // Choose best candidate (closest by createdAt)
    let chosen = uniqueCandidates[0];
    if (uniqueCandidates.length > 1) {
      // If enterprise doc has created timestamp, choose nearest
      if (entCreated) {
        let best = null; let bestDiff = Number.POSITIVE_INFINITY;
        for (const cand of uniqueCandidates) {
          const candData = cand.data();
          const candCreated = candData.createdAt ? (candData.createdAt.toDate ? candData.createdAt.toDate() : new Date(candData.createdAt)) : null;
          if (candCreated) {
            const diff = Math.abs(candCreated - entCreated);
            if (diff < bestDiff) { bestDiff = diff; best = cand; }
          }
        }
        if (best) chosen = best;
      } else {
        // ambiguous - log and pick first
        report.ambiguousMatches.push({ entrepriseId: entId, candidates: uniqueCandidates.map(c => c.id) });
      }
    }

    const chosenData = chosen.data();
    const chosenId = chosen.id;

    const currentStatus = chosenData.status || chosenData.statut || null;
    if (String(currentStatus) === String(mappedValue)) {
      report.skipped += 1;
      console.log(`Request ${chosenId} already has status='${currentStatus}', skipping`);
      continue;
    }

    console.log(`Will update request ${chosenId}: '${currentStatus}' -> '${mappedValue}'`);
    if (!DRY_RUN) {
      await requestsColl.doc(chosenId).update({ status: mappedValue, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      report.updated += 1;

      if (DELETE_LEGACY) {
        try {
          await entrepriseColl.doc(entId).delete();
        } catch (e) {
          console.warn('Failed to delete legacy entreprise doc', entId, e.message);
        }
      }
    }
  }

  // Write report file
  const out = {
    summary: report,
    options: { DRY_RUN, FIELD, DELETE_LEGACY, CREATE_MISSING, LIMIT }
  };

  const outPath = path.join(process.cwd(), 'migration-report-enterprise-requests.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('Migration dry-run complete. Report written to', outPath);
  console.log('Summary:', report);
}

run().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
