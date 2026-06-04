import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

const ATTACHMENT_COMMENT_PREFIX = '[ATTACHMENT_COMMENT:';

function parseBase64Payload(raw: string) {
  const input = String(raw ?? '').trim();
  if (!input) return '';
  const dataIndex = input.indexOf('base64,');
  if (dataIndex >= 0) return input.slice(dataIndex + 'base64,'.length).trim();
  return input;
}

function encodeAttachmentComment(attachmentId: string, message: string) {
  return `${ATTACHMENT_COMMENT_PREFIX}${attachmentId}]\n${message}`;
}

function mapAttachment(record: any) {
  return {
    id: record.id,
    ticketId: record.ticketId,
    name: record.fileName ?? '',
    url: `/api/tickets/${encodeURIComponent(String(record.ticketId ?? ''))}/attachments/${encodeURIComponent(String(record.id ?? ''))}`,
    size: record.fileSize ?? 0,
    mimeType: record.fileType ?? 'application/octet-stream',
    uploadedBy: record.uploadedBy ?? '',
    uploadedByName: record.user?.name ?? record.user?.username ?? record.user?.firstName ?? record.uploadedBy ?? 'Utilisateur',
    uploadedAt: record.uploadedAt ?? record.createdAt ?? new Date().toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const attachments = await (db as any).ticketAttachment.findMany({
      where: { ticketId: id },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        ticketId: true,
        fileName: true,
        fileType: true,
        fileSize: true,
        uploadedBy: true,
        uploadedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            firstName: true,
          },
        },
      },
    });

    return NextResponse.json(attachments.map(mapAttachment));
  } catch (error) {
    console.error('[tickets/:id/attachments GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));

    const fileName = String(body.fileName ?? '').trim();
    const fileType = String(body.fileType ?? 'application/octet-stream').trim() || 'application/octet-stream';
    const uploadedBy = String(body.uploadedBy ?? '').trim();
    const comment = String(body.comment ?? '').trim();
    const parsedFileSize = Number(body.fileSize ?? 0);
    const fileSize = Number.isFinite(parsedFileSize) ? Math.max(0, Math.floor(parsedFileSize)) : 0;
    const fileData = parseBase64Payload(String(body.fileData ?? ''));

    if (!fileName) {
      return NextResponse.json({ error: 'Nom du fichier requis' }, { status: 400 });
    }

    if (!uploadedBy) {
      return NextResponse.json({ error: 'Utilisateur requis' }, { status: 400 });
    }

    const actorAccess = await resolveTicketManagerFromActorId(db, uploadedBy);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    if (!fileData) {
      return NextResponse.json({ error: 'Contenu du fichier requis' }, { status: 400 });
    }

    const ticketExists = await (db as any).ticket.findUnique({ where: { id }, select: { id: true } });
    if (!ticketExists) {
      return NextResponse.json({ error: 'Ticket non trouve' }, { status: 404 });
    }

    const uploader = await (db as any).user.findUnique({
      where: { id: uploadedBy },
      select: { id: true, name: true, username: true, firstName: true },
    });
    if (!uploader) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 400 });
    }

    const attachment = await (db as any).ticketAttachment.create({
      data: {
        ticketId: id,
        fileName,
        fileType,
        fileSize,
        fileData,
        uploadedBy: uploader.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            firstName: true,
          },
        },
      },
    });

    if (comment) {
      await (db as any).ticketComment.create({
        data: {
          ticketId: id,
          userId: uploader.id,
          userName: uploader.name ?? uploader.username ?? uploader.firstName ?? 'Utilisateur',
          content: encodeAttachmentComment(attachment.id, comment),
          isPrivate: false,
        },
      }).catch(() => null);
    }

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action: 'attachment_uploaded',
        field: 'attachment',
        oldValue: null,
        newValue: JSON.stringify({
          fileName: attachment.fileName ?? fileName,
          fileType: attachment.fileType ?? fileType,
          uploadedById: uploader.id,
          uploadedByName: uploader.name ?? uploader.username ?? uploader.firstName ?? 'Utilisateur',
        }),
        userId: uploader.id,
        userName: uploader.name ?? uploader.username ?? uploader.firstName ?? 'Utilisateur',
      },
    }).catch(() => null);

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    return NextResponse.json(mapAttachment(attachment), { status: 201 });
  } catch (error) {
    console.error('[tickets/:id/attachments POST]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
