const mongoose = require('mongoose');
const Counter = require('./Counter');
const { round2 } = require('../utils/money');

const ORDER_STATUS = [
  'new', 'confirmed', 'cutting', 'stitching', 'trial',
  'alteration', 'ready', 'delivered', 'cancelled',
];
const PRIORITY = ['normal', 'urgent', 'express'];
const PAYMENT_STATUS = ['unpaid', 'partial', 'paid', 'refunded'];

const fabricSchema = new mongoose.Schema(
  {
    name: String,
    brand: String,
    code: String,
    color: String,
    pattern: String,
    material: String,
    meters: { type: Number, default: 0, min: 0 },
    rate: { type: Number, default: 0, min: 0 },   // per meter
    total: { type: Number, default: 0, min: 0 },  // recomputed = meters * rate
    source: { type: String, enum: ['shop', 'customer'], default: 'shop' },
    imageUrl: String,
    fabricRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Fabric' }, // added in fabric phase
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    garmentType: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    stitchingPrice: { type: Number, default: 0, min: 0 }, // per unit
    fabric: { type: fabricSchema, default: () => ({}) },
    measurement: { type: mongoose.Schema.Types.ObjectId, ref: 'Measurement' },
    notes: String,
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true }, // ORD-2026-0012
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    manualBillNo: { type: String, trim: true, index: true, sparse: true },

    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, index: true },
    trialDate: { type: Date },

    priority: { type: String, enum: PRIORITY, default: 'normal', index: true },
    status: { type: String, enum: ORDER_STATUS, default: 'new', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'unpaid', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', index: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },

    items: { type: [orderItemSchema], default: [] },

    // financials — all recomputed on the backend, never trusted from client
    taxEnabled: { type: Boolean, default: false },
    taxPercent: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryReminderSent: { type: Boolean, default: false },

    fabricTotal: { type: Number, default: 0 },
    stitchingTotal: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },

    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

/* Recompute every derived money field from items + discount + tax + paidAmount.
   Grand Total = (Subtotal - Discount) + Tax ; Pending = Grand Total - Paid. */
orderSchema.methods.recalculateTotals = function recalculateTotals() {
  let fabricTotal = 0;
  let stitchingTotal = 0;

  for (const item of this.items) {
    const qty = item.quantity || 1;

    // fabric total is authoritative = meters * rate (never trust item.fabric.total)
    const f = item.fabric || {};
    const fabricLine = round2((f.meters || 0) * (f.rate || 0));
    if (item.fabric) item.fabric.total = fabricLine;

    stitchingTotal += (item.stitchingPrice || 0) * qty;
    fabricTotal += fabricLine;
  }

  this.fabricTotal = round2(fabricTotal);
  this.stitchingTotal = round2(stitchingTotal);
  this.subtotal = round2(this.fabricTotal + this.stitchingTotal);

  const discount = Math.min(this.discount || 0, this.subtotal);
  const taxable = round2(this.subtotal - discount);
  this.tax = this.taxEnabled ? round2((taxable * (this.taxPercent || 0)) / 100) : 0;
  this.grandTotal = round2(taxable + this.tax);

  this.paidAmount = round2(this.paidAmount || 0);
  this.pendingAmount = round2(Math.max(this.grandTotal - this.paidAmount, 0));

  if (this.paidAmount <= 0) this.paymentStatus = 'unpaid';
  else if (this.paidAmount < this.grandTotal) this.paymentStatus = 'partial';
  else this.paymentStatus = 'paid';

  return this;
};

orderSchema.pre('validate', async function assignNumber(next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const seq = await Counter.next(`order:${year}`);
    this.orderNumber = `ORD-${year}-${String(seq).padStart(4, '0')}`;
  }
  this.recalculateTotals();
  next();
});

orderSchema.statics.ORDER_STATUS = ORDER_STATUS;
orderSchema.statics.PRIORITY = PRIORITY;
orderSchema.statics.PAYMENT_STATUS = PAYMENT_STATUS;

module.exports = mongoose.model('Order', orderSchema);
