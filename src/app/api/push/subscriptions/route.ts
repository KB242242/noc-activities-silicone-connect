import { NextRequest, NextResponse } from 'next/server';
import {
  getPushPublicKey,
  removePushSubscription,
  savePushSubscription,
} from '@/lib/pushNotifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const publicKey = await getPushPublicKey();
    return NextResponse.json({ success: true, publicKey });
  } catch (error) {
    console.error('Error getting push public key:', error);
    return NextResponse.json({ success: false, error: 'Impossible de lire la clé push' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const subscription = body?.subscription;

    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'userId et subscription valides sont requis' },
        { status: 400 }
      );
    }

    await savePushSubscription(userId, {
      endpoint: subscription.endpoint,
      expirationTime: typeof subscription.expirationTime === 'number' ? subscription.expirationTime : null,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible de sauvegarder la souscription push' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : undefined;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId requis' }, { status: 400 });
    }

    await removePushSubscription(userId, endpoint);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Impossible de supprimer la souscription push' },
      { status: 500 }
    );
  }
}