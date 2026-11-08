/**
 * Formats phone numbers and generates click-to-chat WhatsApp URLs for billing reminders.
 */
export function formatPhoneNumberForWhatsApp(phone) {
  if (!phone) return null;
  // Remove spaces, hyphens, parentheses, plus
  let cleaned = phone.replace(/[^\d]/g, "");
  // If starts with 0 (e.g. 03001234567 in Pakistan), convert to international code (e.g. 923001234567)
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.slice(1);
  }
  return cleaned;
}

export function getWhatsAppReminderUrl({
  phone,
  customerName = "Valued Customer",
  invoiceNumber = "",
  balance = 0,
  dueDate = "",
  shopName = "DigitalMarkaz360"
}) {
  const cleanPhone = formatPhoneNumberForWhatsApp(phone);
  if (!cleanPhone) return null;

  const dueStr = dueDate ? ` on or before ${dueDate}` : "";
  const invStr = invoiceNumber ? ` regarding Invoice #${invoiceNumber}` : "";

  const message = `Hello ${customerName},\n\nThis is a friendly reminder from *${shopName}*${invStr}.\n\nYour outstanding balance is *Rs. ${Number(balance).toLocaleString()}*${dueStr}.\n\nPlease let us know if you have any questions or require assistance. Thank you for your business!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppReminder(params) {
  const url = getWhatsAppReminderUrl(params);
  if (!url) {
    alert("Customer phone number is missing or invalid for WhatsApp.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
