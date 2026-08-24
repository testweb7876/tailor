/* Reusable pagination for Mongoose queries.
   paginate(Model, filter, { page, limit, sort, select, populate }) -> { data, meta } */
async function paginate(Model, filter = {}, opts = {}) {
  const page = Math.max(parseInt(opts.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  let q = Model.find(filter).sort(opts.sort || '-createdAt').skip(skip).limit(limit);
  if (opts.select) q = q.select(opts.select);
  if (opts.populate) q = q.populate(opts.populate);

  const [data, total] = await Promise.all([q.lean().exec(), Model.countDocuments(filter)]);

  return {
    data,
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

module.exports = paginate;
