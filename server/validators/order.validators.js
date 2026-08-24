const { z } = require('zod');
const { objectId, idParam } = require('./common');

const STATUS = ['new','confirmed','cutting','stitching','trial','alteration','ready','delivered','cancelled'];
const PRIORITY = ['normal','urgent','express'];

const fabric = z.object({
  name: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  code: z.string().trim().optional(),
  color: z.string().trim().optional(),
  pattern: z.string().trim().optional(),
  material: z.string().trim().optional(),
  meters: z.coerce.number().min(0).default(0),
  rate: z.coerce.number().min(0).default(0),
  source: z.enum(['shop', 'customer']).default('shop'),
  imageUrl: z.string().trim().optional(),
  fabricRef: objectId.optional(),
}).refine((f) => Boolean(f.imageUrl?.trim()) || Boolean(f.code?.trim()), {
  message: 'Fabric photo or fabric code is required for each garment',
  path: ['code'],
});

const item = z.object({
  garmentType: z.string().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  stitchingPrice: z.coerce.number().min(0).default(0),
  fabric,
  measurement: objectId.optional(),
  notes: z.string().optional(),
});

module.exports = {
  create: {
    body: z.object({
      customer: objectId,
      orderDate: z.coerce.date().optional(),
      deliveryDate: z.coerce.date().optional(),
      trialDate: z.coerce.date().optional(),
      priority: z.enum(PRIORITY).optional(),
      status: z.enum(STATUS).optional(),
      items: z.array(item).min(1, 'At least one garment is required'),
      assignedTo: objectId.optional(),
      taxEnabled: z.coerce.boolean().optional(),
      taxPercent: z.coerce.number().min(0).max(100).optional(),
      discount: z.coerce.number().min(0).optional(),
      notes: z.string().optional(),
      manualBillNo: z.string().trim().optional(),
      // optional advance paid at order creation → becomes a real Payment
      advance: z.object({
        amount: z.coerce.number().positive(),
        method: z.enum(['cash','upi','card','bank_transfer','other']),
        transactionId: z.string().optional(),
        notes: z.string().optional(),
      }).optional(),
    }),
  },
  update: {
    params: idParam,
    body: z.object({
      deliveryDate: z.coerce.date().optional(),
      trialDate: z.coerce.date().optional(),
      priority: z.enum(PRIORITY).optional(),
      items: z.array(item).min(1).optional(),
      taxEnabled: z.coerce.boolean().optional(),
      taxPercent: z.coerce.number().min(0).max(100).optional(),
      assignedTo: objectId.optional(),
      discount: z.coerce.number().min(0).optional(),
      notes: z.string().optional(),
      manualBillNo: z.string().trim().optional(),
    }),
  },
  status: {
    params: idParam,
    body: z.object({ status: z.enum(STATUS) }),
  },
  listQuery: {
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      status: z.enum(STATUS).optional(),
      paymentStatus: z.enum(['unpaid','partial','paid','refunded']).optional(),
      priority: z.enum(PRIORITY).optional(),
      customer: objectId.optional(),
      search: z.string().optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }),
  },
  idParam, STATUS, PRIORITY,
};
