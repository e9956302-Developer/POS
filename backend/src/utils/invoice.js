export function buildInvoiceNumber(prefix, id) {
  return `${prefix}-${String(id).padStart(6, "0")}`;
}

