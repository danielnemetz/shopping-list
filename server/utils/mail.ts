import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

export const getMailTransporter = () => {
  if (transporter) return transporter;

  const config = useRuntimeConfig();

  console.log('--- Mailer Config Start ---');
  console.log('Host:', config.smtpHost);
  console.log('Port:', config.smtpPort);
  console.log('User:', config.smtpUser);
  console.log('Secure:', parseInt(config.smtpPort || '587') === 465);
  console.log('--- Mailer Config End ---');

  const port = parseInt(config.smtpPort || '587');
  const finalPort = isNaN(port) ? 587 : port;

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: finalPort,
    secure: finalPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
    logger: true,
    debug: true,
  });

  return transporter;
};

export const sendLoginCode = async (to: string, code: string) => {
  const mailer = getMailTransporter();
  const config = useRuntimeConfig();
  const baseUrl = config.baseUrl || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/auth/magic?email=${encodeURIComponent(to)}&code=${encodeURIComponent(code)}`;

  console.log(`[MAIL] Sending login code to ${to} via ${baseUrl}`);
  console.log(`[MAIL] SMTP Host: ${config.smtpHost}, Port: ${config.smtpPort || '587 (default)'}`);
  
  const mailOptions = {
    from: `"Listly" <${config.smtpUser || 'noreply@listly.app'}>`,
    to,
    subject: `Dein Login-Code für Listly: ${code}`,
    text: `Hallo!\n\nDein sicherer Login Code für Listly lautet: ${code}\n\nKlicke auf den folgenden Link, um dich direkt einzuloggen:\n\n${loginUrl}\n\nDieser Link ist 15 Minuten lang gültig.\nFalls du diesen Link nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #1e293b;">
        <h2 style="color: #3b82f6;">Listly Login</h2>
        <p>Hallo!</p>
        <p>Dein sicherer Login Code lautet:</p>
        <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; color: #0f172a;">
          ${code}
        </div>
        <p>Klicke auf den Button unten, um dich direkt einzuloggen:</p>
        <div style="margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">Jetzt Einloggen</a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Dieser Code ist 15 Minuten lang gültig.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser oder gib den Code manuell ein:<br>${loginUrl}</p>
      </div>
    `,
  };

  try {
    await mailer.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    if (!config.smtpHost || !config.smtpUser) {
      console.warn('⚠️ FALLBACK: SMTP Config missing. Printing Magic Link to console:');
      console.warn(`\n=== MAGIC LINK FOR ${to} ===\n${loginUrl}\n==========================\n`);
      return true;
    }
    return false;
  }
};
