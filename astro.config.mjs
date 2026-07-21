// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

/**
 * النشر على GitHub Pages من مستودع مشروع (project repo).
 *
 * الموقع النهائي:  https://ddbb44-sudo.github.io/tafsir-alyouni/
 *
 * ── كيف تنقل المشروع لاحقًا؟ (اقرأ ARCHITECTURE.md §Deployment) ─────────
 * 1) إلى مستودع الجذر  ddbb44-sudo.github.io  →  احذف سطر `base` فقط.
 * 2) إلى نطاق مخصص     example.com            →  اجعل site: 'https://example.com'
 *                                                 واحذف سطر `base`.
 * لا تكتب المسار '/tafsir-alyouni' يدويًا في أي مكان آخر في المشروع؛
 * استخدم دائمًا الدالة `withBase()` من src/utils/paths.ts حتى ينجح النقل بتغيير هذا الملف وحده.
 * ────────────────────────────────────────────────────────────────────────
 */
export default defineConfig({
  site: 'https://ddbb44-sudo.github.io',
  base: '/tafsir-alyouni',
  trailingSlash: 'ignore',
  integrations: [mdx(), sitemap()],
  markdown: { syntaxHighlight: false },
  build: { format: 'directory' },
});
