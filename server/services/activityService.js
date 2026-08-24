const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/* Fire-and-forget audit trail. Never throws into the request path — a failed log
   must not break the actual operation. Call with the acting user + req for IP. */
async function log({ req, user, action, description, resource, resourceId, meta }) {
  try {
    const actor = user || req?.user;
    await ActivityLog.create({
      user: actor?._id,
      userName: actor?.name,
      action,
      description,
      resource,
      resourceId,
      meta,
      ip: req?.ip,
    });
  } catch (err) {
    logger.error(`activity log failed (${action}): ${err.message}`);
  }
}

module.exports = { log };
