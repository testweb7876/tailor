const mongoose = require('mongoose');
const Counter = require('./Counter');

const customerSchema = new mongoose.Schema(
  {
    customerCode: { type: String, unique: true, index: true }, 
    fullName: { type: String, required: true, trim: true, index: true },
    mobile: { type: String, required: true, unique: true, trim: true, index: true },
    altMobile: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },
    dob: { type: Date },
    notes: { type: String, trim: true },
    totalOrders: { type: Number, default: 0 },
    totalPurchase: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0, index: true },
    lastOrderDate: { type: Date },

    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

customerSchema.index({ fullName: 'text' });

customerSchema.pre('save', async function assignCode(next) {
  if (this.customerCode) return next();
  const seq = await Counter.next('customer');
  this.customerCode = `CUST-${String(seq).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
