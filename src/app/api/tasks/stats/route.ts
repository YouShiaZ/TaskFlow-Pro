import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.userId, session.user.id));

    // Calculate statistics
    const stats = {
      total: 0,
      completed: 0,
      inProgress: 0,
      upcoming: 0,
      overdue: 0,
      archived: 0,
      byPriority: {
        low: 0,
        medium: 0,
        high: 0
      },
      byCategory: {} as Record<string, number>,
      completionRate: 0
    };

    // Process tasks to calculate statistics
    allTasks.forEach(task => {
      // Count archived tasks separately
      if (task.archived) {
        stats.archived++;
        return;
      }

      // Count non-archived tasks in total
      stats.total++;

      // Count by status
      switch (task.status) {
        case 'completed':
          stats.completed++;
          break;
        case 'in_progress':
          stats.inProgress++;
          break;
        case 'upcoming':
          stats.upcoming++;
          break;
        case 'overdue':
          stats.overdue++;
          break;
      }

      // Count by priority
      const priority = task.priority as 'low' | 'medium' | 'high';
      if (priority in stats.byPriority) {
        stats.byPriority[priority]++;
      }

      // Count by category
      const category = task.category;
      if (category) {
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      }
    });

    // Calculate completion rate
    if (stats.total > 0) {
      stats.completionRate = parseFloat(((stats.completed / stats.total) * 100).toFixed(2));
    } else {
      stats.completionRate = 0;
    }

    return NextResponse.json(stats, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
