import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { tasks, account } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { ensureGoogleAccessToken } from '@/lib/google-tokens';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId, action } = body; // action: 'create', 'update', 'delete'

    if (!taskId || isNaN(parseInt(taskId))) {
      return NextResponse.json({ error: 'Valid task ID is required' }, { status: 400 });
    }
    const taskIdNum = parseInt(taskId);

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

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get task details
    const task = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskIdNum),
          eq(tasks.userId, user.id)
        )
      )
      .limit(1);

    if (!task.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const taskData = task[0];

    if (action === 'create') {
      // Create calendar event
      const event = {
        summary: taskData.title,
        description: taskData.description || '',
        start: {
          dateTime: new Date(taskData.dueDate).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(new Date(taskData.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      // Update task with calendar event ID
      await db
        .update(tasks)
        .set({ googleCalendarEventId: response.data.id })
        .where(
          and(
            eq(tasks.id, taskIdNum),
            eq(tasks.userId, user.id)
          )
        );

      return NextResponse.json({ 
        success: true, 
        eventId: response.data.id 
      });
    } else if (action === 'update' && taskData.googleCalendarEventId) {
      // Update existing calendar event
      const event = {
        summary: taskData.title,
        description: taskData.description || '',
        start: {
          dateTime: new Date(taskData.dueDate).toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: new Date(new Date(taskData.dueDate).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC',
        },
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: taskData.googleCalendarEventId,
        requestBody: event,
      });

      return NextResponse.json({ success: true });
    } else if (action === 'delete' && taskData.googleCalendarEventId) {
      // Delete calendar event
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: taskData.googleCalendarEventId,
      });

      // Clear calendar event ID from task
      await db
        .update(tasks)
        .set({ googleCalendarEventId: null })
        .where(
          and(
            eq(tasks.id, taskIdNum),
            eq(tasks.userId, user.id)
          )
        );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync with calendar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
