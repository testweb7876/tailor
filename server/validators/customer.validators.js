const { z } = require('zod');
const { idParam } = require('./common');

const phone = z.string().trim().regex(/^[0-9+\-\s]{7,15}$/, 'Invalid mobile number');

const base = {
  fullName: z.string().trim().min(2, 'Name required'),
  mobile: phone,
  altMobile: z.union([phone, z.literal('')]).optional(),
  email: z.union([z.string().email(), z.literal('')]).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  pincode: z.string().trim().optional(),
  dob: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
};

module.exports = {
  create: { body: z.object(base) },
  update: { params: idParam, body: z.object(base).partial() },
  listQuery: {
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      search: z.string().trim().optional(),
      city: z.string().trim().optional(),
      archived: z.enum(['true', 'false']).optional(),
      sort: z.string().optional(),
    }),
  },
  idParam,
};
