const mongoose = require('mongoose');
const Counter = require('./Counter');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },

    invoiceDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date },

    shopSnapshot: { type: mongoose.Schema.Types.Mixed },     
    customerSnapshot: { type: mongoose.Schema.Types.Mixed },
    itemsSnapshot: { type: [mongoose.Schema.Types.Mixed], default: [] },
    totals: { type: mongoose.Schema.Types.Mixed },           

    pdfUrl: { type: String },      
    emailSent: { type: Boolean, default: false },
    emailSentAt: { type: Date },
    whatsappSent: { type: Boolean, default: false },
    whatsappSentAt: { type: Date },
    manualBillNo: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

invoiceSchema.pre('validate', async function assignNumber(next) {
  if (this.invoiceNumber) return next();
  const year = new Date().getFullYear();
  const seq = await Counter.next(`invoice:${year}`);
  this.invoiceNumber = `INV-${year}-${String(seq).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
