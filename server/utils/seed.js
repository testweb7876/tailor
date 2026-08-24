/* Idempotent seed: ensures the Settings singleton and the first Super Admin exist.
   Run with: npm run seed
   Demo business data (customers/orders/payments/invoices) is seeded in a later phase. */
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const User = require('../models/User');
const Settings = require('../models/Settings');

(async () => {
  await connectDB();
  try {
    // 1) Settings singleton — seeded with shop branding matching the physical bill book
    const settings = await Settings.getSingleton();
    let shopChanged = false;
    if (!settings.shop?.tagline) {
      settings.shop.tagline = settings.shop.tagline || "Specialist in :- MEN'S WEAR, COAT PENT & SAFARI SUIT";
      shopChanged = true;
    }
    if (!settings.shop?.proprietorName) {
      settings.shop.proprietorName = settings.shop.proprietorName || '';
      shopChanged = true;
    }
    if (!settings.shop?.establishedYear) {
      settings.shop.establishedYear = settings.shop.establishedYear || '';
      shopChanged = true;
    }
    if (!settings.shop?.whatsappNumber) {
      settings.shop.whatsappNumber = settings.shop.whatsappNumber || '';
      shopChanged = true;
    }
    if (shopChanged) await settings.save();
    logger.info(`Settings ready (shop: ${settings.shop.name})`);

    // 2) First Super Admin — has implicit full access (permissions array not needed for SUPER_ADMIN)
    const email = env.seed.email.toLowerCase();
    let superAdmin = await User.findOne({ email });
    if (superAdmin) {
      logger.info(`Super Admin already exists: ${email}`);
    } else {
      superAdmin = await User.create({
        name: env.seed.name,
        email,
        password: env.seed.password, // hashed by pre-save hook
        role: 'SUPER_ADMIN',
        status: 'active',
        permissions: [], // irrelevant for SUPER_ADMIN — role check bypasses this
      });
      logger.info('---------------------------------------------');
      logger.info('Super Admin created:');
      logger.info(`  email:    ${email}`);
      logger.info(`  password: ${env.seed.password}`);
      logger.info('  >> change this password after first login <<');
      logger.info('---------------------------------------------');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }
})();