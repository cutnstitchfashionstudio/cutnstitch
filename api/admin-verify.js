const { findRowOr, appendRow, deleteRowBy } = require('../lib/sheets');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { phone, secret } = req.body;
    
    // In a real app, use an environment variable for ADMIN_SECRET
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'cutnstitch-admin-key-2026';
    
    if (secret !== ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Try finding by exact match or formatted phone
    let searchVal = phone.trim();
    let formattedPhone = searchVal;
    if (!searchVal.includes('@') && !searchVal.startsWith('+')) {
      formattedPhone = '+' + searchVal;
    }

    const conditions = [
      { field: 'Phone', value: searchVal },
      { field: 'Phone', value: formattedPhone },
      { field: 'Email', value: searchVal }
    ];

    const pendingRes = await findRowOr('Pending', conditions);

    if (!pendingRes) {
      const verifiedRes = await findRowOr('Users', conditions);
      if (verifiedRes) {
        return res.status(200).json({ success: true, message: `User is already verified.` });
      }
      return res.status(404).json({ error: 'User not found in pending verifications.' });
    }

    const userRow = pendingRes.data;

    // Move to users sheet
    await deleteRowBy('Pending', 'ID', userRow.ID);
    await appendRow('Users', userRow);

    res.status(200).json({ success: true, message: `User ${searchVal} successfully verified.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database Error: ' + err.message });
  }
};
