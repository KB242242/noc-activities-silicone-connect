import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
          where: { isRead: false }
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
    const {
      userId,
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

    if (!userId || !title || !startTime) {
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

    return NextResponse.json({
      success: true,
      message: 'Tâche créée avec succès',
      task
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
      title,
      description,
      status,
      category,
      priority,
      actualEndTime,
      actualDuration,
      tags
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
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status.toUpperCase();
    if (category) updateData.category = category.toUpperCase();
    if (priority) updateData.priority = priority.toUpperCase();
    if (actualEndTime) updateData.actualEndTime = new Date(actualEndTime);
    if (actualDuration) updateData.actualDuration = actualDuration;
    if (tags) updateData.tags = JSON.stringify(tags);

    // Handle status changes
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      if (!actualDuration) {
        updateData.actualDuration = Math.round(
          (new Date().getTime() - task.startTime.getTime()) / 60000
        );
      }
    }

    // Check if task is overdue
    if (status !== 'COMPLETED' && status !== 'CANCELLED') {
      updateData.isOverdue = new Date() > task.estimatedEndTime;
    }

    // Update task
    const updatedTask = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create history entry if user provided
    if (user) {
      await db.taskHistory.create({
        data: {
          taskId: task.id,
          userId: user.id,
          userName: user.name,
          action: status ? 'status_changed' : 'updated',
          field: status ? 'status' : undefined,
          oldValue: status ? task.status : undefined,
          newValue: status ? status.toUpperCase() : undefined,
          timestamp: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Tâche mise à jour',
      task: updatedTask
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
