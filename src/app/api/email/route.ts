import { NextRequest, NextResponse } from 'next/server';

// Email API route using Resend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text } = body;

    // Get API key from environment
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured in .env file');
      return NextResponse.json(
        { error: 'Email service not configured. Please add RESEND_API_KEY to .env file.' },
        { status: 500 }
      );
    }

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NOC Activities <noreply@siliconeconnect.com>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || text || '',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Resend API error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send email' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      id: data.id,
    });
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test email configuration
export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  return NextResponse.json({
    configured: !!apiKey,
    message: apiKey
      ? 'Email service is configured'
      : 'Email service is not configured. Add RESEND_API_KEY to .env file.',
  });
}
