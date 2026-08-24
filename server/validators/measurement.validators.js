const { z } = require('zod');
const { objectId, idParam } = require('./common');

const GARMENTS = ['shirt','pant','trouser','kurta','pajama','suit','blazer','waistcoat','sherwani','jacket','custom'];

module.exports = {
  create: {
    body: z.object({
      customer: objectId,
      garmentType: z.enum(GARMENTS),
      values: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
      fittingType: z.string().trim().optional(),
      unit: z.enum(['in', 'cm']).optional(),
      notes: z.string().trim().optional(),
    }),
  },
  // "edit" creates a NEW version rather than mutating — same shape, id in params of source
  update: {
    params: idParam,
    body: z.object({
      values: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      fittingType: z.string().trim().optional(),
      unit: z.enum(['in', 'cm']).optional(),
      notes: z.string().trim().optional(),
    }),
  },
  idParam,
  GARMENTS,
};
