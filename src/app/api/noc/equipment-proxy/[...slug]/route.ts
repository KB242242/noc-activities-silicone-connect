import { NextRequest, NextResponse } from 'next/server';

const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

function buildRedirectUrl(request: NextRequest, slug: string[]): URL {
  const ip = slug[0] ?? '';
  const path = slug.length > 1 ? `/${slug.slice(1).join('/')}` : '/';
  const url = new URL('/api/noc/equipment-proxy', request.url);
  url.searchParams.set('ip', ip);
  url.searchParams.set('path', path);

  const query = request.nextUrl.searchParams.toString();
  if (query) {
    url.searchParams.set('q', query);
  }

  return url;
}

function validate(slug: string[]): string | null {
  const ip = slug[0] ?? '';
  if (!IP_RE.test(ip)) return null;
  return ip;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const ip = validate(slug);
  if (!ip) {
    return NextResponse.json({ error: 'IP invalide.' }, { status: 400 });
  }

  return NextResponse.redirect(buildRedirectUrl(request, slug), 307);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const ip = validate(slug);
  if (!ip) {
    return NextResponse.json({ error: 'IP invalide.' }, { status: 400 });
  }

  const response = await fetch(buildRedirectUrl(request, slug), {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
    },
    body: await request.arrayBuffer(),
    cache: 'no-store',
  });

  const headers = new Headers();
  headers.set('Content-Type', response.headers.get('content-type') ?? 'text/html');
  headers.set('Cache-Control', 'no-cache, no-store');

  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers,
  });
}
