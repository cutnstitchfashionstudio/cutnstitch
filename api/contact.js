const { getCollection } = require('../utils/db');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  try {
    const { firstName, lastName, phone, email, subject, message } = req.body;
    if (!firstName || !lastName || !phone || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const name = `${firstName} ${lastName}`;

    // 1. Save to MongoDB
    const collection = await getCollection('contact_messages');
    if (collection) {
      await collection.insertOne({
        ID: Date.now().toString(),
        CreatedAt: new Date().toISOString(),
        Name: name,
        Email: email || '',
        Phone: phone,
        Subject: subject,
        Message: message || ''
      });
    } else {
      console.warn("Could not connect to database, but continuing to send email.");
    }

    // 2. Send Professional Email
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
        from: `"Nazia Studio Notifications" <${process.env.SMTP_USER}>`,
        to: process.env.CONTACT_RECEIVER_EMAIL || 'info@naziastudio.com',
        subject: `New Inquiry: ${subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Email:</strong> ${email || 'Not provided'}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left: 4px solid #C9A84C; padding-left: 10px;">
            ${message ? message.replace(/\n/g, '<br>') : 'No message provided.'}
          </blockquote>
        `
      };

      await transporter.sendMail(mailOptions);
    } else {
      console.warn("SMTP credentials not configured. Email notification skipped.");
    }

    res.status(200).json({ success: true, message: 'Your message has been received successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error while processing request' });
  }
};
