import nodemailer from "nodemailer";

export const sendPaymentConfirmationEmail = async ({
  userEmail,
  userName,
  planName,
  amountPaid,
  invoiceNumber,
  renewalDate,
  invoicePdfDataUrl,
}) => {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const emailSubject = `Payment Confirmation & Invoice ${invoiceNumber} - CodeQuest`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #f48024; margin-bottom: 5px;">CodeQuest Premium Membership</h2>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Thank you for subscribing! Your payment has been successfully processed and your membership is now active.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; font-weight: bold;">Plan:</td>
            <td style="padding: 10px;">${planName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Amount Paid:</td>
            <td style="padding: 10px;">₹${amountPaid} (incl. GST)</td>
          </tr>
          <tr style="background-color: #f8f9fa;">
            <td style="padding: 10px; font-weight: bold;">Invoice Number:</td>
            <td style="padding: 10px;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding: 10px; font-weight: bold;">Next Renewal Date:</td>
            <td style="padding: 10px;">${new Date(renewalDate).toLocaleDateString("en-IN")}</td>
          </tr>
        </table>

        <p>You can access your full invoice anytime from your <strong>Membership & Billing</strong> dashboard on CodeQuest.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666;">If you have any questions or require support, please contact us at support@codequest.com.</p>
      </div>
    `;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const mailOptions = {
        from: `"CodeQuest Premium" <${smtpUser}>`,
        to: userEmail,
        subject: emailSubject,
        html: emailHtml,
      };

      await transporter.sendMail(mailOptions);
      console.log(`✉️ Email confirmation sent successfully to ${userEmail}`);
    } else {
      console.log(`✉️ [MOCK EMAIL SERVICE] Confirmation email generated for ${userEmail}:`);
      console.log(`Subject: ${emailSubject}`);
      console.log(`Invoice: ${invoiceNumber} | Plan: ${planName} | Amount: ₹${amountPaid}`);
    }
  } catch (error) {
    console.error("❌ Failed to send email confirmation:", error.message);
  }
};
