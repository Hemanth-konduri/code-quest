import jsPDF from "jspdf";

export interface InvoiceData {
  invoiceNumber: string;
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  gst: number;
  total: number;
  issuedAt: string;
  razorpayPaymentId?: string;
  status: string;
}

export const downloadInvoicePdf = (invoice: InvoiceData) => {
  const doc = new jsPDF();

  // Header background
  doc.setFillColor(244, 128, 36); // Stack Overflow Orange #f48024
  doc.rect(0, 0, 210, 35, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CODEQUEST INVOICE", 15, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 145, 18);
  doc.text(`Date: ${new Date(invoice.issuedAt).toLocaleDateString("en-IN")}`, 145, 25);

  // Bill To section
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Billed To:", 15, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${invoice.userName}`, 15, 57);
  doc.text(`Email: ${invoice.userEmail}`, 15, 64);
  if (invoice.razorpayPaymentId) {
    doc.text(`Payment ID: ${invoice.razorpayPaymentId}`, 15, 71);
  }

  // Invoice Items Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 80, 180, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.text("Description", 20, 86);
  doc.text("Plan", 90, 86);
  doc.text("Amount (INR)", 150, 86);

  // Table Row
  doc.setFont("helvetica", "normal");
  doc.text(`CodeQuest Subscription (${invoice.planName} Plan)`, 20, 100);
  doc.text(invoice.planName, 90, 100);
  doc.text(`Rs. ${invoice.amount.toFixed(2)}`, 150, 100);

  doc.text(`GST (18%):`, 90, 112);
  doc.text(`Rs. ${invoice.gst.toFixed(2)}`, 150, 112);

  // Line Divider
  doc.setLineWidth(0.5);
  doc.setDrawColor(200, 200, 200);
  doc.line(15, 120, 195, 120);

  // Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Paid:", 90, 130);
  doc.text(`Rs. ${invoice.total.toFixed(2)}`, 150, 130);

  // Footer
  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  doc.text("Thank you for subscribing to CodeQuest Premium!", 15, 155);
  doc.text("For any support queries, contact us at support@codequest.com", 15, 162);

  // Save File
  doc.save(`${invoice.invoiceNumber}.pdf`);
};
