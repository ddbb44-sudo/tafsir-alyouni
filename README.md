# تفاسير الشيخ سليمان العيوني

موقع ثابت موحّد يجمع صفحات التفسير في مشروع واحد، بدل ست صفحات HTML منفصلة.

**الموقع:** https://ddbb44-sudo.github.io/tafsir-alyouni/

---

## التشغيل

```bash
npm install
npm run dev        # http://localhost:4321/tafsir-alyouni/
npm run build
npm run preview
```

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم التطوير |
| `npm run build` | بناء الموقع في `dist/` |
| `npm run check` | فحص الأنواع |
| `npm run verify:content -- <index.html> <slug>` | التأكد أن النص العربي لم يتغيّر |

---

## البنية باختصار

```
src/content/tafsir/<slug>/   المحتوى (meta.json + ثلاثة ملفات MDX)
src/styles/tokens.css        كل الألوان والمقاسات
src/components/              الترويسة والتذييل وأدوات القارئ
src/layouts/                 التخطيط المشترك
scripts/                     أدوات الترحيل والتحقق
_sources/ (خارج المشروع)     المستودعات القديمة — للقراءة فقط
```

---

## الوثائق

| الملف | لمن؟ |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | **للمساعد الذكي — يُقرأ أولًا** |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | بنية المشروع ونظام التصميم والنشر |
| [`CONTENT_GUIDE.md`](./CONTENT_GUIDE.md) | قواعد كتابة المحتوى وحفظ النص |
| [`NEW_PAGE_GUIDE.md`](./NEW_PAGE_GUIDE.md) | إضافة صفحة جديدة خطوة بخطوة |
| [`MIGRATION_REPORT.md`](./MIGRATION_REPORT.md) | حالة ترحيل كل صفحة |

---

## تنبيه

النصوص في `src/content/` منقولة حرفيًا من دروس الشيخ سليمان العيوني.
**لا يجوز تعديلها أو تلخيصها أو تصحيحها** — اقرأ `AGENTS.md` قبل أي تعديل.

---

## النشر

ادفع إلى `main`، ثم Settings → Pages → Source = **GitHub Actions**.
التفاصيل وخطوات تغيير مسار النشر في `ARCHITECTURE.md` §٨.
