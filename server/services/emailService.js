const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/* SMTP-based email (works with Brevo, Resend SMTP, Gmail app-password, Mailtrap...).
   If SMTP isn't configured, calls resolve with { skipped: true } so flows don't break. */
let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

async function sendInvoiceEmail({ to, subject, html, pdfBuffer, invoiceNumber }) {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('SMTP not configured — email not sent');
    return { skipped: true, reason: 'SMTP not configured' };
  }

  // Verify the PDF buffer is real before sending — makes it obvious in logs
  // whether the attachment was actually built or silently missing.
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    logger.warn(`sendInvoiceEmail called with no valid PDF buffer for invoice ${invoiceNumber || '(unknown)'} — email will go out WITHOUT an attachment`);
  } else {
    logger.info(`Attaching invoice PDF (${pdfBuffer.length} bytes) as ${invoiceNumber || 'invoice'}.pdf to email for ${to}`);
  }

  const info = await tx.sendMail({
    from: process.env.EMAIL_FROM || 'no-reply@tailorshop.com',
    to,
    subject,
    html,
    attachments: pdfBuffer && pdfBuffer.length > 0
      ? [{ filename: `${invoiceNumber || 'invoice'}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
      : [],
  });
  logger.info(`Email sent to ${to} — messageId: ${info.messageId}`);
  return { skipped: false, messageId: info.messageId };
}

function buildInvoiceHtml({ shopName, customerName, invoiceNumber, orderNumber, grandTotal, paid, balance, deliveryDate, invoiceLink }) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <h2 style="color:#222">${shopName}</h2>
    <p>Dear ${customerName},</p>
    <p>Please find your invoice <b>${invoiceNumber}</b>${orderNumber ? ` (Order ${orderNumber})` : ''} attached as a PDF.</p>
    <table style="width:100%;border-collapse:collapse">
      <tr><td>Total</td><td align="right">Rs. ${Number(grandTotal).toLocaleString('en-IN')}</td></tr>
      <tr><td>Paid</td><td align="right">Rs. ${Number(paid).toLocaleString('en-IN')}</td></tr>
      <tr><td><b>Balance Due</b></td><td align="right"><b>Rs. ${Number(balance).toLocaleString('en-IN')}</b></td></tr>
      ${deliveryDate ? `<tr><td>Delivery Date</td><td align="right">${new Date(deliveryDate).toLocaleDateString('en-IN')}</td></tr>` : ''}
    </table>
    ${invoiceLink ? `<p><a href="${invoiceLink}">View / download your invoice online</a></p>` : ''}
    <p style="color:#777;font-size:12px">Thank you for choosing ${shopName}.</p>
  </div>`;
}

module.exports = { sendInvoiceEmail, buildInvoiceHtml, isConfigured: () => Boolean(getTransporter()) };