import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * مجموعة التفاسير.
 *
 * كل صفحة = مجلد داخل src/content/tafsir/<slug>/ يحوي:
 *   meta.json  (إلزامي)  · summary.mdx · topics.mdx · full-text.mdx (اختيارية)
 *
 * الاكتشاف تلقائي: أضف المجلد فيظهر في الموقع والقائمة دون تسجيل يدوي.
 * أي خطأ في meta.json يوقف البناء برسالة واضحة بدل صفحة مكسورة.
 */
const tafsir = defineCollection({
  loader: glob({
    pattern: '*/meta.json',
    base: './src/content/tafsir',
    generateId: ({ entry }) => entry.split('/')[0], // al-fatiha/meta.json → al-fatiha
  }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    slug: z.string(),
    order: z.number(),
    source: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    ogImage: z.string().nullable().optional(),
    legacyUrls: z.array(z.string()).default([]),
    /** الأقسام الموجودة فعليًا لهذه الصفحة (احذف ما لا يوجد) */
    sections: z.array(z.enum(['summary', 'topics', 'full-text'])).default(['summary', 'topics', 'full-text']),
    /**
     * عناوين الأقسام الثلاثة كما تظهر في الصفحة.
     * تنبيه: هذه غير عناوين شريط التنقل في `anchors` — قد تختلف عمدًا
     * (مثال الفاتحة: عنوان القسم "مختصر التفسير" بينما زر التنقل "البداية").
     */
    parts: z.record(z.string(), z.string()).default({}),
    /** روابط شريط التنقل الداخلي، بالترتيب */
    anchors: z.array(z.object({
      id: z.string(),
      label: z.string(),
      /** مراسي قديمة يجب أن تظل تعمل */
      legacy: z.array(z.string()).default([]),
    })).default([]),
    /** ميزات اختيارية موجودة في الصفحة الأصلية */
    features: z.object({
      copyFullText: z.boolean().default(false),
      linguisticDetails: z.boolean().default(false),
    }).default({ copyFullText: false, linguisticDetails: false }),
  }),
});

export const collections = { tafsir };
