export function getStoredRecentEmojis(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem('noc_recent_emojis');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 24)
      : [];
  } catch {
    return [];
  }
}

export function mergeRecentEmojis(recentEmojis: string[], emoji: string): string[] {
  return [emoji, ...recentEmojis.filter((item) => item !== emoji)].slice(0, 24);
}