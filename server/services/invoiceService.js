import Invoice from "../models/invoice.js";

export const generateInvoiceNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomDigits}`;
};

export const createInvoiceRecord = async ({
  userid,
  userName,
  userEmail,
  paymentId,
  razorpayPaymentId,
  planId,
  planName,
  amount,
}) => {
  const gstRate = 0.18; // 18% GST
  const baseAmount = Math.round((amount / (1 + gstRate)) * 100) / 100;
  const gstAmount = Math.round((amount - baseAmount) * 100) / 100;
  const invoiceNumber = await generateInvoiceNumber();

  const newInvoice = new Invoice({
    invoiceNumber,
    userid,
    userName,
    userEmail,
    paymentId,
    razorpayPaymentId,
    planId,
    planName,
    amount: baseAmount,
    gst: gstAmount,
    total: amount,
    status: "paid",
  });

  await newInvoice.save();
  return newInvoice;
};
