import { getCollection } from 'astro:content';

/**
 * ترتيب صفحات التفسير للقائمة الجانبية والتنقل السابق/التالي.
 * المصدر هو حقل `order` في meta.json — لا حاجة لتسجيل الصفحات هنا يدويًا.
 */
export async function getTafsirPages() {
  const entries = await getCollection('tafsir');
  return entries
    .map((e) => e.data)
    .sort((a, b) => a.order - b.order);
}

export async function getNeighbours(slug: string) {
  const pages = await getTafsirPages();
  const i = pages.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? pages[i - 1] : null,
    next: i >= 0 && i < pages.length - 1 ? pages[i + 1] : null,
  };
}
