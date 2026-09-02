import logger from '../../utils/logger';

interface SendOrderSmsParams {
  phone: string;
  orderId: string;
  totalAmount: number;
  customerName?: string;
}

interface SendActivationSmsParams {
  phone: string;
  name?: string;
  activationToken: string;
}

export class SmsService {
  /**
   * Normalize Bangladeshi phone numbers to international or standard format
   * e.g. "017XXXXXXXX" -> "88017XXXXXXXX" or "017XXXXXXXX"
   */
  private static normalizePhone(phone: string): string {
    let clean = phone.replace(/[^0-9+]/g, '');
    if (clean.startsWith('+880')) {
      clean = clean.substring(1);
    } else if (clean.startsWith('01')) {
      clean = '88' + clean;
    }
    return clean;
  }

  /**
   * Dispatch Order Confirmation SMS
   * Asynchronous and non-blocking.
   */
  static async sendOrderConfirmationSms({
    phone,
    orderId,
    totalAmount,
    customerName
  }: SendOrderSmsParams): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    const storeName = process.env.STORE_NAME || 'ONWEAR';
    const shortOrderId = orderId.substring(0, 8).toUpperCase();
    const cleanPhone = this.normalizePhone(phone);

    const message = `Dear ${customerName || 'Customer'}, thank you for your order #${shortOrderId} at ${storeName}. Total Amount: ৳${totalAmount}. We are processing your delivery. Helpline: 01603-742663`;

    if (!isProduction) {
      console.log('\n' + '='.repeat(60));
      console.log(`📱 [DEV SMS DISPATCH] Order Confirmation SMS`);
      console.log(`To: ${phone} (${cleanPhone})`);
      console.log(`Message: ${message}`);
      console.log('='.repeat(60) + '\n');
    }

    // In production, check for SMS Gateway credentials
    const smsApiKey = process.env.SMS_API_KEY;
    const smsApiUrl = process.env.SMS_API_URL;
    const smsSenderId = process.env.SMS_SENDER_ID || 'ONWEAR';

    if (isProduction && smsApiKey && smsApiUrl) {
      try {
        const response = await fetch(smsApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: smsApiKey,
            senderid: smsSenderId,
            number: cleanPhone,
            message: message
          })
        });

        if (!response.ok) {
          logger.warn(`Failed to dispatch SMS via gateway. Status: ${response.status}`);
          return false;
        }

        logger.info(`Order confirmation SMS dispatched to ${cleanPhone}`);
        return true;
      } catch (err: any) {
        logger.error(`SMS dispatch exception: ${err?.message || err}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Dispatch Account Activation SMS
   */
  static async sendActivationSms({
    phone,
    name,
    activationToken
  }: SendActivationSmsParams): Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const link = `${frontendUrl}/set-password?token=${encodeURIComponent(activationToken)}`;
    const storeName = process.env.STORE_NAME || 'ONWEAR';
    const cleanPhone = this.normalizePhone(phone);

    const message = `Dear ${name || 'Customer'}, welcome to ${storeName}! Set your password to manage your account and orders: ${link}`;

    if (!isProduction) {
      console.log('\n' + '='.repeat(60));
      console.log(`📱 [DEV SMS DISPATCH] Account Activation SMS`);
      console.log(`To: ${phone} (${cleanPhone})`);
      console.log(`Message: ${message}`);
      console.log('='.repeat(60) + '\n');
    }

    return true;
  }
}
