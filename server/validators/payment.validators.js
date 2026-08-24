const { z } = require('zod');
const { objectId, idParam } = require('./common');

const METHODS = ['cash','upi','card','bank_transfer','other'];

module.exports = {
  receive: {
    params: idParam, // order id
    body: z.object({
      amount: z.coerce.number().positive('Amount must be greater than 0'),
      method: z.enum(METHODS),
      transactionId: z.string().trim().optional(),
      notes: z.string().trim().optional(),
      paymentDate: z.coerce.date().optional(),
    }),
  },
  refund: {
    params: idParam, // payment id
    body: z.object({
      amount: z.coerce.number().positive().optional(), // defaults to full
      notes: z.string().trim().optional(),
    }),
  },
  listQuery: {
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      method: z.enum(METHODS).optional(),
      customer: objectId.optional(),
      order: objectId.optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
    }),
  },
  idParam, METHODS,
};
