import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const ATTACHMENT_COMMENT_PREFIX = '[ATTACHMENT_COMMENT:';

function canDeleteAttachment(input: { requesterId?: string | null; requesterRole?: string | null; ownerId?: string | null }) {
  const requesterId = String(input.requesterId ?? '').trim();
  const ownerId = String(input.ownerId ?? '').trim();
  const role = String(input.requesterRole ?? '').trim().toUpperCase();
  if (!requesterId) return false;
  if (requesterId === ownerId) return true;
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'RESPONSABLE';
}

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
    const requesterRole = String(body.requesterRole ?? '').trim();

    const current = await (db as any).ticketAttachment.findUnique({ where: { id: attachmentId } });
    if (!current || String(current.ticketId ?? '') !== id) {
      return NextResponse.json({ error: 'Piece jointe non trouvee' }, { status: 404 });
    }

    if (!canDeleteAttachment({ requesterId, requesterRole, ownerId: current.uploadedBy })) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 });
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[tickets/:id/attachments/:attachmentId DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
