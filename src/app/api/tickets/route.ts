import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tickets - Get tickets with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reporterId = searchParams.get('reporterId');
    const assigneeId = searchParams.get('assigneeId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const site = searchParams.get('site');
    const search = searchParams.get('search');

    const where: any = {
      isDeleted: false
    };

    if (reporterId) {
      where.reporterId = reporterId;
    }
    if (assigneeId) {
      where.assigneeId = assigneeId;
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
    if (site) {
      where.site = { contains: site };
    }
    if (search) {
      where.OR = [
        { numero: { contains: search } },
        { objet: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const tickets = await db.ticket.findMany({
      where,
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      tickets,
      count: tickets.length
    });

  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create new ticket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reporterId,
      objet,
      description,
      priority,
      category,
      site,
      localite,
      technicien,
      assigneeId,
      tags,
      dueDate
    } = body;

    if (!reporterId || !objet) {
      return NextResponse.json(
        { success: false, error: 'Reporter et objet requis' },
        { status: 400 }
      );
    }

    // Get reporter info
    const reporter = await db.user.findUnique({ where: { id: reporterId } });
    if (!reporter) {
      return NextResponse.json(
        { success: false, error: 'Reporter non trouvé' },
        { status: 404 }
      );
    }

    // Get assignee info if provided
    let assignee = null;
    if (assigneeId) {
      assignee = await db.user.findUnique({ where: { id: assigneeId } });
    }

    // Generate ticket number
    const year = new Date().getFullYear();
    const counter = await db.$queryRaw<any[]>`
      SELECT current_number FROM ticket_counters 
      WHERE prefix = 'TKT' AND year = ${year}
    `;
    
    let newNumber = 1;
    if (counter.length > 0) {
      newNumber = counter[0].current_number + 1;
    }
    
    await db.$executeRaw`
      INSERT INTO ticket_counters (id, prefix, current_number, year)
      VALUES ('tc-1', 'TKT', ${newNumber}, ${year})
      ON DUPLICATE KEY UPDATE current_number = ${newNumber}
    `;

    const numero = `TKT-${year}-${String(newNumber).padStart(5, '0')}`;

    // Create ticket
    const ticket = await db.ticket.create({
      data: {
        numero,
        objet,
        description: description || null,
        status: 'OPEN',
        priority: priority?.toUpperCase() || 'MEDIUM',
        category: category?.toUpperCase() || 'OTHER',
        site: site || null,
        localite: localite || null,
        technicien: technicien || null,
        reporterId: reporter.id,
        reporterName: reporter.name,
        assigneeId: assignee?.id || null,
        assigneeName: assignee?.name || null,
        tags: tags ? JSON.stringify(tags) : null,
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create history entry
    await db.ticketHistory.create({
      data: {
        ticketId: ticket.id,
        userId: reporter.id,
        userName: reporter.name,
        action: 'created',
        timestamp: new Date()
      }
    });

    // Create notification for assignee if exists
    if (assignee) {
      await db.notification.create({
        data: {
          userId: assignee.id,
          title: 'Nouveau ticket assigné',
          message: `Le ticket ${numero} vous a été assigné: ${objet}`,
          type: 'info',
          link: `/tickets/${ticket.id}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket créé avec succès',
      ticket
    });

  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets - Update ticket
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticketId,
      userId,
      objet,
      description,
      status,
      priority,
      category,
      site,
      localite,
      technicien,
      assigneeId,
      tags,
      dueDate
    } = body;

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ID ticket requis' },
        { status: 400 }
      );
    }

    // Find ticket
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket non trouvé' },
        { status: 404 }
      );
    }

    // Get user
    const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;

    // Get new assignee info if changing
    let assignee = null;
    if (assigneeId && assigneeId !== ticket.assigneeId) {
      assignee = await db.user.findUnique({ where: { id: assigneeId } });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (objet) updateData.objet = objet;
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status.toUpperCase();
    if (priority) updateData.priority = priority.toUpperCase();
    if (category) updateData.category = category.toUpperCase();
    if (site !== undefined) updateData.site = site;
    if (localite !== undefined) updateData.localite = localite;
    if (technicien !== undefined) updateData.technicien = technicien;
    if (tags) updateData.tags = JSON.stringify(tags);
    if (dueDate) updateData.dueDate = new Date(dueDate);
    
    if (assignee) {
      updateData.assigneeId = assignee.id;
      updateData.assigneeName = assignee.name;
    }

    // Handle status changes
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    } else if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    // Update ticket
    const updatedTicket = await db.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        reporter: {
          select: { id: true, name: true, email: true }
        },
        assignee: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create history entry if user provided
    if (user) {
      await db.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: user.id,
          userName: user.name,
          action: status ? 'status_changed' : 'updated',
          field: status ? 'status' : undefined,
          oldValue: status ? ticket.status : undefined,
          newValue: status ? status.toUpperCase() : undefined,
          timestamp: new Date()
        }
      });
    }

    // Create notification for new assignee
    if (assignee) {
      await db.notification.create({
        data: {
          userId: assignee.id,
          title: 'Ticket mis à jour',
          message: `Le ticket ${ticket.numero} vous a été assigné: ${ticket.objet}`,
          type: 'info',
          link: `/tickets/${ticket.id}`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket mis à jour',
      ticket: updatedTicket
    });

  } catch (error) {
    console.error('Update ticket error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets - Delete ticket (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ticketId = searchParams.get('ticketId');
    const userId = searchParams.get('userId');
    const permanent = searchParams.get('permanent') === 'true';

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ID ticket requis' },
        { status: 400 }
      );
    }

    // Find ticket
    const ticket = await db.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket non trouvé' },
        { status: 404 }
      );
    }

    // Get user
    const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;

    if (permanent) {
      // Permanent delete
      await db.ticket.delete({ where: { id: ticketId } });
    } else {
      // Soft delete
      await db.ticket.update({
        where: { id: ticketId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId || 'unknown'
        }
      });
    }

    // Create history entry if user provided
    if (user) {
      await db.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          userId: user.id,
          userName: user.name,
          action: permanent ? 'deleted' : 'soft_deleted',
          timestamp: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Ticket supprimé définitivement' : 'Ticket supprimé'
    });

  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
