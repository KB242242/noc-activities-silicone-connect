import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const category = String(form.get('category') ?? 'other').toLowerCase();

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Fichier obligatoire.' }, { status: 400 });
    }

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Format non supporte. Autorises: PDF, JPG, PNG, WEBP.' },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), 'public', 'upload', 'noc-documents', category);
    await mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || (file.type === 'application/pdf' ? '.pdf' : '.bin');
    const base = sanitizeName(path.basename(file.name, ext));
    const fileName = `${base}-${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    const absolutePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(absolutePath, buffer);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      mimeType: file.type,
      fileUrl: `/upload/noc-documents/${category}/${fileName}`,
      category,
    });
  } catch (error) {
    console.error('NOC client-documents upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible de televerser le document.' },
      { status: 500 }
    );
  }
}
