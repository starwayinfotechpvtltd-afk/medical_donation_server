const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

const paginate = (req, _res, next) => {
  const page  = Math.max(1, parseInt(req.query.page,  10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };
  next();
};

export default paginate;