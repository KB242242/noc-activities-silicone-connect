import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const zipPath = path.join(process.cwd(), 'download', 'NOC_Activities_Project.zip');
    
    if (!existsSync(zipPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await readFile(zipPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="NOC_Activities_Project.zip"',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to download' }, { status: 500 });
  }
}
