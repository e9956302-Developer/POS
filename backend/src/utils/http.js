export function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

export function notFound(message = "Resource not found") {
  const error = new Error(message);
  error.status = 404;
  return error;
}

export function validationFailed(header, errors) {
  const fullText = [header, ...errors.map((e) => `- ${e.formattedMessage}`)].join("\n");
  const error = new Error(fullText);
  error.status = 422;
  error.header = header;
  error.errors = errors;
  return error;
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length === 0 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

