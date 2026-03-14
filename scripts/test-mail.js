import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true,
  debug: true,
});

async function testMail() {
  console.log('Testing SMTP connection with:');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  try {
    await transporter.verify();
    console.log('✅ Connection established successfully');

    const info = await transporter.sendMail({
      from: `"Listly Debug" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self
      subject: 'Listly Mail Test',
      text: 'This is a test email from the Listly debug script.',
    });

    console.log('✅ Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('❌ Mail test failed:', error);
  }
}

testMail();
