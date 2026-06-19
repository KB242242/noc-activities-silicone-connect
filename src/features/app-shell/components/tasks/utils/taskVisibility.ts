export type TaskVisibility = 'public' | 'private';

const VISIBILITY_TAG_PREFIX = 'visibility:';

export function getTaskVisibilityFromTags(tags: string[] | null | undefined): TaskVisibility {
  if (!Array.isArray(tags)) return 'public';

  const visibilityTag = tags.find((tag) => String(tag).trim().toLowerCase().startsWith(VISIBILITY_TAG_PREFIX));
  if (!visibilityTag) return 'public';

  const [, ...rest] = visibilityTag.split(':');
  const value = rest.join(':').trim().toLowerCase();
  return value === 'private' ? 'private' : 'public';
}

export function setTaskVisibilityTag(tags: string[] | null | undefined, visibility: TaskVisibility): string[] {
  const baseTags = Array.isArray(tags) ? tags : [];
  const cleaned = baseTags.filter((tag) => !String(tag).trim().toLowerCase().startsWith(VISIBILITY_TAG_PREFIX));
  return [...cleaned, `${VISIBILITY_TAG_PREFIX}${visibility}`];
}

export function isTaskVisibleToUser(
  task: { userId?: string; tags?: string[] | null },
  currentUserId?: string
): boolean {
  const visibility = getTaskVisibilityFromTags(task.tags);
  if (visibility === 'public') return true;
  return Boolean(currentUserId && task.userId === currentUserId);
}
