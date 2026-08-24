const mongoose = require('mongoose');
const Counter = require('./Counter');

const METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'other'];
const STATUS = ['created', 'paid', 'failed', 'refunded']; 

const paymentSchema = new mongoose.Schema(
  {
    paymentCode: { type: String, unique: true, index: true }, // PAY-2026-0001
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },

    amount: { type: Number, required: true, min: 0.01 },
    method: { type: String, enum: METHODS, required: true },
    status: { type: String, enum: STATUS, default: 'paid', index: true },
    isAdvance: { type: Boolean, default: false },

    transactionId: { type: String, trim: true },     // UPI ref / gateway payment id

    notes: { type: String, trim: true },
    paymentDate: { type: Date, default: Date.now, index: true },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.pre('validate', async function assignCode(next) {
  if (this.paymentCode) return next();
  const year = new Date().getFullYear();
  const seq = await Counter.next(`payment:${year}`);
  this.paymentCode = `PAY-${year}-${String(seq).padStart(4, '0')}`;
  next();
});

paymentSchema.statics.METHODS = METHODS;
paymentSchema.statics.STATUS = STATUS;

module.exports = mongoose.model('Payment', paymentSchema);
