import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

const TASK_ALERT_WINDOW_MINUTES = 15;

function buildTaskAlertPayload(task: { id: string; title: string; status?: string | null; priority?: string | null; estimatedEndTime?: Date | null }) {
  const status = String(task.status ?? 'PENDING').trim().toUpperCase();
  const priority = String(task.priority ?? 'MEDIUM').trim().toUpperCase();
  const alerts: Array<{ type: 'WARNING' | 'CRITICAL' | 'INFO' | 'SUCCESS'; message: string; triggeredBy: string }> = [];

  if (status === 'PENDING' && priority === 'CRITICAL') {
    alerts.push({
      type: 'CRITICAL',
      message: `La tâche critique "${task.title}" n'a pas encore commencé`,
      triggeredBy: 'critical_not_started',
    });
  }

  if (task.estimatedEndTime && new Date() > task.estimatedEndTime && !['COMPLETED', 'CANCELLED'].includes(status)) {
    alerts.push({
      type: 'CRITICAL',
      message: `La tâche "${task.title}" a dépassé son temps estimé`,
      triggeredBy: 'overdue',
    });
  }

  if (
    task.estimatedEndTime &&
    !['COMPLETED', 'CANCELLED'].includes(status) &&
    task.estimatedEndTime.getTime() - Date.now() <= TASK_ALERT_WINDOW_MINUTES * 60000 &&
    task.estimatedEndTime.getTime() > Date.now()
  ) {
    alerts.push({
      type: 'WARNING',
      message: `La tâche "${task.title}" approche de sa limite de temps`,
      triggeredBy: 'time_limit',
    });
  }

  return alerts;
}

async function upsertTaskAlerts(taskId: string, alerts: Array<{ type: 'WARNING' | 'CRITICAL' | 'INFO' | 'SUCCESS'; message: string; triggeredBy: string }>) {
  if (alerts.length === 0) return;

  const existingAlerts = await db.taskAlert.findMany({
    where: { taskId },
    select: { triggeredBy: true },
  });
  const existingTriggeredBy = new Set(existingAlerts.map((alert) => alert.triggeredBy));

  const newAlerts = alerts.filter((alert) => !existingTriggeredBy.has(alert.triggeredBy));
  if (newAlerts.length === 0) return;

  await db.taskAlert.createMany({
    data: newAlerts.map((alert) => ({
      taskId,
      type: alert.type,
      message: alert.message,
      triggeredBy: alert.triggeredBy,
    })),
  });
}

async function loadTaskById(taskId: string) {
  return db.task.findUnique({
    where: { id: taskId },
    include: {
      ticket: {
        select: {
          id: true,
          numero: true,
          objet: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          shift: true,
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      alerts: {
        orderBy: { createdAt: 'desc' },
      },
      history: {
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
    },
  });
}

// GET /api/tasks - Get tasks with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shiftName = searchParams.get('shiftName');

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }
    if (status) {
      where.status = status.toUpperCase();
    }
    if (priority) {
      where.priority = priority.toUpperCase();
    }
    if (category) {
      where.category = category.toUpperCase();
    }
    if (shiftName) {
      where.shiftName = shiftName;
    }
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.startTime.lte = new Date(endDate);
      }
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        ticket: {
          select: {
            id: true,
            numero: true,
            objet: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            shift: true
          }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        alerts: {
          orderBy: { createdAt: 'desc' }
        },
        history: {
          orderBy: { timestamp: 'desc' },
          take: 20
        }
      },
      orderBy: { startTime: 'desc' }
    });

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[TaskAPI POST] Received body:', body);
    
    const {
      userId,
      ticketId,
      title,
      description,
      category,
      priority,
      responsibility,
      shiftName,
      startTime,
      estimatedDuration,
      tags
    } = body;

    console.log('[TaskAPI POST] Validation check - userId:', userId, 'title:', title, 'startTime:', startTime);

    if (!userId || !title || !startTime) {
      console.log('[TaskAPI POST] Validation failed');
      return NextResponse.json(
        { success: false, error: 'Utilisateur, titre et date de début requis' },
        { status: 400 }
      );
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { shift: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    let linkedTicket: { id: string } | null = null;
    if (ticketId) {
      linkedTicket = await db.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!linkedTicket) {
        return NextResponse.json(
          { success: false, error: 'Ticket lié non trouvé' },
          { status: 404 }
        );
      }
    }

    const duration = estimatedDuration || 60;
    const start = new Date(startTime);
    const estimatedEnd = new Date(start.getTime() + duration * 60000);

    // Create task
    const task = await db.task.create({
      data: {
        userId,
        title,
        description: description || null,
        status: 'PENDING',
        category: category?.toUpperCase() || 'OTHER',
        priority: priority?.toUpperCase() || 'MEDIUM',
        responsibility: responsibility || null,
        shiftName: shiftName || user.shift?.name || null,
        startTime: start,
        estimatedEndTime: estimatedEnd,
        estimatedDuration: duration,
        tags: tags ? JSON.stringify(tags) : null,
        isOverdue: false
      },
      include: {
        ticket: {
          select: {
            id: true,
            numero: true,
            objet: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            shift: true
          }
        }
      }
    });

    if (linkedTicket?.id) {
      try {
        await db.$executeRaw(
          Prisma.sql`UPDATE tasks SET ticket_id = ${linkedTicket.id} WHERE id = ${task.id}`
        );
      } catch (ticketLinkError) {
        console.warn('Task created without ticket link:', ticketLinkError);
      }
    }

    await upsertTaskAlerts(task.id, buildTaskAlertPayload(task));

    // Create history entry
    await db.taskHistory.create({
      data: {
        taskId: task.id,
        userId: user.id,
        userName: user.name,
        action: 'created',
        timestamp: new Date()
      }
    });

    const createdTask = await loadTaskById(task.id);

    return NextResponse.json({
      success: true,
      message: 'Tâche créée avec succès',
      task: createdTask
    });

  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Update task
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      taskId,
      userId,
      ticketId,
      title,
      description,
      status,
      category,
      priority,
      startTime,
      estimatedEndTime,
      estimatedDuration,
      actualEndTime,
      actualDuration,
      tags,
      transferToUserId
    } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'ID tâche requis' },
        { status: 400 }
      );
    }

    // Find task
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tâche non trouvée' },
        { status: 404 }
      );
    }

    // Get user
    const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (ticketId !== undefined) updateData.ticketId = ticketId || null;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status.toUpperCase();
    if (category) updateData.category = category.toUpperCase();
    if (priority) updateData.priority = priority.toUpperCase();
    if (startTime) updateData.startTime = new Date(startTime);
    if (estimatedEndTime) updateData.estimatedEndTime = new Date(estimatedEndTime);
    if (estimatedDuration) updateData.estimatedDuration = estimatedDuration;
    if (actualEndTime) updateData.actualEndTime = new Date(actualEndTime);
    if (actualDuration) updateData.actualDuration = actualDuration;
    if (tags) updateData.tags = JSON.stringify(tags);
    if (transferToUserId) updateData.userId = transferToUserId;

    if (status && status.toUpperCase() !== 'COMPLETED') {
      updateData.completedAt = null;
      if (!actualEndTime) {
        updateData.actualEndTime = null;
      }
      if (!actualDuration) {
        updateData.actualDuration = null;
      }
    }

    // Handle status changes
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      if (!actualDuration) {
        const taskStartTime = task.startTime ?? new Date();
        updateData.actualDuration = Math.round(
          (new Date().getTime() - taskStartTime.getTime()) / 60000
        );
      }
    }

    // Check if task is overdue
    if (status !== 'COMPLETED' && status !== 'CANCELLED') {
      updateData.isOverdue = task.estimatedEndTime ? new Date() > task.estimatedEndTime : false;
    }

    if (transferToUserId && transferToUserId !== task.userId) {
      const transferUser = await db.user.findUnique({ where: { id: transferToUserId } });
      if (!transferUser) {
        return NextResponse.json(
          { success: false, error: 'Utilisateur cible non trouvé' },
          { status: 404 }
        );
      }
    }

    if (ticketId) {
      const linkedTicket = await db.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
      if (!linkedTicket) {
        return NextResponse.json(
          { success: false, error: 'Ticket lié non trouvé' },
          { status: 404 }
        );
      }
    }

    // Update task
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        ticket: {
          select: {
            id: true,
            numero: true,
            objet: true,
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await upsertTaskAlerts(updatedTask.id, buildTaskAlertPayload(updatedTask));

    // Create history entry if user provided
    if (user && !transferToUserId) {
      await db.taskHistory.create({
        data: {
          taskId: task.id,
          userId: user.id,
          userName: user.name,
          action: transferToUserId ? 'updated' : status ? 'status_changed' : 'updated',
          field: transferToUserId ? 'userId' : status ? 'status' : undefined,
          oldValue: transferToUserId ? task.userId : status ? task.status : undefined,
          newValue: transferToUserId ? transferToUserId : status ? status.toUpperCase() : undefined,
          timestamp: new Date()
        }
      });
    }

    if (transferToUserId && transferToUserId !== task.userId) {
      const transferUser = await db.user.findUnique({ where: { id: transferToUserId } });
      if (transferUser) {
        await db.taskHistory.create({
          data: {
            taskId: task.id,
            userId: transferUser.id,
            userName: transferUser.name,
            action: 'updated',
            field: 'userId',
            oldValue: task.userId,
            newValue: transferUser.id,
            timestamp: new Date()
          }
        });
      }
    }

    const refreshedTask = await loadTaskById(taskId);

    return NextResponse.json({
      success: true,
      message: 'Tâche mise à jour',
      task: refreshedTask ?? updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks - Delete task
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const userId = searchParams.get('userId');

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: 'ID tâche requis' },
        { status: 400 }
      );
    }

    // Find task
    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json(
        { success: false, error: 'Tâche non trouvée' },
        { status: 404 }
      );
    }

    // Get user
    const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;

    // Create history before deletion if user provided
    if (user) {
      await db.taskHistory.create({
        data: {
          taskId: task.id,
          userId: user.id,
          userName: user.name,
          action: 'deleted',
          timestamp: new Date()
        }
      });
    }

    // Delete task
    await db.task.delete({ where: { id: taskId } });

    return NextResponse.json({
      success: true,
      message: 'Tâche supprimée'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
