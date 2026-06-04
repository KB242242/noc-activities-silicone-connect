import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveTicketManagerFromActorId } from '@/lib/tickets/permissions';

const ATTACHMENT_COMMENT_PREFIX = '[ATTACHMENT_COMMENT:';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const download = req.nextUrl.searchParams.get('download') === '1';

    const current = await (db as any).ticketAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        ticketId: true,
        fileName: true,
        fileType: true,
        fileData: true,
      },
    });

    if (!current || String(current.ticketId ?? '') !== id) {
      return NextResponse.json({ error: 'Piece jointe non trouvee' }, { status: 404 });
    }

    const fileData = String(current.fileData ?? '').trim();
    if (!fileData) {
      return NextResponse.json({ error: 'Contenu de piece jointe introuvable' }, { status: 404 });
    }

    const bytes = Buffer.from(fileData, 'base64');
    const fileName = String(current.fileName ?? 'piece-jointe');
    const mimeType = String(current.fileType ?? 'application/octet-stream') || 'application/octet-stream';
    const dispositionType = download ? 'attachment' : 'inline';

    return new NextResponse(bytes, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=60',
        'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('[tickets/:id/attachments/:attachmentId GET]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await context.params;
    const body = await req.json().catch(() => ({}));
    const requesterId = String(body.requesterId ?? '').trim();

    const actor = requesterId
      ? await (db as any).user.findUnique({
          where: { id: requesterId },
          select: { id: true, name: true, username: true, firstName: true },
        }).catch(() => null)
      : null;
    const actorName = String(actor?.name ?? actor?.username ?? actor?.firstName ?? requesterId ?? 'Utilisateur').trim() || 'Utilisateur';

    const actorAccess = await resolveTicketManagerFromActorId(db, requesterId);
    if (!actorAccess.canManage) {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 });
    }

    const current = await (db as any).ticketAttachment.findUnique({ where: { id: attachmentId } });
    if (!current || String(current.ticketId ?? '') !== id) {
      return NextResponse.json({ error: 'Piece jointe non trouvee' }, { status: 404 });
    }

    const currentUploader = await (db as any).user.findUnique({
      where: { id: String(current.uploadedBy ?? '') },
      select: { id: true, name: true, username: true, firstName: true },
    }).catch(() => null);
    const uploaderName = String(currentUploader?.name ?? currentUploader?.username ?? currentUploader?.firstName ?? current.uploadedBy ?? 'Utilisateur').trim() || 'Utilisateur';

    await (db as any).ticketAttachment.delete({ where: { id: attachmentId } });

    await (db as any).ticketComment.deleteMany({
      where: {
        ticketId: id,
        content: {
          startsWith: `${ATTACHMENT_COMMENT_PREFIX}${attachmentId}]`,
        },
      },
    }).catch(() => null);

    await (db as any).ticket.update({
      where: { id },
      data: { updatedAt: new Date() },
    }).catch(() => null);

    await (db as any).ticketHistory.create({
      data: {
        ticketId: id,
        action: 'attachment_deleted',
        field: 'attachment',
        oldValue: JSON.stringify({
          fileName: String(current.fileName ?? '').trim(),
          fileType: String(current.fileType ?? '').trim(),
          uploadedById: String(current.uploadedBy ?? ''),
          uploadedByName: uploaderName,
        }),
        newValue: JSON.stringify({
          fileName: String(current.fileName ?? '').trim(),
          fileType: String(current.fileType ?? '').trim(),
          deletedById: actor?.id ?? requesterId,
          deletedByName: actorName,
        }),
        userId: actor?.id ?? requesterId,
        userName: actorName,
      },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tickets/:id/attachments/:attachmentId DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
