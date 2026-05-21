const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "dueDate",
  "title",
  "priority",
];

const parsePositiveInteger = (value) => {
  if (value === undefined) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const isValidObjectId = (id) => {
  if (!id) return false;
  return /^[0-9a-fA-F]{24}$/.test(String(id));
};

const isValidCompletedValue = (value) => {
  if (value === undefined) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["true", "false", "1", "0", "yes", "no"].includes(normalized);
};

const taskQueryMiddleware = (req, res, next) => {
  const page = parsePositiveInteger(req.query.page);
  if (req.query.page !== undefined && page === null) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_PAGE",
        message: "page phải là số nguyên dương",
      },
    });
  }

  const limit = parsePositiveInteger(req.query.limit);
  if (req.query.limit !== undefined && limit === null) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_LIMIT",
        message: "limit phải là số nguyên dương",
      },
    });
  }

  if (limit !== null && limit > 100) {
    return res.status(400).json({
      success: false,
      error: {
        code: "LIMIT_TOO_LARGE",
        message: "limit tối đa là 100",
      },
    });
  }

  if (!isValidCompletedValue(req.query.completed)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_COMPLETED",
        message: "completed chỉ nhận true/false",
      },
    });
  }

  if (req.query.order) {
    const order = String(req.query.order).toLowerCase();
    if (!["asc", "desc"].includes(order)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ORDER",
          message: "order chỉ nhận asc hoặc desc",
        },
      });
    }
  }

  if (req.query.sort && !ALLOWED_SORT_FIELDS.includes(req.query.sort)) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_SORT",
        message: "sort field không hợp lệ",
      },
    });
  }

  if (req.query.projectId !== undefined) {
    const projectId = String(req.query.projectId).trim();
    if (
      projectId !== "null" &&
      projectId !== "" &&
      !isValidObjectId(projectId)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PROJECT_ID",
          message: "projectId không hợp lệ",
        },
      });
    }
  }

  return next();
};

export default taskQueryMiddleware;
