/**
 * Email utility - sends emails via Resend
 * Requires RESEND_API_KEY environment variable
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResponse> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "no-reply@instahealth.ae";

  if (!apiKey) {
    console.error("RESEND_API_KEY not configured");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return {
        success: false,
        error: `Email send failed: ${response.statusText}`,
      };
    }

    const data: any = await response.json();
    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send vendor application received email
 */
export async function sendVendorApplicationEmail(
  vendorEmail: string,
  businessName: string,
  applicationId: string
): Promise<EmailResponse> {
  const supportEmail = process.env.VENDOR_APPLY_TO || "cruz@jccl.com.au";

  const html = `
    <h2>Vendor Application Received</h2>
    <p>Thank you for applying to become a vendor on InstaHealth!</p>
    <p><strong>Application ID:</strong> ${applicationId}</p>
    <p><strong>Business Name:</strong> ${escapeHtml(businessName)}</p>
    <p>We've received your application and our team will review it within 24-48 hours. You'll receive an email with next steps if approved.</p>
    <p>If you have any questions, please contact us at ${escapeHtml(supportEmail)}</p>
    <hr />
    <p style="font-size: 12px; color: #666;">InstaHealth - Health & Wellness Marketplace</p>
  `;

  return sendEmail({
    to: vendorEmail,
    subject: `Vendor Application Received - ${businessName}`,
    html,
  });
}

/**
 * Send admin notification of new vendor application
 */
export async function sendAdminApplicationNotification(
  applicantName: string,
  businessName: string,
  businessCategory: string,
  contactEmail: string,
  contactPhone: string,
  applicationId: string,
  dashboardUrl: string
): Promise<EmailResponse> {
  const adminEmail = process.env.VENDOR_APPLY_TO || "cruz@jccl.com.au";

  const html = `
    <h2>New Vendor Application</h2>
    <p>A new vendor application has been submitted:</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; font-weight: bold; width: 30%;">Business Name</td>
        <td style="padding: 8px;">${escapeHtml(businessName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; font-weight: bold;">Contact Person</td>
        <td style="padding: 8px;">${escapeHtml(applicantName)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; font-weight: bold;">Category</td>
        <td style="padding: 8px;">${escapeHtml(businessCategory)}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; font-weight: bold;">Email</td>
        <td style="padding: 8px;"><a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a></td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 8px; font-weight: bold;">Phone</td>
        <td style="padding: 8px;">${escapeHtml(contactPhone)}</td>
      </tr>
      <tr>
        <td style="padding: 8px; font-weight: bold;">Application ID</td>
        <td style="padding: 8px;"><code>${escapeHtml(applicationId)}</code></td>
      </tr>
    </table>
    <p><a href="${escapeHtml(dashboardUrl)}" style="background: #41a59b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Review Application</a></p>
    <hr />
    <p style="font-size: 12px; color: #666;">InstaHealth Admin</p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `New Vendor Application - ${escapeHtml(businessName)}`,
    html,
  });
}

/**
 * Send vendor invite link email
 */
export async function sendVendorInviteEmail(
  vendorEmail: string,
  businessName: string,
  inviteLink: string
): Promise<EmailResponse> {
  const html = `
    <h2>Welcome to InstaHealth Vendors!</h2>
    <p>Your vendor application has been approved!</p>
    <p>Click the link below to set your password and start selling on InstaHealth:</p>
    <p style="margin: 20px 0;">
      <a href="${escapeHtml(inviteLink)}" style="background: #41a59b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Set Your Password & Activate Account
      </a>
    </p>
    <p><strong>This link expires in 48 hours.</strong></p>
    <p>If you didn't apply to become a vendor or this link doesn't work, please contact support at ${escapeHtml(process.env.VENDOR_APPLY_TO || "cruz@jccl.com.au")}</p>
    <hr />
    <p style="font-size: 12px; color: #666;">InstaHealth - Health & Wellness Marketplace</p>
  `;

  return sendEmail({
    to: vendorEmail,
    subject: `Welcome to InstaHealth - Activate Your Vendor Account`,
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  resetLink: string
): Promise<EmailResponse> {
  const html = `
    <h2>Reset your InstaHealth password</h2>
    <p>We received a request to reset your password.</p>
    <p>Click the link below to set a new password:</p>
    <p style="margin: 20px 0;">
      <a href="${escapeHtml(resetLink)}" style="background: #41a59b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Reset Password
      </a>
    </p>
    <p><strong>This link expires in 1 hour.</strong></p>
    <p>If you didn't request a password reset, you can ignore this email.</p>
    <hr />
    <p style="font-size: 12px; color: #666;">InstaHealth - Health & Wellness Marketplace</p>
  `;

  return sendEmail({
    to: userEmail,
    subject: "Reset your InstaHealth password",
    html,
  });
}

/**
 * Utility to escape HTML
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
