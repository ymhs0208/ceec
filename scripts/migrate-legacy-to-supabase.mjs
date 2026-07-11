import { createHash, createHmac, randomBytes, webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import XLSX from 'xlsx';

dotenv.config({ path: path.resolve('.env.local') });

const args = process.argv.slice(2);
const execute = args.includes('--execute');
const inputArg = args.find((arg) => !arg.startsWith('--'));
const inputPath = path.resolve(inputArg || '../大考倒數資料庫上線版.xlsx');
const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const serverSecret = process.env.LEGACY_SERVER_SECRET || 'FOCUS_SPACE_SECURE_KEY_2026_CHANGE_ME_TO_RANDOM_STRING';

const report = {
  mode: execute ? 'execute' : 'dry-run',
  input: inputPath,
  users: { total: 0, valid: 0, invalid: 0, duplicate: 0, decrypted: 0, emptyData: 0, decryptFailed: 0 },
  sessions: { total: 0, valid: 0, orphaned: 0 },
  studyLogs: { total: 0, valid: 0, orphaned: 0 },
  uploaded: { authUsersCreated: 0, profiles: 0, appStates: 0, sessions: 0, studyLogs: 0 },
  warnings: [],
};

const clean = (value) => String(value ?? '').replace(/^'/, '').trim();
const normalizeEmail = (value) => clean(value).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const excelDateToIso = (value) => {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') {
    return new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
};

const unpackSecureData = (storedData, email) => {
  const value = clean(storedData);
  if (!value) return '';
  const separator = value.lastIndexOf('|||');
  if (separator < 0) return value;

  const rawData = value.slice(0, separator);
  const signature = value.slice(separator + 3);
  const expected = createHmac('sha256', serverSecret).update(rawData + email).digest('hex');
  if (signature !== expected) {
    throw new Error('legacy HMAC signature mismatch');
  }
  return rawData;
};

const decryptAppData = async (storedData, key, email) => {
  const encrypted = unpackSecureData(storedData, email);
  if (!encrypted) return null;

  const combined = Buffer.from(encrypted, 'base64');
  if (combined.length <= 28) throw new Error('encrypted payload is too short');
  const iv = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    Buffer.from(clean(key), 'base64'),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  const plaintext = await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
  return JSON.parse(Buffer.from(plaintext).toString('utf8'));
};

const getRows = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing worksheet: ${sheetName}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
};

const request = async (route, options = {}) => {
  const response = await fetch(`${supabaseUrl}${route}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=merge-duplicates',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || 'GET'} ${route}: ${response.status} ${body}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const listAuthUsers = async () => {
  const users = [];
  for (let page = 1; ; page += 1) {
    const data = await request(`/auth/v1/admin/users?page=${page}&per_page=1000`);
    const pageUsers = data?.users || [];
    users.push(...pageUsers);
    if (pageUsers.length < 1000) return users;
  }
};

const createAuthUser = async (legacyUser) => {
  const data = await request('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: legacyUser.email,
      password: randomBytes(32).toString('base64url'),
      email_confirm: true,
      user_metadata: {
        name: legacyUser.name,
        exam_type: legacyUser.examType,
        migrated_from: 'google_sheets',
        must_reset_password: true,
      },
    }),
  });
  report.uploaded.authUsersCreated += 1;
  return data;
};

const upsertRows = async (table, rows, onConflict, reportKey) => {
  const batchSize = 250;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      body: JSON.stringify(batch),
    });
    report.uploaded[reportKey] += batch.length;
  }
};

if (!fs.existsSync(inputPath)) {
  throw new Error(`找不到舊資料檔：${inputPath}`);
}
if (execute && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error('執行匯入需要 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY');
}

const workbook = XLSX.readFile(inputPath, { cellDates: false });
const userRows = getRows(workbook, 'Users');
const sessionRows = getRows(workbook, 'Sessions');
const logRows = getRows(workbook, 'StudyLogs');
report.users.total = userRows.length;
report.sessions.total = sessionRows.length;
report.studyLogs.total = logRows.length;

const usersByEmail = new Map();
for (const row of userRows) {
  const email = normalizeEmail(row.Email);
  if (!isEmail(email)) {
    report.users.invalid += 1;
    continue;
  }
  if (usersByEmail.has(email)) {
    report.users.duplicate += 1;
    continue;
  }

  const legacyUser = {
    email,
    name: clean(row.Name) || email.split('@')[0],
    team: clean(row['戰隊'] ?? row.Team),
    examType: clean(row['身份'] ?? row.ExamType) || '116gsat',
    registrationDate: excelDateToIso(row.RegistrationDate),
    lastLoginDate: excelDateToIso(row.LastLoginDate),
    appData: null,
  };

  try {
    legacyUser.appData = await decryptAppData(row.EncryptedData, row.EncryptionKey, email);
    if (legacyUser.appData) report.users.decrypted += 1;
    else report.users.emptyData += 1;
  } catch (error) {
    report.users.decryptFailed += 1;
    report.warnings.push(`無法解密 ${email}: ${error.message}`);
  }

  usersByEmail.set(email, legacyUser);
  report.users.valid += 1;
}

const validSessions = sessionRows.filter((row) => {
  const valid = usersByEmail.has(normalizeEmail(row.Email)) && clean(row.DeviceId);
  if (valid) report.sessions.valid += 1;
  else report.sessions.orphaned += 1;
  return valid;
});

const validLogs = logRows.filter((row) => {
  const valid = usersByEmail.has(normalizeEmail(row.Email))
    && Number.isFinite(Number(row.DurationMinutes))
    && Number.isFinite(Number(row.Timestamp));
  if (valid) report.studyLogs.valid += 1;
  else report.studyLogs.orphaned += 1;
  return valid;
});

if (execute) {
  const existingUsers = await listAuthUsers();
  const authByEmail = new Map(existingUsers.map((user) => [normalizeEmail(user.email), user]));

  for (const legacyUser of usersByEmail.values()) {
    if (!authByEmail.has(legacyUser.email)) {
      const authUser = await createAuthUser(legacyUser);
      authByEmail.set(legacyUser.email, authUser);
    }
  }

  const profiles = [];
  const appStates = [];
  for (const legacyUser of usersByEmail.values()) {
    const authUser = authByEmail.get(legacyUser.email);
    if (!authUser?.id) {
      report.warnings.push(`Supabase Auth 缺少帳號：${legacyUser.email}`);
      continue;
    }
    profiles.push({
      id: authUser.id,
      email: legacyUser.email,
      name: legacyUser.name,
      team: legacyUser.team,
      exam_type: legacyUser.examType,
      created_at: legacyUser.registrationDate,
      last_login_at: legacyUser.lastLoginDate,
    });
    if (legacyUser.appData) {
      appStates.push({
        user_id: authUser.id,
        data: legacyUser.appData,
        updated_at: legacyUser.lastLoginDate,
      });
    }
  }

  const devices = validSessions.map((row) => {
    const email = normalizeEmail(row.Email);
    return {
      user_id: authByEmail.get(email).id,
      device_id: clean(row.DeviceId),
      device_name: clean(row.DeviceName) || 'Unknown Device',
      last_active_at: excelDateToIso(row.LastActiveTime),
      created_at: excelDateToIso(row.CreatedTime),
    };
  });

  const studyLogs = validLogs.map((row, index) => {
    const email = normalizeEmail(row.Email);
    const timestamp = Number(row.Timestamp);
    const digest = createHash('sha256')
      .update(`${email}|${timestamp}|${clean(row.SubjectName)}|${Number(row.DurationMinutes)}|${index}`)
      .digest('hex')
      .slice(0, 24);
    return {
      user_id: authByEmail.get(email).id,
      session_id: `legacy-${digest}`,
      subject_name: clean(row.SubjectName) || '其他',
      duration_minutes: Math.max(0, Math.round(Number(row.DurationMinutes))),
      session_timestamp: Math.round(timestamp),
      created_at: excelDateToIso(row.CreateTime),
    };
  });

  await upsertRows('profiles', profiles, 'id', 'profiles');
  await upsertRows('app_state', appStates, 'user_id', 'appStates');
  await upsertRows('devices', devices, 'user_id,device_id', 'sessions');
  await upsertRows('study_logs', studyLogs, 'user_id,session_id', 'studyLogs');
}

const reportPath = path.resolve('migration-report.json');
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
console.log(`\nMigration report: ${reportPath}`);
