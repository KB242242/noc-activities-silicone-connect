import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageName = searchParams.get('name');
  
  if (!imageName) {
    return NextResponse.json({ error: 'Image name required' }, { status: 400 });
  }
  
  // Sécurité : n'autoriser que certains noms d'images
  const allowedImages = ['logo_background.png', 'barre_titre_heures_sup.png'];
  if (!allowedImages.includes(imageName)) {
    return NextResponse.json({ error: 'Image not allowed' }, { status: 403 });
  }
  
  try {
    const imagePath = path.join(process.cwd(), 'public', imageName);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const mimeType = imageName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    return NextResponse.json({
      base64: `data:${mimeType};base64,${base64}`,
      success: true
    });
  } catch (error) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
