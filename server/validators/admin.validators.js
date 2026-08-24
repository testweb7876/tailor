const { z } = require('zod');
const { password, idParam, objectId } = require('./common');

const create = {
  body: z.object({
    name: z.string().trim().min(2, 'Name required'),
    email: z.string().email('Valid email required'),
    phone: z.string().trim().optional(),
    branch: objectId.optional().nullable(),
    password,
    status: z.enum(['active', 'disabled']).optional(),
    permissions: z.array(z.enum(['customers','orders','measurements','fabrics','payments','invoices','reports','settings','activity','dashboard','broadcast'])).optional(),
  }),
};

const update = {
  params: idParam,
  body: z.object({
    name: z.string().trim().min(2).optional(),
    phone: z.string().trim().optional(),
    branch: objectId.optional().nullable(),
    status: z.enum(['active', 'disabled']).optional(),
    permissions: z.array(z.enum(['customers','orders','measurements','fabrics','payments','invoices','reports','settings','activity','dashboard','broadcast'])).optional(),
  }),
};

const resetPassword = {
  params: idParam,
  body: z.object({ newPassword: password }),
};

const listQuery = {
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    search: z.string().trim().optional(),
  }),
};

module.exports = { create, update, resetPassword, listQuery, idParam };