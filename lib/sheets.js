// lib/sheets.js — Google Sheets API v4 database module
// Replaces lib/db.js — all MongoDB calls are re-implemented as Sheets operations.

const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.STUDIO_DB_ID;

// Column definitions for each tab — MUST match your sheet headers exactly (Row 1)
const SHEET_COLUMNS = {
  Users:           ['ID', 'Name', 'Email', 'Phone', 'PasswordHash', 'Provider', 'CreatedAt'],
  Pending:         ['ID', 'Name', 'Email', 'Phone', 'PasswordHash', 'Provider', 'CreatedAt'],
  ContactMessages: ['ID', 'CreatedAt', 'Name', 'Email', 'Phone', 'Subject', 'Message'],
  Orders:          ['OrderID', 'CreatedAt', 'UserEmail', 'UserPhone', 'Total', 'Status', 'Items', 'DeliveryAddress'],
  OTP_Tokens:      ['Token', 'Account', 'OTP', 'ExpiresAt', 'Purpose'],
};

let _authClient = null;

// ─── Auth Client (cached) ─────────────────────────────────────────────────────
async function getAuth() {
  if (_authClient) return _authClient;
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google Sheets credentials missing. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in env vars.');
  }
  _authClient = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  await _authClient.authorize();
  return _authClient;
}

// ─── Convert a row array → plain object using the sheet's column map ──────────
function rowToObject(sheetName, row) {
  const headers = SHEET_COLUMNS[sheetName];
  const obj = {};
  headers.forEach((h, i) => { obj[h] = (row[i] !== undefined && row[i] !== null) ? String(row[i]) : ''; });
  return obj;
}

// ─── Get all rows from a sheet as array of objects (skips header row) ─────────
async function getRows(sheetName) {
  if (!SPREADSHEET_ID) throw new Error('STUDIO_DB_ID env var not set.');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range:         `${sheetName}!A1:Z`,
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) return []; // only header row or empty
  return rows.slice(1).map(row => rowToObject(sheetName, row));
}

// ─── Append a new row ─────────────────────────────────────────────────────────
async function appendRow(sheetName, data) {
  if (!SPREADSHEET_ID) throw new Error('STUDIO_DB_ID env var not set.');
  const auth    = await getAuth();
  const sheets  = google.sheets({ version: 'v4', auth });
  const headers = SHEET_COLUMNS[sheetName];
  const row     = headers.map(h => data[h] ?? '');
  await sheets.spreadsheets.values.append({
    spreadsheetId:   SPREADSHEET_ID,
    range:           `${sheetName}!A1`,
    valueInputOption:'RAW',
    insertDataOption:'INSERT_ROWS',
    requestBody:     { values: [row] },
  });
}

// ─── Find first row where field === value ─────────────────────────────────────
// Returns { rowIndex (1-based), data } or null
async function findRow(sheetName, field, value) {
  if (!SPREADSHEET_ID) throw new Error('STUDIO_DB_ID env var not set.');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range:         `${sheetName}!A1:Z`,
  });
  const rows    = res.data.values || [];
  if (rows.length <= 1) return null;
  const headers = SHEET_COLUMNS[sheetName];
  const colIdx  = headers.indexOf(field);
  if (colIdx < 0) return null;
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][colIdx] ?? '') === String(value)) {
      return { rowIndex: i + 1, data: rowToObject(sheetName, rows[i]) };
    }
  }
  return null;
}

// ─── Find first row matching ANY of several {field, value} pairs ──────────────
// Equivalent to MongoDB $or — returns { rowIndex, data } or null
async function findRowOr(sheetName, conditions) {
  if (!SPREADSHEET_ID) throw new Error('STUDIO_DB_ID env var not set.');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range:         `${sheetName}!A1:Z`,
  });
  const rows    = res.data.values || [];
  if (rows.length <= 1) return null;
  const headers = SHEET_COLUMNS[sheetName];
  for (let i = 1; i < rows.length; i++) {
    for (const { field, value } of conditions) {
      const colIdx = headers.indexOf(field);
      if (colIdx < 0) continue;
      if ((rows[i][colIdx] ?? '') === String(value)) {
        return { rowIndex: i + 1, data: rowToObject(sheetName, rows[i]) };
      }
    }
  }
  return null;
}

// ─── Find ALL rows matching a field === value ─────────────────────────────────
async function findRows(sheetName, field, value) {
  const all = await getRows(sheetName);
  return all.filter(r => r[field] === String(value));
}

// ─── Update a specific row by its 1-based rowIndex ───────────────────────────
async function updateRow(sheetName, rowIndex, data) {
  if (!SPREADSHEET_ID) throw new Error('STUDIO_DB_ID env var not set.');
  const auth    = await getAuth();
  const sheets  = google.sheets({ version: 'v4', auth });
  const headers = SHEET_COLUMNS[sheetName];
  const row     = headers.map(h => data[h] ?? '');
  await sheets.spreadsheets.values.update({
    spreadsheetId:   SPREADSHEET_ID,
    range:           `${sheetName}!A${rowIndex}`,
    valueInputOption:'RAW',
    requestBody:     { values: [row] },
  });
}

// ─── Delete rows where field === value (deletes ALL matching rows) ────────────
async function deleteRowBy(sheetName, field, value) {
  if (!SPREADSHEET_ID) throw new Error('STUDIO_DB_ID env var not set.');
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Get numeric sheetId for batchUpdate
  const meta  = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) throw new Error(`Sheet tab "${sheetName}" not found in spreadsheet.`);
  const sheetId = sheet.properties.sheetId;

  // Collect matching row indices (1-based, data rows start at index 1 in values array = row 2 in sheet)
  const res  = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${sheetName}!A1:Z` });
  const rows = res.data.values || [];
  if (rows.length <= 1) return false;

  const headers = SHEET_COLUMNS[sheetName];
  const colIdx  = headers.indexOf(field);
  if (colIdx < 0) return false;

  // Collect matching 0-based sheet indices (header is index 0, first data row is index 1)
  const toDelete = [];
  for (let i = rows.length - 1; i >= 1; i--) { // iterate bottom-up so indices stay valid
    if ((rows[i][colIdx] ?? '') === String(value)) toDelete.push(i);
  }
  if (toDelete.length === 0) return false;

  // Build deleteDimension requests (already in reverse order)
  const requests = toDelete.map(idx => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 }
    }
  }));

  await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, requestBody: { requests } });
  return true;
}

// ─── Generate a unique ID (replaces MongoDB ObjectId) ────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

module.exports = { getRows, appendRow, findRow, findRowOr, findRows, updateRow, deleteRowBy, generateId };
