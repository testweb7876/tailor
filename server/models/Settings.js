const mongoose = require('mongoose');

/* Singleton settings document. Secret gateway keys live ONLY in env vars, never here —
   this stores flags and public-safe config the frontend is allowed to read. */
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'app', unique: true }, // enforce single doc
    shop: {
      name: { type: String, default: 'My Tailor Shop' },
      logoUrl: { type: String, default: '' },
      address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      website: { type: String, default: '' },
      gstNumber: { type: String, default: '' },
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      tagline: { type: String, default: '' },
      proprietorName: { type: String, default: '' },
      establishedYear: { type: Number, default: null },
      whatsappNumber: { type: String, default: '' },
    },
    invoice: {
      prefix: { type: String, default: 'INV' },
      taxEnabled: { type: Boolean, default: false },
      gstPercent: { type: Number, default: 0 },
      terms: { type: String, default: '' },
      footer: { type: String, default: 'Thank you for your business!' },
      signature: { type: String, default: '' },
    },
    order: {
      prefix: { type: String, default: 'ORD' },
      defaultDeliveryDays: { type: Number, default: 7 },
    },
    payment: {
      razorpayEnabled: { type: Boolean, default: false },
      stripeEnabled: { type: Boolean, default: false },
      manualEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

/* Always work with the one settings doc. */
settingsSchema.statics.getSingleton = async function getSingleton() {
  let doc = await this.findOne({ key: 'app' });
  if (!doc) doc = await this.create({ key: 'app' });
  return doc;
};

/* Public-safe subset for the frontend (no secrets ever stored here anyway). */
settingsSchema.methods.toPublic = function toPublic() {
  return {
    shop: this.shop,
    invoice: {
      prefix: this.invoice.prefix,
      taxEnabled: this.invoice.taxEnabled,
      gstPercent: this.invoice.gstPercent,
      terms: this.invoice.terms,
      footer: this.invoice.footer,
    },
    order: this.order,
    payment: this.payment, // booleans only
  };
};

module.exports = mongoose.model('Settings', settingsSchema);
