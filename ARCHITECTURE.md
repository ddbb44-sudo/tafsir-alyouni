# ARCHITECTURE.md — بنية المشروع

## لماذا هذه البنية؟

الصفحات القديمة كانت ست نسخ مستقلة، كل صفحة ملف HTML واحد بحجم ‎70–133 كيلوبايت‎ يجمع
المحتوى والتنسيق والسكربتات معًا. تغيير الترويسة كان يعني ست تعديلات في ستة مستودعات،
وقراءة النص الديني كاملًا للوصول إلى عشرة أسطر من CSS.

هنا: **تخطيط واحد، ترويسة واحدة، تذييل واحد، نظام ألوان واحد، ومحتوى منفصل تمامًا عن التصميم.**

---

## ١. الشجرة

```
tafsir-alyouni/
├── src/
│   ├── layouts/TafsirLayout.astro        التخطيط المشترك لكل صفحات التفسير
│   ├── components/
│   │   ├── layout/                       BaseHead · SiteShell · Header · Footer
│   │   │                                 MenuButton · MenuDrawer
│   │   ├── reader/                       ThemeScript · ThemeToggle · FontSizeControl
│   │   │                                 DetailsToggle · CopyTextButton
│   │   │                                 ReaderControls · InternalPageNav
│   │   ├── tafsir/                       TafsirSection · FullTextSection · TopicCard
│   │   │                                 QuranBlock · Ayah · Note · LinguisticDetails
│   │   │                                 TafsirPageHeader · PageNavigation
│   │   └── ui/                           Container · Card · Button · Divider
│   │                                     SectionTitle · TopicTitle
│   ├── content/tafsir/<slug>/            meta.json + summary/topics/full-text .mdx
│   ├── content.config.ts                 مخطط التحقق (Zod) + الاكتشاف التلقائي
│   ├── data/                             site.ts · navigation.ts
│   ├── styles/                           tokens · global · typography · reader
│   ├── pages/                            index.astro · 404.astro · tafsir/[slug].astro
│   └── utils/                            paths.ts · anchors.ts · seo.ts
├── scripts/                              extract-page.mjs · verify-content.mjs · lib/parse.mjs
├── public/                               robots.txt · icons · images
└── .github/workflows/deploy.yml          نشر تلقائي إلى GitHub Pages
```

---

## ٢. نظام التصميم

كل قيمة بصرية معرّفة مرة واحدة في `src/styles/tokens.css`:

- **الألوان:** `--bg-body` `--bg-surface` `--bg-card` `--text-main` `--text-secondary`
  `--border-color` `--quran-red` `--quran-blue` `--divider` `--shadow-card`
- **الخطوط:** `--font-ui` (IBM Plex Sans Arabic) · `--font-quran` (Amiri)
- **المقاسات:** `--size-h1` … `--size-nav` وكلها مضروبة في `--font-scale`
- **المسافات والحواف والظلال:** `--space-*` `--radius-*`
- **الوضع الليلي:** كتلة `.dark` تعيد تعريف الألوان فقط

القيم منقولة حرفيًا من الصفحات الأصلية، فالشكل النهائي مطابق.

**قاعدة:** لا لون ولا مقاس مكتوب مباشرة داخل مكوّن. إن احتجت قيمة جديدة فأضِف متغيرًا في `tokens.css`.

**فارق مقصود عن الأصل:** الصفحات القديمة كانت تحمّل Tailwind من CDN وقت التشغيل
(بطء + وميض + غير موصى به للإنتاج). هنا التنسيق CSS عادي مبني وقت البناء، والنتيجة البصرية نفسها.

---

## ٣. نموذج المحتوى

كل صفحة = مجلد:

```
src/content/tafsir/al-fatiha/
├── meta.json        بيانات الصفحة (يتحقق منها Zod وقت البناء)
├── summary.mdx      القسم ١ — مختصر التفسير
├── topics.mdx       القسم ٢ — التصنيف الموضوعي
└── full-text.mdx    القسم ٣ — النص كاملًا
```

### حقول `meta.json`

| الحقل | الوصف |
|---|---|
| `title` / `shortTitle` | العنوان الكامل والمختصر (المختصر يظهر في القائمة) |
| `slug` | جزء الرابط: `/tafsir/<slug>` |
| `order` | ترتيب الظهور في القائمة والتنقل السابق/التالي |
| `source` | المصدر — الشيخ سليمان العيوني |
| `seoTitle` / `seoDescription` | بيانات محركات البحث |
| `ogImage` | صورة المشاركة أو `null` |
| `legacyUrls` | الروابط المنشورة قديمًا (توثيق + خطة إعادة التوجيه) |
| `sections` | الأقسام الموجودة فعلًا — احذف ما لا يوجد |
| `parts` | عناوين الأقسام كما تظهر في الصفحة |
| `anchors` | أزرار شريط التنقل + المراسي القديمة |
| `features` | `copyFullText` · `linguisticDetails` |

⚠️ `parts` و `anchors` **مختلفان عمدًا**: في الفاتحة عنوان القسم «مختصر التفسير» بينما زر
التنقل «البداية». هكذا كانت الصفحة الأصلية، وقد حوفظ عليه.

### الاكتشاف التلقائي

`src/content.config.ts` يستخدم `glob({ pattern: '*/meta.json' })`. أضِف مجلدًا فيظهر تلقائيًا في:
الفهرس، وقائمة التنقل، والتنقل السابق/التالي، وخريطة الموقع. **لا سجل يدوي.**
وأي خطأ في `meta.json` يوقف البناء برسالة واضحة بدل صفحة مكسورة.

---

## ٤. التخطيط

```
SiteShell            <html dir="rtl"> + <head> + التذييل + قائمة السور
 └── TafsirLayout    الشريط العلوي + الحاوية + التنقل بين السور
      └── [slug].astro
           ├── TafsirSection#part-1   ← summary.mdx
           ├── TafsirSection#part-2   ← topics.mdx
           └── FullTextSection#part-3 ← full-text.mdx
```

`[slug].astro` يحمّل أجزاء المحتوى عبر `import.meta.glob`، ويتخطّى أي قسم غير مذكور في `sections`.

---

## ٥. أدوات القارئ

| الأداة | التخزين | السلوك |
|---|---|---|
| المظهر | — (بلا تخزين) | يتبع إعداد الجهاز فقط عبر `@media (prefers-color-scheme: dark)` في `tokens.css`. **لا مبدّل يدوي ولا حفظ.** يتغيّر فورًا مع تغيّر إعداد النظام. |
| حجم الخط | `localStorage.fontScale` | ‎0.8–1.4‎ بخطوة ‎0.1‎ عبر `--font-scale` |
| التفاصيل اللغوية | `localStorage.detailsOpen` | فتح/إغلاق كل عناصر `<details>` |
| نسخ النص | — | Clipboard API مع بديل `execCommand` |
| تظليل القسم الحالي | — | `IntersectionObserver` بالهوامش الأصلية نفسها |

**المظهر بلا أي JavaScript.** التبديل يتم بـ CSS وحدها، فلا وميض عند التحميل ولا سكربت
يعمل قبل الرسم. وأُضيف `<meta name="color-scheme" content="light dark">` لتتبع عناصر
المتصفح الأصلية (أشرطة التمرير، الحقول) إعداد الجهاز أيضًا.

**قرار المالك:** لا مبدّل يدوي. الجهاز وحده يقرر المظهر.

---

## ٦. المراسي وحماية الروابط القديمة

الصيغة المعتمدة `part-1/2/3` و `cat-*`. والصفحات القديمة استعملت أربع صيغ مختلفة
(`part1`، `sec-*`، وبلا بادئة). لذلك تُولَّد **مراسي بديلة مخفية** تلقائيًا:

```
part-1  →  part1
cat-x   →  sec-x  و  x
```

عنصر `<span class="legacy-anchor">` بلا ارتفاع ولا ظهور، لكنه هدف صالح للتمرير.
النتيجة: `#part3` و `#meanings` و `#sec-virtues` تظل تعمل.

---

## ٧. السيو

`BaseHead.astro` يولّد: العنوان، الوصف، `canonical`، Open Graph، Twitter card،
و `lang="ar" dir="rtl"`. وخريطة الموقع عبر `@astrojs/sitemap`، و `robots.txt` في `public/`.

الصفحات القديمة لم يكن فيها أي وصف ولا canonical ولا Open Graph — فهذه إضافة صافية.

---

## ٨. النشر

```bash
npm install
npm run dev        # معاينة محلية على http://localhost:4321/tafsir-alyouni/
npm run build      # ينتج dist/
npm run preview
```

**GitHub Pages:** ادفع إلى `main` في مستودع باسم `tafsir-alyouni`، ثم
Settings → Pages → Source = **GitHub Actions**. سيتكفّل `.github/workflows/deploy.yml` بالباقي.

الناتج: `https://ddbb44-sudo.github.io/tafsir-alyouni/`

### تغيير مسار النشر لاحقًا

كل الروابط تمر عبر `withBase()`، فالنقل يحتاج تعديل `astro.config.mjs` وحده:

| الوجهة | التعديل |
|---|---|
| مستودع الجذر `ddbb44-sudo.github.io` | **احذف سطر `base`** فقط |
| نطاق مخصص `example.com` | `site: 'https://example.com'` + **احذف `base`** + أضِف ملف `public/CNAME` |

وحدّث كذلك رابط الخريطة في `public/robots.txt`.

---

## ٩. منهج الترحيل

1. `scripts/extract-page.mjs` يحوّل الصفحة القديمة إلى MDX عبر **جدول تحويل صريح**.
   أي تركيبة غير معروفة **توقف السكربت** بدل تخمينها أو حذفها بصمت.
2. `scripts/verify-content.mjs` يقارن نص الصفحة الأصلية بنص الملفات الناتجة حرفًا بحرف
   (بعد توحيد المسافات فقط). أي فرق يوقف الترحيل.
3. مراجعة بصرية ثم موافقة المالك، صفحة صفحة.

انظر `MIGRATION_REPORT.md` لحالة كل صفحة.
