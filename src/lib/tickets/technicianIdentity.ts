export type TechnicianIdentityCandidate = {
  id: string;
  name: string;
  email?: string | null;
  hasEmail?: boolean;
  isActive?: boolean;
  role?: string | null;
};

export type TechnicianSimilarityPair = {
  canonicalName: string;
  similarName: string;
};

function normalizeName(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmail(value: string): string {
  return String(value ?? '').trim().toLowerCase();
}

function hasValidEmail(value: string): boolean {
  return value.includes('@') && value.includes('.');
}

function tokenizeName(value: string): string[] {
  return normalizeName(value).split(' ').filter(Boolean);
}

function scoreCandidate(candidate: TechnicianIdentityCandidate): number {
  const name = String(candidate.name ?? '').trim();
  const email = normalizeEmail(String(candidate.email ?? ''));
  const tokenCount = tokenizeName(name).length;
  const role = String(candidate.role ?? '').toUpperCase();
  return (
    (candidate.isActive ? 40 : 0)
    + (hasValidEmail(email) ? 30 : 0)
    + (candidate.hasEmail ? 10 : 0)
    + (role.includes('TECHNICIEN') ? 5 : 0)
    + tokenCount
    + Math.min(name.length / 100, 1)
  );
}

function pickCanonical(
  left: TechnicianIdentityCandidate,
  right: TechnicianIdentityCandidate
): TechnicianIdentityCandidate {
  const leftScore = scoreCandidate(left);
  const rightScore = scoreCandidate(right);

  if (rightScore > leftScore) {
    return {
      ...right,
      email: right.email || left.email || null,
      hasEmail: Boolean(right.hasEmail || left.hasEmail || hasValidEmail(normalizeEmail(String(right.email ?? left.email ?? '')))),
      isActive: Boolean(right.isActive || left.isActive),
    };
  }

  return {
    ...left,
    email: left.email || right.email || null,
    hasEmail: Boolean(left.hasEmail || right.hasEmail || hasValidEmail(normalizeEmail(String(left.email ?? right.email ?? '')))),
    isActive: Boolean(left.isActive || right.isActive),
  };
}

export function areStronglySimilarNames(nameA: string, nameB: string): boolean {
  const normalizedA = normalizeName(nameA);
  const normalizedB = normalizeName(nameB);

  if (!normalizedA || !normalizedB || normalizedA === normalizedB) {
    return normalizedA === normalizedB;
  }

  const tokensA = tokenizeName(nameA);
  const tokensB = tokenizeName(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const smaller = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const larger = tokensA.length > tokensB.length ? tokensA : tokensB;

  const smallerSet = new Set(smaller);
  const largerSet = new Set(larger);
  const overlap = smaller.filter((token) => largerSet.has(token)).length;

  const oneTokenIsPrefixCase =
    smaller.length === 1
    && smaller[0].length >= 4
    && largerSet.has(smaller[0]);

  const subsetMatch = smaller.length >= 2 && smaller.every((token) => largerSet.has(token));
  const strongOverlap = overlap > 0 && overlap / Math.min(tokensA.length, tokensB.length) >= 0.75;
  const sameEdgeToken = tokensA[0] === tokensB[0] || tokensA[tokensA.length - 1] === tokensB[tokensB.length - 1];

  return oneTokenIsPrefixCase || subsetMatch || (strongOverlap && sameEdgeToken);
}

export function detectTechnicianSimilarities(
  candidates: TechnicianIdentityCandidate[]
): TechnicianSimilarityPair[] {
  const pairs: TechnicianSimilarityPair[] = [];
  const pairKeys = new Set<string>();

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const left = candidates[i];
      const right = candidates[j];
      const leftEmail = normalizeEmail(String(left.email ?? ''));
      const rightEmail = normalizeEmail(String(right.email ?? ''));

      if (leftEmail && rightEmail && leftEmail === rightEmail) {
        continue;
      }

      if (!areStronglySimilarNames(left.name, right.name)) {
        continue;
      }

      const canonical = pickCanonical(left, right);
      const similar = canonical.id === left.id ? right : left;
      const key = `${normalizeName(canonical.name)}::${normalizeName(similar.name)}`;
      if (pairKeys.has(key)) continue;
      pairKeys.add(key);

      pairs.push({
        canonicalName: String(canonical.name ?? '').trim(),
        similarName: String(similar.name ?? '').trim(),
      });
    }
  }

  return pairs;
}

export function mergeTechnicianCandidates(
  candidates: TechnicianIdentityCandidate[]
): {
  options: TechnicianIdentityCandidate[];
  similarityPairs: TechnicianSimilarityPair[];
} {
  const emailMap = new Map<string, TechnicianIdentityCandidate>();
  const byExactName = new Map<string, TechnicianIdentityCandidate>();

  for (const entry of candidates) {
    const id = String(entry.id ?? '').trim();
    const name = String(entry.name ?? '').trim();
    if (!id || !name) continue;

    const normalizedEmail = normalizeEmail(String(entry.email ?? ''));
    const candidate: TechnicianIdentityCandidate = {
      ...entry,
      id,
      name,
      email: normalizedEmail || null,
      hasEmail: Boolean(entry.hasEmail || hasValidEmail(normalizedEmail)),
      isActive: Boolean(entry.isActive),
    };

    if (hasValidEmail(normalizedEmail)) {
      const existing = emailMap.get(normalizedEmail);
      emailMap.set(normalizedEmail, existing ? pickCanonical(existing, candidate) : candidate);
      continue;
    }

    const nameKey = normalizeName(name);
    if (!nameKey) continue;
    const existing = byExactName.get(nameKey);
    byExactName.set(nameKey, existing ? pickCanonical(existing, candidate) : candidate);
  }

  const merged: TechnicianIdentityCandidate[] = [
    ...emailMap.values(),
    ...byExactName.values(),
  ].sort((a, b) =>
    String(a.name ?? '').localeCompare(String(b.name ?? ''), 'fr', { sensitivity: 'base' })
  );

  const collapsed: TechnicianIdentityCandidate[] = [];
  const collapsedPairs: TechnicianSimilarityPair[] = [];

  for (const candidate of merged) {
    const index = collapsed.findIndex((existing) => {
      const existingEmail = normalizeEmail(String(existing.email ?? ''));
      const candidateEmail = normalizeEmail(String(candidate.email ?? ''));

      if (existingEmail && candidateEmail) {
        return existingEmail === candidateEmail;
      }

      return areStronglySimilarNames(existing.name, candidate.name);
    });

    if (index === -1) {
      collapsed.push(candidate);
      continue;
    }

    const canonical = pickCanonical(collapsed[index], candidate);
    const similar = canonical.id === collapsed[index].id ? candidate : collapsed[index];
    collapsed[index] = canonical;

    collapsedPairs.push({
      canonicalName: String(canonical.name ?? '').trim(),
      similarName: String(similar.name ?? '').trim(),
    });
  }

  const finalPairs = [
    ...collapsedPairs,
    ...detectTechnicianSimilarities(collapsed),
  ];

  const uniquePairs = new Map<string, TechnicianSimilarityPair>();
  for (const pair of finalPairs) {
    const canonical = String(pair.canonicalName ?? '').trim();
    const similar = String(pair.similarName ?? '').trim();
    if (!canonical || !similar || canonical === similar) continue;
    const key = `${normalizeName(canonical)}::${normalizeName(similar)}`;
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { canonicalName: canonical, similarName: similar });
    }
  }

  return {
    options: collapsed.sort((a, b) =>
      String(a.name ?? '').localeCompare(String(b.name ?? ''), 'fr', { sensitivity: 'base' })
    ),
    similarityPairs: Array.from(uniquePairs.values()),
  };
}
