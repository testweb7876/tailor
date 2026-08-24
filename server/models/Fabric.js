const mongoose = require('mongoose');
const { round2 } = require('../utils/money');

/* Standalone fabric records power the customer "Fabric History" tab. A fabric may be
   linked to a customer and (optionally) an order + specific order item. */
const fabricSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    code: { type: String, trim: true, index: true },
    color: { type: String, trim: true },
    pattern: { type: String, trim: true },
    material: { type: String, trim: true },
    meters: { type: Number, default: 0, min: 0 },
    rate: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ['shop', 'customer'], default: 'shop' },
    imageUrl: { type: String },
    imagePublicId: { type: String }, // for Cloudinary deletion

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
    orderItemId: { type: mongoose.Schema.Types.ObjectId },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fabricSchema.pre('save', function computeTotal(next) {
  this.total = round2((this.meters || 0) * (this.rate || 0));
  next();
});

module.exports = mongoose.model('Fabric', fabricSchema);
