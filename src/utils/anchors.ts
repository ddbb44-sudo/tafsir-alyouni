/**
 * المراسي (anchors).
 *
 * القاعدة: المراسي الجديدة موحّدة  →  part-1 / part-2 / part-3 و cat-*
 * والمراسي القديمة تبقى تعمل عبر عناصر مخفية (legacy aliases) حتى لا تنكسر
 * أي روابط منشورة سابقًا مثل  …/alBaqrah_last/#part3
 */

export const CANONICAL_PARTS = ['part-1', 'part-2', 'part-3'] as const;
export type CanonicalPart = (typeof CANONICAL_PARTS)[number];

/** يحوّل أي صيغة قديمة إلى الصيغة المعتمدة. */
export function canonicalAnchor(id: string): string {
  const m = /^part-?([0-9]+)$/.exec(id);
  if (m) return `part-${m[1]}`;
  if (/^(sec|cat)-/.test(id)) return id.replace(/^sec-/, 'cat-');
  return id;
}

/** يعطي قائمة المراسي القديمة التي يجب إبقاؤها كأسماء بديلة لمرسى معتمد. */
export function legacyAliasesFor(canonical: string, declared: string[] = []): string[] {
  const out = new Set(declared);
  const m = /^part-([0-9]+)$/.exec(canonical);
  if (m) out.add(`part${m[1]}`);          // part-1 → part1
  if (canonical.startsWith('cat-')) {
    out.add(canonical.replace(/^cat-/, 'sec-')); // cat-x → sec-x
    out.add(canonical.replace(/^cat-/, ''));     // cat-x → x
  }
  out.delete(canonical);
  return [...out];
}
