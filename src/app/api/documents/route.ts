import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/documents - Get documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const folderId = searchParams.get('folderId');

    const where: any = {
      isArchived: false
    };

    // User can see their own documents or public documents
    if (userId) {
      where.OR = [
        { ownerId: userId },
        { isPublic: true },
        { shares: { some: { userId } } }
      ];
    } else {
      where.isPublic = true;
    }

    if (category) {
      where.category = category;
    }
    if (folderId) {
      where.folderId = folderId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } }
      ];
    }

    const documents = await db.document.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        shares: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      documents,
      count: documents.length
    });

  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// POST /api/documents - Create document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const ownerId = formData.get('ownerId') as string;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const tags = formData.get('tags') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const folderId = formData.get('folderId') as string;

    if (!file || !ownerId) {
      return NextResponse.json(
        { success: false, error: 'Fichier et propriétaire requis' },
        { status: 400 }
      );
    }

    // Get file info
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // Convert file to base64 for storage (or use file system)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = `/uploads/${Date.now()}-${fileName}`;

    // Create document
    const document = await db.document.create({
      data: {
        title: title || fileName,
        description: description || null,
        fileName,
        filePath,
        fileType,
        fileSize,
        category: category || null,
        tags: tags ? JSON.stringify(tags.split(',')) : null,
        ownerId,
        folderId: folderId || null,
        isPublic,
        version: 1
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create initial version
    await db.documentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        fileName,
        filePath,
        fileSize,
        uploadedBy: ownerId,
        changes: 'Version initiale'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Document créé avec succès',
      document
    });

  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT /api/documents - Update document
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, userId, title, description, category, tags, isPublic, isArchived } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID document requis' },
        { status: 400 }
      );
    }

    // Find document
    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Check permission
    if (userId && document.ownerId !== userId) {
      // Check if user has write permission
      const share = await db.documentShare.findFirst({
        where: { documentId, userId, permission: { in: ['write', 'admin'] } }
      });
      if (!share) {
        return NextResponse.json(
          { success: false, error: 'Non autorisé' },
          { status: 403 }
        );
      }
    }

    // Update document
    const updatedDocument = await db.document.update({
      where: { id: documentId },
      data: {
        title: title || document.title,
        description: description !== undefined ? description : document.description,
        category: category || document.category,
        tags: tags ? JSON.stringify(tags) : document.tags,
        isPublic: isPublic !== undefined ? isPublic : document.isPublic,
        isArchived: isArchived !== undefined ? isArchived : document.isArchived,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Document mis à jour',
      document: updatedDocument
    });

  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents - Delete document
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const userId = searchParams.get('userId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'ID document requis' },
        { status: 400 }
      );
    }

    // Find document
    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    // Check permission (only owner or admin can delete)
    if (userId && document.ownerId !== userId) {
      const share = await db.documentShare.findFirst({
        where: { documentId, userId, permission: 'admin' }
      });
      if (!share) {
        return NextResponse.json(
          { success: false, error: 'Non autorisé' },
          { status: 403 }
        );
      }
    }

    // Delete document versions first
    await db.documentVersion.deleteMany({ where: { documentId } });
    
    // Delete shares
    await db.documentShare.deleteMany({ where: { documentId } });
    
    // Delete document
    await db.document.delete({ where: { id: documentId } });

    return NextResponse.json({
      success: true,
      message: 'Document supprimé'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
