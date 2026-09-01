import nodemailer from 'nodemailer';

interface SendActivationEmailParams {
  to: string;
  name: string;
  token: string;
  orderId?: string;
}

interface SendOrderConfirmationEmailParams {
  to: string;
  name: string;
  order: any;
}

export class EmailService {
  private static getTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  /**
   * Send Account Activation & Set Password Email
   * Safe asynchronous execution: Never throws to prevent breaking order placement.
   */
  static async sendAccountActivationEmail({ to, name, token, orderId }: SendActivationEmailParams): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const activationLink = `${frontendUrl}/set-password?token=${encodeURIComponent(token)}`;
    const storeName = process.env.STORE_NAME || 'ONWEAR';
    const fromEmail = process.env.SMTP_FROM || `"${storeName}" <no-reply@onwear.com>`;

    const isProduction = process.env.NODE_ENV === 'production';

    // Development Console Preview for easy manual testing
    if (!isProduction) {
      console.log('\n' + '='.repeat(70));
      console.log(`📧 [DEV EMAIL DISPATCH] Account Activation`);
      console.log(`To: ${to} (${name})`);
      if (orderId) console.log(`Order ID: ${orderId}`);
      console.log(`🔗 Set Password Link: ${activationLink}`);
      console.log(`⏳ Expires: 24 hours`);
      console.log('='.repeat(70) + '\n');
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ${storeName} Account is Ready</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e4e4e7; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { background: #09090b; padding: 32px 24px; text-align: center; }
    .logo { color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin: 0; }
    .tagline { color: #14b8a6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .content { padding: 36px 32px; color: #18181b; }
    h1 { font-size: 20px; font-weight: 800; margin: 0 0 16px; color: #09090b; }
    p { font-size: 14px; line-height: 1.6; color: #52525b; margin: 0 0 16px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #09090b; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
    .footer { background: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
    .notice { font-size: 12px; color: #a1a1aa; border-left: 3px solid #14b8a6; padding-left: 12px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="logo">${storeName}</h1>
      <div class="tagline">Official Store</div>
    </div>
    <div class="content">
      <h1>Hello ${name || 'Valued Customer'},</h1>
      <p>Thank you for placing your order with us! We have automatically created an account for you so you can easily track your order, view receipts, and manage future purchases without typing your details every time.</p>
      
      ${orderId ? `<p><strong>Order ID:</strong> <span style="font-family: monospace; color: #09090b;">${orderId}</span></p>` : ''}
      
      <p>To access your customer dashboard and view all past orders, please set your password by clicking the button below:</p>
      
      <div class="btn-container">
        <a href="${activationLink}" class="btn" target="_blank">Set Your Password</a>
      </div>
      
      <div class="notice">
        <p style="margin: 0;"><strong>Security Note:</strong> This activation link is unique and will expire in <strong>24 hours</strong>. If you did not make this purchase, please ignore this email or contact support.</p>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
      <p>Dhaka, Bangladesh</p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      const transporter = this.getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: fromEmail,
          to,
          subject: `Your ${storeName} Account is Ready - Set Your Password`,
          html,
        });
        if (!isProduction) {
          console.log(`[EmailService] Activation email successfully dispatched to ${to}`);
        }
      } else {
        if (!isProduction) {
          console.log(`[EmailService] SMTP not configured. Development mock logged above.`);
        }
      }
      return true;
    } catch (err: any) {
      if (isProduction) {
        console.error(`[EmailService] Failed to send activation email to ${to}: ${err?.message || err}`);
      } else {
        console.error(`[EmailService] SMTP send error:`, err);
      }
      return false;
    }
  }

  /**
   * Send Order Confirmation Email
   */
  static async sendOrderConfirmationEmail({ to, name, order }: SendOrderConfirmationEmailParams): Promise<boolean> {
    const storeName = process.env.STORE_NAME || 'ONWEAR';
    const fromEmail = process.env.SMTP_FROM || `"${storeName}" <no-reply@onwear.com>`;
    const isProduction = process.env.NODE_ENV === 'production';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Order Confirmation #${order.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 24px; border: 1px solid #e4e4e7; }
    .header { border-bottom: 2px solid #f4f4f5; padding-bottom: 16px; margin-bottom: 20px; }
    h1 { font-size: 20px; color: #09090b; }
    p { font-size: 14px; color: #52525b; line-height: 1.5; }
    .order-box { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Thank You for Your Order!</h1>
    </div>
    <p>Hi ${name || 'Customer'},</p>
    <p>Your order has been received and is being processed.</p>
    <div class="order-box">
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total Amount:</strong> ৳${order.totalAmount}</p>
      <p><strong>Status:</strong> ${order.status}</p>
    </div>
    <p>We'll notify you once your package is dispatched.</p>
    <p>Best regards,<br>${storeName} Team</p>
  </div>
</body>
</html>
    `;

    try {
      const transporter = this.getTransporter();
      if (transporter) {
        await transporter.sendMail({
          from: fromEmail,
          to,
          subject: `Order Confirmation #${order.id} - ${storeName}`,
          html,
        });
      }
      return true;
    } catch (err: any) {
      if (isProduction) {
        console.error(`[EmailService] Failed to send order confirmation to ${to}`);
      }
      return false;
    }
  }
}
