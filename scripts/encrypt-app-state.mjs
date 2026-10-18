import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const execute = process.argv.includes('--execute');
const batchSize = 50;
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const rawKey = process.env.APP_STATE_ENCRYPTION_KEY || '';
const key = Buffer.from(rawKey, 'base64');

if (!supabaseUrl || !serviceRoleKey || key.length !== 32) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and a 32-byte base64 APP_STATE_ENCRYPTION_KEY are required');
}

const request = async (path, options = {}) => {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${path} failed with HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
};

const encrypt = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { version: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
};

const decrypt = (value) => {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
};

const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const report = { mode: execute ? 'execute' : 'dry-run', scanned: 0, alreadyEncrypted: 0, candidates: 0, migrated: 0, failed: 0, remainingPlaintext: 0 };

for (let offset = 0; ; offset += batchSize) {
  const rows = await request(`/rest/v1/app_state?select=user_id,data,encrypted_data&order=user_id.asc&limit=${batchSize}&offset=${offset}`);
  if (!rows.length) break;
  for (const row of rows) {
    report.scanned += 1;
    if (row.encrypted_data) {
      report.alreadyEncrypted += 1;
      continue;
    }
    if (row.data === null || row.data === undefined) continue;
    report.candidates += 1;
    try {
      const encryptedData = encrypt(row.data);
      // Verify before any write. If this fails, the plaintext row is untouched.
      if (!sameJson(decrypt(encryptedData), row.data)) throw new Error('encrypt/decrypt verification failed');
      if (execute) {
        await request(`/rest/v1/app_state?user_id=eq.${encodeURIComponent(row.user_id)}&encrypted_data=is.null`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          // Set ciphertext and clear plaintext in a single database update.
          body: JSON.stringify({ encrypted_data: encryptedData, data: null, updated_at: new Date().toISOString() }),
        });
        report.migrated += 1;
      }
    } catch (error) {
      report.failed += 1;
      console.error(`Migration failed for one row: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (rows.length < batchSize) break;
}

const remaining = await request('/rest/v1/app_state?data=not.is.null&select=user_id');
report.remainingPlaintext = remaining.length;
console.log(JSON.stringify(report));
if (report.failed || (execute && report.remainingPlaintext)) process.exitCode = 1;
