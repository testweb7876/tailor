const { z } = require('zod');
const { password } = require('./common');

const login = {
  body: z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password required'),
  }),
};

const changePassword = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password required'),
      newPassword: password,
    })
    .refine((d) => d.currentPassword !== d.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
};

module.exports = { login, changePassword };
