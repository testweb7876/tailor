/* Demo business data for evaluation/screens. Separate from the production `seed` so a
   real deployment never gets fake customers. Idempotent: skips if customers already exist
   (run with FORCE_DEMO=true to wipe demo collections and reseed).
   Run: npm run seed:demo */
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const logger = require('../utils/logger');
const Customer = require('../models/Customer');
const Measurement = require('../models/Measurement');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Fabric = require('../models/Fabric');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Settings = require('../models/Settings');
const finance = require('../services/financeService');
const invoiceService = require('../services/invoiceService');

const FIRST = ['Rahul','Amit','Vikram','Suresh','Manoj','Deepak','Rohit','Sanjay','Karan','Arjun','Neha','Pooja','Anita','Priya','Kavita','Ravi','Ajay','Naveen','Gaurav','Sunil'];
const LAST = ['Sharma','Verma','Gupta','Singh','Kumar','Mehta','Jain','Bansal','Chopra','Malhotra'];
const CITIES = ['Baddi','Ludhiana','Chandigarh','Solan','Nalagarh','Panchkula'];
const GARMENTS = ['shirt','pant','blazer','kurta','suit'];
// every demo fabric carries a `code` so it satisfies the "photo OR code required" rule
const FABRICS = [
  { name: 'Raymond Cotton', brand: 'Raymond', code: 'RC101', color: 'Navy Blue', material: 'Cotton', rate: 600 },
  { name: 'Siyaram Suiting', brand: 'Siyaram', code: 'SS220', color: 'Charcoal', material: 'Poly-wool', rate: 750 },
  { name: 'Vimal Linen', brand: 'Vimal', code: 'VL330', color: 'Beige', material: 'Linen', rate: 900 },
  { name: 'Grasim Terry', brand: 'Grasim', code: 'GT440', color: 'Black', material: 'Terry-rayon', rate: 550 },
];
const STATUSES = ['new','confirmed','cutting','stitching','trial','ready','delivered'];
const rand = (a) => a[Math.floor(Math.random() * a.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const shirtValues = () => ({ length: '30', chest: String(randInt(38, 44)), waist: String(randInt(34, 40)), shoulder: String(randInt(17, 19)), sleeve: '25', collar: String(randInt(15, 17)) });
const pantValues = () => ({ waist: String(randInt(30, 38)), hip: String(randInt(38, 44)), thigh: '24', knee: '18', bottom: '14', length: '40', rise: '11' });

(async () => {
  await connectDB();
  try {
    const superAdmin = await User.findOne({ role: 'SUPER_ADMIN' });
    if (!superAdmin) { logger.error('Run `npm run seed` first to create the Super Admin.'); process.exit(1); }
    await Settings.getSingleton();

    const existing = await Customer.countDocuments();
    if (existing > 0 && process.env.FORCE_DEMO !== 'true') {
      logger.info(`Demo skipped — ${existing} customers already exist. Set FORCE_DEMO=true to reseed.`);
      await mongoose.connection.close(); process.exit(0);
    }
    if (process.env.FORCE_DEMO === 'true') {
      logger.warn('FORCE_DEMO — clearing demo collections');
      await Promise.all([Customer.deleteMany({}), Measurement.deleteMany({}), Order.deleteMany({}), Payment.deleteMany({}), Fabric.deleteMany({}), Invoice.deleteMany({})]);
    }

    const uid = superAdmin._id;
    let orderCount = 0;
    let billSeq = 400; // demo bill-book numbers starting at 401, matching the physical book style

    for (let i = 0; i < 20; i++) {
      const fullName = `${rand(FIRST)} ${rand(LAST)}`;
      const mobile = `9${randInt(100000000, 999999999)}`;
      const customer = await Customer.create({
        fullName, mobile, email: `${fullName.split(' ')[0].toLowerCase()}${i}@example.com`,
        city: rand(CITIES), state: 'Himachal Pradesh', address: `House ${randInt(1, 200)}, ${rand(CITIES)}`,
        createdBy: uid,
      });

      // measurements
      await Measurement.create({ customer: customer._id, garmentType: 'shirt', values: shirtValues(), fittingType: rand(['Slim','Regular']), createdBy: uid });
      await Measurement.create({ customer: customer._id, garmentType: 'pant', values: pantValues(), fittingType: 'Regular', createdBy: uid });

      // 1-2 orders each -> ~30 orders total
      const numOrders = randInt(1, 2);
      for (let j = 0; j < numOrders; j++) {
        const numItems = randInt(1, 3);
        const items = [];
        for (let k = 0; k < numItems; k++) {
          const fab = rand(FABRICS);
          const meters = randInt(1, 4) + 0.5;
          items.push({
            garmentType: rand(GARMENTS), quantity: randInt(1, 2), stitchingPrice: randInt(800, 2500),
            fabric: { name: fab.name, brand: fab.brand, code: fab.code, color: fab.color, material: fab.material, meters, rate: fab.rate, source: rand(['shop','customer']) },
            notes: rand(['Slim fit','', 'Extra pocket','']),
          });
        }
        const daysAgo = randInt(0, 120);
        const orderDate = new Date(Date.now() - daysAgo * 864e5);
        const deliveryDate = new Date(orderDate.getTime() + randInt(5, 20) * 864e5);
        const status = rand(STATUSES);
        billSeq += 1;
        const order = await Order.create({
          customer: customer._id, orderDate, deliveryDate,
          manualBillNo: String(billSeq), // matches the shop's physical bill-book numbering
          priority: rand(['normal','normal','urgent','express']), status,
          items, taxEnabled: Math.random() > 0.5, taxPercent: 5, discount: rand([0, 0, 100, 200, 500]),
          deliveryReminderSent: false,
          createdBy: uid,
        });
        orderCount++;

        // fabric history records
        for (const it of order.items) {
          await Fabric.create({ name: it.fabric.name, brand: it.fabric.brand, code: it.fabric.code, color: it.fabric.color, material: it.fabric.material, meters: it.fabric.meters, rate: it.fabric.rate, source: it.fabric.source, customer: customer._id, order: order._id, orderItemId: it._id, createdBy: uid });
        }

        // payments: unpaid / partial / paid mix (manual methods only — cash/upi/card/bank_transfer)
        const roll = Math.random();
        if (roll > 0.35) {
          const isFull = roll > 0.7;
          const amount = isFull ? order.grandTotal : Math.round(order.grandTotal * rand([0.3, 0.5, 0.6]));
          if (amount > 0) {
            const method = rand(['cash','upi','card','bank_transfer']);
            await Payment.create({
              order: order._id, customer: customer._id, amount, method,
              transactionId: ['upi', 'card', 'bank_transfer'].includes(method) ? `DEMO${randInt(100000, 999999)}` : undefined,
              status: 'paid', isAdvance: !isFull, receivedBy: uid, paymentDate: orderDate,
            });
            await finance.recomputeOrderPayments(order._id);
          }
        }

        // invoice for ~60% of orders
        if (Math.random() > 0.4) await invoiceService.generateForOrder(order._id, uid);
      }
      await finance.recomputeCustomerRollups(customer._id);
    }

    const totals = { customers: await Customer.countDocuments(), orders: orderCount, payments: await Payment.countDocuments(), invoices: await Invoice.countDocuments(), fabrics: await Fabric.countDocuments() };
    logger.info(`Demo data seeded: ${JSON.stringify(totals)}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Demo seed failed: ${err.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }
})();