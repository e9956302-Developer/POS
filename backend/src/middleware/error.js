export function notFoundHandler(_req, res) {
  res.status(404).json({ message: "Route not found" });
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  const payload = {
    message: error.message || "Internal server error"
  };
  if (error.code) {
    payload.code = error.code;
  }
  if (error.branch !== undefined) {
    payload.branch = error.branch;
  }
  if (error.branchId !== undefined) {
    payload.branchId = error.branchId;
  }
  if (error.branchName !== undefined) {
    payload.branchName = error.branchName;
  }
  if (error.expiredOn !== undefined) {
    payload.expiredOn = error.expiredOn;
  }
  if (error.details !== undefined) {
    payload.details = error.details;
  }
  if (error.errors !== undefined) {
    payload.errors = error.errors;
  }
  if (error.header !== undefined) {
    payload.header = error.header;
  }
  res.status(status).json(payload);
}

