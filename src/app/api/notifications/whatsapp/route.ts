import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { phoneNumber, message, taskTitle } = body;

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return NextResponse.json({ 
        error: 'Twilio not configured',
        message: 'Please add Twilio credentials to environment variables'
      }, { status: 400 });
    }

    // Twilio integration
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const whatsappMessage = `
*TaskFlow Pro Reminder*

${message}

📌 Task: ${taskTitle}

Stay productive! 🚀
    `.trim();

    await client.messages.create({
      body: whatsappMessage,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send WhatsApp notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
