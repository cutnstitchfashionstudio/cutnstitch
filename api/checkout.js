const { findRow } = require('../lib/sheets');
const { appendRow, generateId } = require('../lib/sheets');
const nodemailer = require('nodemailer');
const jwt    = require('jsonwebtoken');
const { parse } = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ── Verification guard: reject unverified accounts ─────────────────────
    const cookies = parse(req.headers.cookie || '');
    const token   = cookies.auth_token;
    if (token) {
      try {
        const decoded  = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod');
        const inUsers  = await findRow('Users',   'ID', decoded.id);
        const inPending = !inUsers && await findRow('Pending', 'ID', decoded.id);
        if (inPending) {
          return res.status(403).json({
            error: 'ACCOUNT_UNVERIFIED',
            message: 'Your account must be verified before placing an order.'
          });
        }
      } catch {
        // Invalid token — continue, customer details validation below handles it
      }
    }
    // ── End verification guard ─────────────────────────────────────────────

    const { items, total, customer, paymentMethod } = req.body;

    if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
    if (!customer || !customer.email || !customer.phone) {
      return res.status(400).json({ error: 'Missing customer details' });
    }

    const orderId     = 'ORD-' + Date.now().toString().slice(-6);
    const orderTotal  = total;
    const paymentStatus = paymentMethod === 'COD' ? 'Pending (COD)' : 'Paid (Simulated Gateway)';

    // Save to Google Sheets
    await appendRow('Orders', {
      OrderID:         orderId,
      CreatedAt:       new Date().toISOString(),
      UserEmail:       customer.email || '',
      UserPhone:       customer.phone || '',
      Total:           String(orderTotal),
      Status:          paymentStatus,
      Items:           items.map(i => `${i.name} (x${i.quantity})`).join(', '),
      DeliveryAddress: `${customer.address || ''}, ${customer.city || ''}`,
    });

    // Send order confirmation email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || 587,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
      await transporter.sendMail({
        from:    `"Cut & Stitch Fashion Studio" <${process.env.SMTP_USER}>`,
        to:      customer.email,
        subject: `Order Confirmation - ${orderId}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333;">
            <h2 style="color:#C9A84C;">Thank you for your order!</h2>
            <p>Hi ${customer.firstName || customer.name || 'Customer'},</p>
            <p>We've received your order <strong>${orderId}</strong> and are processing it.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:20px;">
              <tr style="background:#f8f8f8;border-bottom:2px solid #ddd;">
                <th style="padding:10px;text-align:left;">Item</th>
                <th style="padding:10px;text-align:right;">Total</th>
              </tr>
              ${items.map(i => `
                <tr style="border-bottom:1px solid #ddd;">
                  <td style="padding:10px;">${i.name} x${i.quantity}</td>
                  <td style="padding:10px;text-align:right;">Rs. ${i.price * i.quantity}</td>
                </tr>
              `).join('')}
              <tr>
                <td style="padding:10px;font-weight:bold;text-align:right;">Grand Total:</td>
                <td style="padding:10px;font-weight:bold;text-align:right;">Rs. ${orderTotal}</td>
              </tr>
            </table>
          </div>
        `
      });
    }

    res.status(200).json({ success: true, orderId, message: 'Order placed successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error while processing checkout' });
  }
};
