import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and, gte, lte, like, or } from 'drizzle-orm';
import { auth } from '@/lib/auth';

// Helper: validate ISO date string safely
function isValidISO(date: any) {
  if (!date || typeof date !== "string") return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

// ======================= GET ===========================
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Get single task
    if (id) {
      if (isNaN(Number(id))) {
        return NextResponse.json(
          { error: 'Invalid ID', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const task = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, Number(id)), eq(tasks.userId, userId)))
        .limit(1);

      if (task.length === 0) {
        return NextResponse.json(
          { error: 'Task not found', code: 'TASK_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(task[0], { status: 200 });
    }

    //------------------------ filters -----------------------
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);
    const offset = Number(searchParams.get('offset') ?? 0);

    const conditions: any[] = [eq(tasks.userId, userId)];

    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const archivedParam = searchParams.get('archived');

    if (search) {
      conditions.push(
        or(
          like(tasks.title, `%${search}%`),
          like(tasks.description, `%${search}%`)
        )
      );
    }

    if (status) conditions.push(eq(tasks.status, status));
    if (category) conditions.push(eq(tasks.category, category));
    if (priority) conditions.push(eq(tasks.priority, priority));

    if (startDate) conditions.push(gte(tasks.startDate, startDate));
    if (endDate) conditions.push(lte(tasks.dueDate, endDate));

    if (archivedParam !== null) {
      conditions.push(eq(tasks.archived, archivedParam === "true"));
    }

    const result = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("GET error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

// ======================= POST ===========================
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      startDate,
      dueDate,
      category,
      status,
      archived,
      googleCalendarEventId
    } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required", code: "MISSING_TITLE" },
        { status: 400 }
      );
    }

    if (!isValidISO(dueDate)) {
      return NextResponse.json(
        { error: "Invalid due date (must be ISO string)", code: "INVALID_DUEDATE" },
        { status: 400 }
      );
    }

    if (startDate && !isValidISO(startDate)) {
      return NextResponse.json(
        { error: "Invalid start date", code: "INVALID_STARTDATE" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const newTask = await db
      .insert(tasks)
      .values({
        userId: session.user.id,
        title: title.trim(),
        description: description?.trim() ?? null,
        priority: priority ?? "medium",
        startDate: startDate ?? null,
        dueDate,
        category: category ?? "personal",
        status: status ?? "upcoming",
        archived: archived ?? false,
        googleCalendarEventId: googleCalendarEventId ?? null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return NextResponse.json(newTask[0], { status: 201 });
  } catch (error: any) {
    console.error("POST error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

// ======================= PUT ===========================
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid ID", code: "INVALID_ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, Number(id)), eq(tasks.userId, session.user.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Task not found", code: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    const updates: any = { updatedAt: new Date().toISOString() };

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined)
      updates.description = body.description?.trim() ?? null;
    if (body.priority !== undefined) updates.priority = body.priority;

    if (body.startDate !== undefined) {
      if (body.startDate && !isValidISO(body.startDate)) {
        return NextResponse.json(
          { error: "Invalid start date", code: "INVALID_STARTDATE" },
          { status: 400 }
        );
      }
      updates.startDate = body.startDate ?? null;
    }

    if (body.dueDate !== undefined) {
      if (!isValidISO(body.dueDate)) {
        return NextResponse.json(
          { error: "Invalid due date", code: "INVALID_DUEDATE" },
          { status: 400 }
        );
      }
      updates.dueDate = body.dueDate;
    }

    if (body.status !== undefined) updates.status = body.status;
    if (body.category !== undefined) updates.category = body.category;
    if (body.archived !== undefined) updates.archived = body.archived;
    if (body.googleCalendarEventId !== undefined)
      updates.googleCalendarEventId = body.googleCalendarEventId ?? null;

    const updated = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, Number(id)), eq(tasks.userId, session.user.id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error("PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}

// ======================= DELETE ===========================
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = request.nextUrl.searchParams.get("id");

    if (!id || isNaN(Number(id))) {
      return NextResponse.json(
        { error: "Invalid ID", code: "INVALID_ID" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, Number(id)), eq(tasks.userId, session.user.id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Task not found", code: "TASK_NOT_FOUND" },
        { status: 404 }
      );
    }

    await db
      .delete(tasks)
      .where(and(eq(tasks.id, Number(id)), eq(tasks.userId, session.user.id)));

    return NextResponse.json(
      { message: "Task deleted successfully", id: Number(id) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
