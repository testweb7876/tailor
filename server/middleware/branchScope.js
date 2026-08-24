/* Attaches req.branchFilter based on the logged-in user.
   - SUPER_ADMIN or an ADMIN with no branch assigned → sees everything (empty filter)
   - ADMIN tied to a specific branch → only sees that branch's data */
module.exports = function branchScope(req, res, next) {
  req.branchFilter = req.user?.branch ? { branch: req.user.branch } : {};
  next();
};