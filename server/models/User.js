const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN'],
      default: 'ADMIN',
      index: true,
    },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null }, // null = all branches (Super Admin)
    permissions: {
      type: [String],
      enum: ['customers', 'orders', 'measurements', 'fabrics', 'payments', 'invoices', 'reports', 'settings', 'activity', 'dashboard', 'broadcast'],
      default: [],
    },
    status: { type: String, enum: ['active', 'disabled'], default: 'active', select: false },
    // Bumped on password change / reset / disable → invalidates all outstanding refresh tokens.
    tokenVersion: { type: Number, default: 0 },
    lastLogin: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokenVersion;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
