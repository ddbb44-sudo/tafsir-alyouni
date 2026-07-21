/**
 * withBase — الطريقة الوحيدة المسموحة لبناء الروابط الداخلية.
 *
 * السبب: الموقع منشور تحت مسار فرعي (/tafsir-alyouni). لو كتبتَ الروابط يدويًا
 * فستنكسر عند نقل المشروع. استخدم withBase('/tafsir/al-fatiha') دائمًا.
 * عند النقل إلى الجذر أو نطاق مخصص يكفي حذف `base` من astro.config.mjs.
 */
const BASE = import.meta.env.BASE_URL; // ينتهي بـ "/" أو يساويها

export function withBase(path = '/'): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const base = BASE.endsWith('/') ? BASE : BASE + '/';
  return (base + clean).replace(/\/+$/, '') || '/';
}

/** رابط مطلق كامل — يُستعمل في canonical و Open Graph والخريطة. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  const origin = site ? site.origin : 'https://ddbb44-sudo.github.io';
  return origin + withBase(path);
}
