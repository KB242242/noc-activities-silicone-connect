import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function isValidTarget(value: string): boolean {
  // Accept IP or host-like values only (no shell operators).
  return /^[a-zA-Z0-9.-]+$/.test(value);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    if (!target) {
      return NextResponse.json({ success: false, error: 'target est obligatoire.' }, { status: 400 });
    }

    if (!isValidTarget(target)) {
      return NextResponse.json({ success: false, error: 'target invalide.' }, { status: 400 });
    }

    const command = process.platform === 'win32' ? `tracert -d -h 15 ${target}` : `traceroute -n -m 15 ${target}`;
    const { stdout, stderr } = await execAsync(command, { timeout: 20000, windowsHide: true });

    return NextResponse.json({
      success: true,
      target,
      output: stdout,
      errors: stderr || null,
    });
  } catch (error) {
    console.error('NOC traceroute error:', error);
    return NextResponse.json(
      { success: false, error: 'Echec traceroute.' },
      { status: 500 }
    );
  }
}
