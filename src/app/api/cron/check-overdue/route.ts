import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks, user, account } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { google } from 'googleapis';

// This endpoint should be called by a cron job every minute
// Example: Vercel Cron or external service like Cron-job.org

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Find all overdue tasks that aren't completed or already marked overdue
    const overdueTasks = await db
      .select({
        task: tasks,
        user: user,
      })
      .from(tasks)
      .innerJoin(user, eq(tasks.userId, user.id))
      .where(
        and(
          lt(tasks.dueDate, now),
          eq(tasks.status, 'upcoming'),
          eq(tasks.archived, false)
        )
      );

    // Update tasks to overdue status
    for (const { task: overdueTask } of overdueTasks) {
      await db
        .update(tasks)
        .set({ status: 'overdue' })
        .where(eq(tasks.id, overdueTask.id));
    }

    // Send notifications for newly overdue tasks
    const notificationPromises = overdueTasks.map(async ({ task: overdueTask, user: taskUser }) => {
      try {
        // Get user's Google account for email
        const userAccount = await db
          .select()
          .from(account)
          .where(eq(account.userId, taskUser.id))
          .limit(1);

        if (userAccount.length && userAccount[0].accessToken) {
          // Send email notification via Gmail API
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
          );

          oauth2Client.setCredentials({
            access_token: userAccount[0].accessToken,
            refresh_token: userAccount[0].refreshToken,
          });

          const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

          const emailContent = `
From: TaskFlow Pro <noreply@taskflow.com>
To: ${taskUser.email}
Subject: ⚠️ Task Overdue: ${overdueTask.title}

Hello ${taskUser.name || 'there'},

Your task "${overdueTask.title}" is now overdue!

Due Date: ${new Date(overdueTask.dueDate).toLocaleDateString()}
Priority: ${overdueTask.priority}
Category: ${overdueTask.category}

Please complete this task as soon as possible.

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
        }
      } catch (error) {
        console.error(`Failed to send notification for task ${overdueTask.id}:`, error);
      }
    });

    await Promise.allSettled(notificationPromises);

    return NextResponse.json({ 
      success: true,
      overdueTasksProcessed: overdueTasks.length
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
