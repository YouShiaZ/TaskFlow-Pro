import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, user, account } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { google } from 'googleapis';
import { startOfDay, endOfDay } from 'date-fns';

// This endpoint should be called by a cron job every morning at 8 AM
// Example: Vercel Cron configured to run daily

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const startOfToday = startOfDay(today).toISOString();
    const endOfToday = endOfDay(today).toISOString();

    // Get all users
    const users = await db.select().from(user);

    const summaryPromises = users.map(async (currentUser) => {
      try {
        // Get today's tasks for this user
        const todayTasks = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, currentUser.id),
              gte(tasks.dueDate, startOfToday),
              lte(tasks.dueDate, endOfToday),
              eq(tasks.archived, false)
            )
          );

        // Get overdue tasks
        const overdueTasks = await db
          .select()
          .from(tasks)
          .where(
            and(
              eq(tasks.userId, currentUser.id),
              eq(tasks.status, 'overdue'),
              eq(tasks.archived, false)
            )
          );

        if (todayTasks.length === 0 && overdueTasks.length === 0) {
          return; // No tasks to report
        }

        // Get user's Google account
        const userAccount = await db
          .select()
          .from(account)
          .where(eq(account.userId, currentUser.id))
          .limit(1);

        if (!userAccount.length || !userAccount[0].accessToken) {
          return; // No Google account connected
        }

        // Send daily summary email
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: userAccount[0].accessToken,
          refresh_token: userAccount[0].refreshToken,
        });

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const taskList = todayTasks
          .map((task, index) => `${index + 1}. ${task.title} (${task.priority} priority)`)
          .join('\n');

        const overdueList = overdueTasks
          .map((task, index) => `${index + 1}. ${task.title} (${task.priority} priority)`)
          .join('\n');

        const emailContent = `
From: TaskFlow Pro <noreply@taskflow.com>
To: ${currentUser.email}
Subject: 📅 Daily Task Summary - ${new Date().toLocaleDateString()}

Good morning ${currentUser.name || 'there'}!

Here's your daily task summary:

📋 TODAY'S TASKS (${todayTasks.length}):
${taskList || 'No tasks due today'}

${overdueTasks.length > 0 ? `
⚠️ OVERDUE TASKS (${overdueTasks.length}):
${overdueList}
` : ''}

Have a productive day!

Best regards,
TaskFlow Pro Team
        `.trim();

        const encodedEmail = Buffer.from(emailContent)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedEmail,
          },
        });
      } catch (error) {
        console.error(`Failed to send summary to user ${currentUser.id}:`, error);
      }
    });

    await Promise.allSettled(summaryPromises);

    return NextResponse.json({ 
      success: true,
      usersProcessed: users.length
    });
  } catch (error) {
    console.error('Daily summary cron error:', error);
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
