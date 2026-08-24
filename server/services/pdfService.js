const PDFDocument = require('pdfkit');
const garmentFields = require('../config/garmentFields');

/* Build a professional invoice PDF from an invoice snapshot. Returns a Buffer.
   Uses only core fonts so it works without external assets. */
function money(n, currency = 'INR') {
  const sym = currency === 'INR' ? 'Rs. ' : '';
  return `${sym}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const shop = invoice.shopSnapshot || {};
      const cust = invoice.customerSnapshot || {};
      const t = invoice.totals || {};
      const currency = shop.currency || 'INR';

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text(shop.name || 'Tailor Shop', 50, 50);
      doc.fontSize(9).font('Helvetica').fillColor('#555');
      if (shop.address) doc.text(shop.address, 50, 75, { width: 250 });
      if (shop.phone) doc.text(`Phone: ${shop.phone}`);
      if (shop.email) doc.text(`Email: ${shop.email}`);
      if (shop.gstNumber) doc.text(`GSTIN: ${shop.gstNumber}`);

      doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(9).font('Helvetica').fillColor('#555')
        .text(`Invoice #: ${invoice.invoiceNumber}`, 400, 78, { align: 'right' })
        .text(`Order #: ${invoice.orderNumber || '-'}`, { align: 'right' })
        .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, { align: 'right' });
        if (invoice.manualBillNo) doc.text(`Bill No: ${invoice.manualBillNo}`, { align: 'right' });
      if (invoice.deliveryDate) doc.text(`Delivery: ${new Date(invoice.deliveryDate).toLocaleDateString('en-IN')}`, { align: 'right' });

      // Bill to
      doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text('Bill To', 50, 150);
      doc.fontSize(10).font('Helvetica').fillColor('#333')
        .text(cust.fullName || '', 50, 168)
        .text(cust.mobile || '')
        .text(cust.email || '')
        .text(cust.address || '', { width: 250 });

      // Items table
      let y = 240;
      const cols = { garment: 50, qty: 210, fabric: 250, stitch: 380, total: 470 };
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
      doc.rect(50, y - 4, 500, 20).fill('#222');
      doc.fillColor('#fff')
        .text('Garment', cols.garment + 4, y)
        .text('Qty', cols.qty, y)
        .text('Fabric', cols.fabric, y)
        .text('Stitching', cols.stitch, y)
        .text('Total', cols.total, y, { width: 76, align: 'right' });
      y += 22;

      doc.font('Helvetica').fillColor('#000').fontSize(9);
      (invoice.itemsSnapshot || []).forEach((it) => {
        const line = (Number(it.stitchingPrice || 0) * Number(it.quantity || 1)) + Number(it.fabricTotal || 0);
        doc.text(it.garmentType || '-', cols.garment + 4, y, { width: 150 })
          .text(String(it.quantity || 1), cols.qty, y)
          .text(it.fabricName || '-', cols.fabric, y, { width: 120 })
          .text(money(it.stitchingPrice, currency), cols.stitch, y)
          .text(money(line, currency), cols.total, y, { width: 76, align: 'right' });
        y += 20;
        if (y > 700) { doc.addPage(); y = 60; }
      });

      // Summary
      y += 10;
      doc.moveTo(320, y).lineTo(550, y).strokeColor('#ccc').stroke();
      y += 8;
      const row = (label, val, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10)
          .text(label, 350, y).text(money(val, currency), 470, y, { width: 80, align: 'right' });
        y += bold ? 20 : 16;
      };
      row('Subtotal', t.subtotal);
      if (t.discount) row('Discount', -t.discount);
      if (t.tax) row(`Tax${t.taxPercent ? ` (${t.taxPercent}%)` : ''}`, t.tax);
      row('Grand Total', t.grandTotal, true);
      row('Paid', t.paid);
      row('Balance Due', t.balance, true);

      // Footer
      y += 20;
      if (invoice.shopSnapshot?.terms || invoice.terms) {
        doc.fontSize(8).font('Helvetica-Bold').text('Terms & Conditions', 50, y);
        doc.font('Helvetica').fillColor('#555').text(invoice.terms || '', 50, y + 12, { width: 300 });
      }
      doc.fontSize(9).fillColor('#000').font('Helvetica-Oblique')
        .text(invoice.footer || 'Thank you for your business!', 50, 760, { align: 'center', width: 500 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateInvoicePDF };

/* Generic tabular report -> PDF buffer (landscape A4). */
function generateReportPDF(title, rows) {
  const PDFDoc = require('pdfkit');
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDoc({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica').fillColor('#666').text(`Generated ${new Date().toLocaleString('en-IN')}`);
      doc.moveDown(0.5);

      if (!rows || rows.length === 0) { doc.fontSize(11).fillColor('#000').text('No data.'); doc.end(); return; }

      const cols = Object.keys(rows[0]);
      const pageW = doc.page.width - 60;
      const colW = pageW / cols.length;
      let y = doc.y + 4;

      const drawHeader = () => {
        doc.rect(30, y - 2, pageW, 18).fill('#222');
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
        cols.forEach((c, i) => doc.text(String(c), 34 + i * colW, y + 3, { width: colW - 6, ellipsis: true }));
        y += 20; doc.fillColor('#000').font('Helvetica');
      };
      drawHeader();

      rows.forEach((r) => {
        cols.forEach((c, i) => {
          const v = r[c];
          doc.fontSize(8).text(v == null ? '' : String(v), 34 + i * colW, y, { width: colW - 6, ellipsis: true });
        });
        y += 16;
        if (y > doc.page.height - 40) { doc.addPage({ layout: 'landscape' }); y = 40; drawHeader(); }
      });

      doc.end();
    } catch (err) { reject(err); }
  });
}

module.exports.generateReportPDF = generateReportPDF;

/* Downloads an image (Cloudinary URL, etc.) into a Buffer for embedding in the PDF.
   Returns null on any failure so the slip still generates without the image. */
async function fetchImageBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

/* Order-intake slip matching the physical bill-book format (Aone Tailors & Son's style).
   Now async: fetches the shop logo and each item's fabric photo before drawing so both
   appear on the slip instead of being silently skipped. */
async function generateOrderSlipPDF(order, settings, measurements = []) {
  const shop = settings.shop || {};

  // Fetch images up front — logo once, one fabric photo per order item.
  const logoBuffer = await fetchImageBuffer(shop.logoUrl);
  const fabricBuffers = await Promise.all(
    (order.items || []).map((it) => fetchImageBuffer(it.fabric?.imageUrl))
  );

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const cust = order.customer || {};
      const PAGE_W = 595 - 80;

      const getVals = (m) => {
        if (!m) return {};
        return Object.fromEntries(m.values instanceof Map ? m.values : Object.entries(m.values || {}));
      };
      const trouserM = measurements.find((m) => m.garmentType === 'pant' || m.garmentType === 'trouser');
      const shirtM = measurements.find((m) => m.garmentType === 'shirt' || m.garmentType === 'coat');
      const trouserVals = getVals(trouserM);
      const shirtVals = getVals(shirtM);

      // ---------- Header ----------
      // Shop logo, top-left, if we have one
      if (logoBuffer) {
        try { doc.image(logoBuffer, 40, 38, { width: 50, height: 50, fit: [50, 50] }); } catch {}
      }

      doc.fontSize(9).font('Helvetica').fillColor('#000')
        .text(`Whatsapp : ${shop.whatsappNumber || ''}`, 40, 40, { width: PAGE_W, align: 'right' });

      doc.fontSize(22).font('Helvetica-Bold').fillColor('#a11d1d')
        .text(shop.name || 'Tailors', 40, 42, { width: PAGE_W, align: 'center' });

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
        .text(shop.tagline || '', 40, 80, { width: PAGE_W, align: 'center' })
        .text(shop.address || '', { width: PAGE_W, align: 'center' });
      if (shop.proprietorName) doc.text(`Prop : ${shop.proprietorName}`, { width: PAGE_W, align: 'center' });

      if (shop.establishedYear) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#a11d1d')
          .text(`since-${shop.establishedYear}`, logoBuffer ? 40 : 40, logoBuffer ? 92 : 78, { width: 100, align: 'left' });
      }

      // ---------- Bill No. / Dated / Name / Mobile ----------
      let y = 145;
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000').text(order.manualBillNo || order.orderNumber, 40, y);

      y += 26;
      doc.fontSize(10).font('Helvetica')
        .text(`No. : ${order.manualBillNo || order.orderNumber}`, 40, y)
        .text(`Dated : ${new Date(order.orderDate).toLocaleDateString('en-IN')}`, 280, y)
        .text(`Del. Date : ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('en-IN') : ''}`, 420, y);

      y += 18;
      doc.text(`Name : ${cust.fullName || ''}`, 40, y, { width: 220 })
        .text(`Cus. Mob : ${cust.mobile || ''}`, 280, y);

      // ---------- Particulars (with fabric photo thumbnails) / Charges block ----------
      y += 26;
      const chargesX = 330;
      doc.font('Helvetica-Bold').text('Particulars', 40, y);
      doc.font('Helvetica').text(
        order.items.map((i) => i.garmentType).join(', ') || '-',
        40, y + 14, { width: 260 }
      );

      // Fabric photo thumbnails — one per item that has a photo, laid out in a row
      const thumbY = y + 32;
      const thumbSize = 46;
      let thumbX = 40;
      order.items.forEach((it, idx) => {
        const buf = fabricBuffers[idx];
        if (buf) {
          try {
            doc.rect(thumbX, thumbY, thumbSize, thumbSize).stroke('#ccc');
            doc.image(buf, thumbX, thumbY, { width: thumbSize, height: thumbSize, fit: [thumbSize, thumbSize] });
            doc.fontSize(6).font('Helvetica').fillColor('#555')
              .text(it.garmentType, thumbX, thumbY + thumbSize + 2, { width: thumbSize, align: 'center' });
          } catch {}
          thumbX += thumbSize + 8;
        } else if (it.fabric?.code) {
          // no photo, but has a code — show it as text instead of a blank thumbnail
          doc.fontSize(7).font('Helvetica').fillColor('#555')
            .text(`Code: ${it.fabric.code}`, thumbX, thumbY, { width: 90 });
          thumbX += 96;
        }
      });

      doc.font('Helvetica-Bold').fillColor('#000').text('Stitching Charges', chargesX, y);
      doc.font('Helvetica').text(String(order.stitchingTotal || 0), chargesX + 140, y, { width: 80, align: 'right' });

      doc.font('Helvetica-Bold').text('Advance', chargesX, y + 18);
      doc.font('Helvetica').text(String(order.paidAmount || 0), chargesX + 140, y + 18, { width: 80, align: 'right' });

      doc.font('Helvetica-Bold').text('Balance', chargesX, y + 36);
      doc.font('Helvetica').text(String(order.pendingAmount || 0), chargesX + 140, y + 36, { width: 80, align: 'right' });

      doc.font('Helvetica-Bold').text('Signature', chargesX, y + 54);
      doc.font('Helvetica').text('...........................', chargesX + 90, y + 54);

      // ---------- Disclaimer ----------
      y += 110; // extra space to clear the fabric thumbnail row
      doc.fontSize(8).font('Helvetica').fillColor('#555')
        .text('After 45 days we are not responsible for your clothes.', 40, y)
        .text('Electricity Failure can delay the delivery of clothes.', 40, y + 10);

      y += 24;
      doc.moveTo(40, y).lineTo(40 + PAGE_W, y).dash(2, { space: 2 }).strokeColor('#999').stroke();
      doc.undash();

      // ---------- Garment measurement block ----------
      const drawGarmentBlock = (title, garmentFieldSet, values, startY, billNo) => {
        let gy = startY + 14;
        const tableKeys = garmentFieldSet.tableKeys;
        const firstColW = 100;
        const restW = (PAGE_W - firstColW) / tableKeys.length;

        doc.rect(40, gy, firstColW, 34).stroke();
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#000')
          .text(`${title} No.`, 42, gy + 4, { width: firstColW - 4, align: 'center' });
        doc.fontSize(11).font('Helvetica-Bold').text(String(billNo || ''), 42, gy + 18, { width: firstColW - 4, align: 'center' });

        tableKeys.forEach((k, i) => {
          const x = 40 + firstColW + i * restW;
          doc.rect(x, gy, restW, 34).stroke();
          doc.fontSize(7).font('Helvetica-Bold').text(garmentFieldSet.tableLabels[k] || k, x + 2, gy + 4, { width: restW - 4, align: 'center' });
          doc.fontSize(9).font('Helvetica').text(values[k] || '', x + 2, gy + 18, { width: restW - 4, align: 'center' });
        });

        gy += 34;

        const leftKeys = garmentFieldSet.leftKeys;
        const rightKeys = garmentFieldSet.rightKeys;
        const rowH = 16;
        const maxRows = Math.max(leftKeys.length, rightKeys.length);
        const blockH = maxRows * rowH + 8;

        doc.rect(40, gy, PAGE_W, blockH).stroke();
        doc.moveTo(40 + PAGE_W / 2, gy).lineTo(40 + PAGE_W / 2, gy + blockH).stroke();

        doc.fontSize(9).font('Helvetica');
        leftKeys.forEach((k, i) => {
          const ly = gy + 6 + i * rowH;
          doc.font('Helvetica-Bold').text(`${garmentFieldSet.labels[k] || k}`, 46, ly);
          doc.font('Helvetica').text(values[k] || '', 46, ly, { width: PAGE_W / 2 - 12, align: 'right' });
        });
        rightKeys.forEach((k, i) => {
          const ry = gy + 6 + i * rowH;
          const rx = 40 + PAGE_W / 2 + 6;
          doc.font('Helvetica-Bold').text(`${garmentFieldSet.labels[k] || k}`, rx, ry);
          doc.font('Helvetica').text(values[k] || '', rx, ry, { width: PAGE_W / 2 - 12, align: 'right' });
        });

        return gy + blockH + 16;
      };

      const garmentFields = require('../config/garmentFields');
      y = drawGarmentBlock('TROUSERS', garmentFields.trouser, trouserVals, y, order.manualBillNo || order.orderNumber);

      doc.moveTo(40, y - 10).lineTo(40 + PAGE_W, y - 10).dash(2, { space: 2 }).strokeColor('#999').stroke();
      doc.undash();

      y = drawGarmentBlock('SHIRT/COAT', garmentFields.shirtCoat, shirtVals, y, order.manualBillNo || order.orderNumber);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
module.exports.generateOrderSlipPDF = generateOrderSlipPDF;