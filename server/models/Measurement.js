const mongoose = require('mongoose');

const GARMENTS = [
  'shirt', 'pant', 'trouser', 'kurta', 'pajama', 'suit',
  'blazer', 'waistcoat', 'sherwani', 'jacket', 'custom',
];

/* Measurements are NEVER stored on the customer and NEVER overwritten in place.
   Each edit creates a new version; the latest active one per (customer, garment) is
   the current record. Old versions stay for history / "use previous measurement". */
const measurementSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    garmentType: { type: String, enum: GARMENTS, required: true, index: true },
    // flexible key/value bag so any garment's fields fit without schema changes
    values: { type: Map, of: String, default: {} },
    fittingType: { type: String, trim: true }, // Slim / Regular / Loose ...
    unit: { type: String, enum: ['in', 'cm'], default: 'in' },
    notes: { type: String, trim: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

measurementSchema.index({ customer: 1, garmentType: 1, isActive: 1 });

measurementSchema.statics.GARMENTS = GARMENTS;

module.exports = mongoose.model('Measurement', measurementSchema);
