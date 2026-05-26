const { getCollection } = require('../lib/db');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { parse } = require('cookie');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    // --- VERIFICATION GUARD ---
    // Reject orders from unverified accounts, even if frontend is bypassed
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-prod');
        const usersCol = await getCollection('users');
        const pendingCol = await getCollection('pending');
        if (usersCol && pendingCol) {
          const inUsers = await usersCol.findOne({ ID: decoded.id });
          if (!inUsers) {
            const inPending = await pendingCol.findOne({ ID: decoded.id });
            if (inPending) {
              return res.status(403).json({ error: 'ACCOUNT_UNVERIFIED', message: 'Your account must be verified before placing an order.' });
            }
          }
        }
      } catch (jwtErr) {
        // Invalid token - continue, the customer details validation below will handle anonymous attempts
      }
    }
    // --- END VERIFICATION GUARD ---

    const { items, total, customer, paymentMethod } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!customer || !customer.email || !customer.phone) {
      return res.status(400).json({ error: 'Missing customer details' });
    }

    // Server-side validation of total (mocked for now, usually you fetch prices from DB)
    const orderTotal = total; 
    const orderId = 'ORD-' + Date.now().toString().slice(-6);

    // --- PAYMENT GATEWAY INTEGRATION POINT ---
    // Here is where you would initialize JazzCash, EasyPaisa, or Bank API.
    // e.g., const paymentSession = await JazzCash.createSession({ amount: orderTotal, returnUrl: '...' })
    const paymentStatus = paymentMethod === 'COD' ? 'Pending (COD)' : 'Paid (Simulated Gateway)';
    // -----------------------------------------

    // 1. Save to MongoDB
    const collection = await getCollection('orders');
    if (collection) {
      await collection.insertOne({
        OrderID: orderId,
        CreatedAt: new Date().toISOString(),
        UserEmail: customer.email,
        Total: orderTotal,
        Status: paymentStatus,
        Items: items.map(i => `${i.name} (x${i.quantity})`),
        DeliveryAddress: `${customer.address}, ${customer.city}`
      });
    } else {
      console.warn("Could not connect to database, but continuing with order processing.");
    }

    // 2. Send Order Confirmation Email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      const mailOptions = {
        from: `"Nazia Studio" <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject: `Order Confirmation - ${orderId}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #C9A84C;">Thank you for your order!</h2>
            <p>Hi ${customer.firstName},</p>
            <p>We've received your order <strong>${orderId}</strong> and are processing it.</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr style="background-color: #f8f8f8; border-bottom: 2px solid #ddd;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: right;">Total</th>
              </tr>
              ${items.map(item => `
                <tr style="border-bottom: 1px solid #ddd;">
                  <td style="padding: 10px;">${item.name} x${item.quantity}</td>
                  <td style="padding: 10px; text-align: right;">Rs. ${item.price * item.quantity}</td>
                </tr>
              `).join('')}
              <tr>
                <td style="padding: 10px; font-weight: bold; text-align: right;">Grand Total:</td>
                <td style="padding: 10px; font-weight: bold; text-align: right;">Rs. ${orderTotal}</td>
              </tr>
            </table>
          </div>
        `
      };
      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ 
      success: true, 
      orderId, 
      message: 'Order placed successfully!' 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error while processing checkout' });
  }
};
