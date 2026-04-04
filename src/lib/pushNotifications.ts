import { promises as fs } from 'fs';
import path from 'path';
import webpush from 'web-push';

type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type StoredPushSubscription = {
  userId: string;
  subscription: {
    endpoint: string;
    expirationTime: number | null;
    keys: PushSubscriptionKeys;
  };
  createdAt: string;
  updatedAt: string;
};

type VapidKeys = {
  publicKey: string;
  privateKey: string;
};

const dataDir = path.join(process.cwd(), 'data');
const subscriptionsPath = path.join(dataDir, 'push-subscriptions.json');
const vapidKeysPath = path.join(dataDir, 'vapid-keys.json');

let vapidConfigured = false;

async function ensureJsonFile<T>(filePath: string, fallback: T) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureJsonFile(filePath, fallback);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, value: T) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

async function getOrCreateVapidKeys(): Promise<VapidKeys> {
  const envPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (envPublicKey && envPrivateKey) {
    return {
      publicKey: envPublicKey,
      privateKey: envPrivateKey,
    };
  }

  const existingKeys = await readJsonFile<VapidKeys | null>(vapidKeysPath, null);
  if (existingKeys?.publicKey && existingKeys?.privateKey) {
    return existingKeys;
  }

  const generatedKeys = webpush.generateVAPIDKeys();
  await writeJsonFile(vapidKeysPath, generatedKeys);
  return generatedKeys;
}

async function ensureVapidConfigured() {
  if (vapidConfigured) return;
  const keys = await getOrCreateVapidKeys();
  webpush.setVapidDetails('mailto:noreply@silicone-connect.local', keys.publicKey, keys.privateKey);
  vapidConfigured = true;
}

export async function getPushPublicKey() {
  const keys = await getOrCreateVapidKeys();
  return keys.publicKey;
}

export async function savePushSubscription(
  userId: string,
  subscription: StoredPushSubscription['subscription']
) {
  const subscriptions = await readJsonFile<StoredPushSubscription[]>(subscriptionsPath, []);
  const now = new Date().toISOString();
  const existingIndex = subscriptions.findIndex(
    (entry) => entry.userId === userId && entry.subscription.endpoint === subscription.endpoint
  );

  if (existingIndex >= 0) {
    subscriptions[existingIndex] = {
      ...subscriptions[existingIndex],
      subscription,
      updatedAt: now,
    };
  } else {
    subscriptions.push({
      userId,
      subscription,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeJsonFile(subscriptionsPath, subscriptions);
}

export async function removePushSubscription(userId: string, endpoint?: string) {
  const subscriptions = await readJsonFile<StoredPushSubscription[]>(subscriptionsPath, []);
  const filtered = subscriptions.filter((entry) => {
    if (entry.userId !== userId) return true;
    if (!endpoint) return false;
    return entry.subscription.endpoint !== endpoint;
  });
  await writeJsonFile(subscriptionsPath, filtered);
}

export async function sendPushNotification(userIds: string[], payload: Record<string, unknown>) {
  await ensureVapidConfigured();

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) return;

  const subscriptions = await readJsonFile<StoredPushSubscription[]>(subscriptionsPath, []);
  const targets = subscriptions.filter((entry) => uniqueUserIds.includes(entry.userId));
  if (targets.length === 0) return;

  const staleEndpoints = new Set<string>();

  await Promise.all(
    targets.map(async (entry) => {
      try {
        await webpush.sendNotification(entry.subscription as webpush.PushSubscription, JSON.stringify(payload));
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          staleEndpoints.add(entry.subscription.endpoint);
          return;
        }
        console.error('push notification error:', error);
      }
    })
  );

  if (staleEndpoints.size > 0) {
    const filtered = subscriptions.filter(
      (entry) => !staleEndpoints.has(entry.subscription.endpoint)
    );
    await writeJsonFile(subscriptionsPath, filtered);
  }
}