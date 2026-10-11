import nodemailer from "nodemailer";

export const sendNewDeviceLoginAlert = async ({
  email,
  userName,
  deviceName,
  browser,
  os,
  ip,
  location,
  loginDate,
}) => {
  try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = process.env.SMTP_PORT || 587;

    const formattedDate = new Date(loginDate || Date.now()).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const subject = "Security Alert: New Login to Your Account";
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937; max-width: 600px; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff;">
        <div style="border-bottom: 2px solid #f97316; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #ea580c; margin: 0; font-size: 20px;">Security Alert: New Login Detected</h2>
        </div>
        
        <p style="font-size: 15px;">Hi <strong>${userName || "User"}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #374151;">
          A new login to your account was detected from a device that has not been recognized before. If this was you, no action is required.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; font-size: 13px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">Device / Browser:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${deviceName || `${os} — ${browser}`}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Operating System:</td>
              <td style="padding: 6px 0; color: #0f172a;">${os || "Unknown OS"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">IP Address:</td>
              <td style="padding: 6px 0; color: #0f172a; font-family: monospace;">${ip || "127.0.0.1"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Location:</td>
              <td style="padding: 6px 0; color: #0f172a;">${location || "Local Network"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Timestamp:</td>
              <td style="padding: 6px 0; color: #0f172a;">${formattedDate}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #b91c1c; font-weight: bold;">
          If you do not recognize this activity, please review your active sessions and revoke any suspicious sessions immediately.
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="http://localhost:3000/users/security" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 14px;">
            Review Security & Active Sessions
          </a>
        </div>

        <p style="font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; padding-top: 12px; margin-top: 20px;">
          This is an automated security notification sent to protect your CodeQuest account.
        </p>
      </div>
    `;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });

      await transporter.sendMail({
        from: `"CodeQuest Security" <${smtpUser}>`,
        to: email,
        subject,
        html,
      });
      console.log(`✉️ New device login security alert sent to ${email}`);
    } else {
      console.log(`✉️ [MOCK SECURITY EMAIL] New device alert sent to ${email} for device: ${deviceName}`);
    }
  } catch (error) {
    console.error("Failed to send security email alert:", error);
  }
};
