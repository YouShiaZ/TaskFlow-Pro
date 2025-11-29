import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { account } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ensureGoogleAccessToken } from '@/lib/google-tokens';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message, taskTitle, taskDueDate } = body;

    // Get user's Google OAuth tokens
    const userAccount = await db
      .select()
      .from(account)
      .where(eq(account.userId, user.id))
      .limit(1);

    if (!userAccount.length || !userAccount[0].accessToken) {
      return NextResponse.json({ 
        error: 'Google account not connected' 
      }, { status: 400 });
    }

    const tokens = await ensureGoogleAccessToken(userAccount[0]);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create email content
    const emailContent = `
From: TaskFlow Pro <noreply@taskflow.com>
To: ${user.email}
Subject: ${subject}

Hello ${user.name || 'there'},

${message}

Task: ${taskTitle}
Due Date: ${taskDueDate}

Best regards,
TaskFlow Pro Team

---
This is an automated reminder from TaskFlow Pro.
    `.trim();

    // Encode email in base64
    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email using Gmail API
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Email notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send email notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
