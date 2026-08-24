const mongoose = require('mongoose');

/* A staff member (tailor, cutter, helper) who orders can be assigned to.
   Kept separate from User — staff don't log in, they're just a reference label. */
const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ['tailor', 'cutter', 'helper', 'other'], default: 'tailor' },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);