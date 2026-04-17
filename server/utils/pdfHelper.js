export async function buildInvoicePdfBuffer(options) {
  // Simple PDF buffer for now
  return Buffer.from(JSON.stringify(options));
}