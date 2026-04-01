import { registerAs } from '@nestjs/config';

export default registerAs('twilio', () => ({
  accountSid: process.env.TWILIO_ACCOUNT_SID || '',
  authToken: process.env.TWILIO_AUTH_TOKEN || '',
  whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || '', // e.g., whatsapp:+14155238886
  smsFrom: process.env.TWILIO_SMS_FROM || '', // e.g., +1234567890
}));
