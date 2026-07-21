# NEW_PAGE_GUIDE.md — كيف تضيف صفحة تفسير جديدة

الهدف: إضافة صفحة كاملة **دون نسخ أي كود تخطيط أو تصميم**. الخطوات كلها في مجلد واحد.

---

## الخطوة ١ — أنشئ المجلد

اسم المجلد هو الـ `slug` أي جزء الرابط. استعمل حروفًا لاتينية صغيرة وشرطات:

```
src/content/tafsir/al-kahf/
```

أمثلة معتمدة: `al-fatiha` · `ayat-al-kursi` · `al-ikhlas` · `al-baqara-last` · `al-falaq` · `al-nas`

---

## الخطوة ٢ — اكتب `meta.json`

```json
{
  "title": "تفسير سورة الكهف",
  "shortTitle": "الكهف",
  "slug": "al-kahf",
  "order": 7,
  "source": "الشيخ سليمان العيوني",
  "seoTitle": "تفسير سورة الكهف - الشيخ سليمان العيوني",
  "seoDescription": "صفحة مرتّبة لتفسير سورة الكهف.",
  "ogImage": null,
  "legacyUrls": [],
  "sections": ["summary", "topics", "full-text"],
  "parts": {
    "part-1": "مختصر التفسير",
    "part-2": "التصنيف الموضوعي",
    "part-3": "النص كاملًا"
  },
  "anchors": [
    { "id": "part-1", "label": "البداية", "legacy": ["part1"] },
    { "id": "cat-meanings", "label": "المعاني", "legacy": [] },
    { "id": "part-3", "label": "النص كاملًا", "legacy": ["part3"] }
  ],
  "features": { "copyFullText": true, "linguisticDetails": false }
}
```

ملاحظات:

- `order` يحدد الترتيب في القائمة. اجعله فريدًا.
- `parts` عناوين الأقسام، و `anchors` أزرار شريط التنقل — **وقد تختلفان عمدًا**.
- `legacy` للروابط المنشورة سابقًا فقط. اتركه `[]` للصفحات الجديدة.
- `features` فعّل ما تحتاجه فقط.

أي خطأ هنا يوقف البناء برسالة واضحة. هذا مقصود.

---

## الخطوة ٣ — قسّم المحتوى إلى ثلاثة ملفات

`summary.mdx` — مختصر التفسير:

```mdx
import TafsirCard from '../../../components/ui/Card.astro';
import SectionTitle from '../../../components/ui/SectionTitle.astro';
import QuranBlock from '../../../components/tafsir/QuranBlock.astro';

<TafsirCard>
  <QuranBlock>﴿ … ﴾</QuranBlock>
  <SectionTitle level={4}>معاني الكلمات</SectionTitle>
  <ul>
    <li><strong>الكلمة:</strong> معناها.</li>
  </ul>
</TafsirCard>
```

`topics.mdx` — التصنيف الموضوعي:

```mdx
import TopicCard from '../../../components/tafsir/TopicCard.astro';

<TopicCard id="cat-meanings" title="المعاني">
  <ul>
    <li><strong>الكلمة:</strong> معناها.</li>
  </ul>
</TopicCard>
```

`full-text.mdx` — النص كاملًا:

```mdx
import TafsirCard from '../../../components/ui/Card.astro';
import TopicTitle from '../../../components/ui/TopicTitle.astro';

<TafsirCard variant="compact">
  <TopicTitle>مقدمة</TopicTitle>
  <p>…</p>
</TafsirCard>
```

**قسم غير موجود؟** احذف اسمه من `sections` ولا تنشئ الملف. اقرأ `CONTENT_GUIDE.md` §١.

**ترحيل صفحة قديمة؟** لا تنسخ يدويًا — استعمل الأداة:

```bash
node scripts/extract-page.mjs ../_sources/<REPO>/index.html <slug>
node scripts/verify-content.mjs ../_sources/<REPO>/index.html <slug>
```

إن توقفت الأداة عند تركيبة غير معروفة فهذا مقصود: أضِفها إلى `MAP` في `extract-page.mjs`
ثم أعِد التشغيل. **لا تتجاوز الخطأ ولا تعطّل الفحص.**

---

## الخطوة ٤ — احفظ المراسي

- استعمل `part-1/2/3` و `cat-*` دائمًا للصفحات الجديدة.
- إن كانت الصفحة منشورة سابقًا بمراسٍ مختلفة، ضعها في `legacy` لتظل الروابط تعمل.
- الأسماء البديلة (`part1`, `sec-x`, `x`) تُولَّد تلقائيًا — لا تكتبها يدويًا.

---

## الخطوة ٥ — أضِفها إلى التنقل

**لا شيء تفعله.** الاكتشاف تلقائي: الفهرس، وقائمة السور، والتنقل السابق/التالي،
وخريطة الموقع — كلها تقرأ من مجلدات `src/content/tafsir/` مرتّبة بـ `order`.

---

## الخطوة ٦ — السيو

يكفي `seoTitle` و `seoDescription` في `meta.json`. أما `canonical` و Open Graph و
`lang="ar" dir="rtl"` وخريطة الموقع فتُولَّد تلقائيًا.

لصورة مشاركة: ضع الملف في `public/images/` واكتب `"ogImage": "/images/al-kahf.png"`.

---

## الخطوة ٧ — المعاينة المحلية

```bash
npm install          # أول مرة فقط
npm run dev
```

افتح `http://localhost:4321/tafsir-alyouni/tafsir/al-kahf` وتحقق من:

- [ ] النص العربي كامل وبلا رموز غريبة
- [ ] الاتجاه من اليمين إلى اليسار
- [ ] أزرار شريط التنقل تنقلك للمكان الصحيح
- [ ] الوضع الليلي يعمل
- [ ] أزرار حجم الخط تعمل
- [ ] الشكل سليم على شاشة الجوال
- [ ] الروابط القديمة `#part1` تعمل إن وُجدت

---

## الخطوة ٨ — النشر

```bash
npm run build        # يجب أن ينجح
git add .
git commit -m "add: تفسير سورة الكهف"
git push origin main
```

يتكفّل `.github/workflows/deploy.yml` بالبناء والنشر. أول مرة فقط:
Settings → Pages → Source = **GitHub Actions**.

---

## الخطوة ٩ — ما الذي لا تعدّله؟

| لا تعدّل | لماذا |
|---|---|
| `src/layouts/` و `src/components/` | لإضافة صفحة لا تحتاج لمسها |
| `src/styles/` | إلا لتغيير التصميم كله |
| `astro.config.mjs` | يكسر الروابط |
| `scripts/` | أدوات الترحيل والتحقق |
| `_sources/` | مرجع للقراءة فقط |

إن وجدت نفسك تنسخ كودًا من صفحة أخرى — **توقف**. هذا يعني أن ما تحتاجه ينبغي أن يكون مكوّنًا مشتركًا.

---

## الخطوة ١٠ — كيف تطلب من Claude/Codex تعديلًا آمنًا؟

كن محددًا في **الملف** و**المطلوب**، وانصّ على عدم المساس بالنص:

> في `src/content/tafsir/al-kahf/topics.mdx` أضِف بطاقة تصنيف جديدة `cat-fiqh` بعنوان «الفوائد الفقهية».
> لا تعدّل أي نص عربي موجود. سجّل المرسى في `meta.json`. ثم شغّل `npm run build`.

> غيّر اللون الأحمر للآيات في الوضع الليلي في `src/styles/tokens.css` فقط.
> لا تفتح ملفات المحتوى.

صيغ يُنصح بتجنّبها:

- «رتّب الصفحة» → غامضة، وقد تشمل النص.
- «حسّن الصياغة» → ممنوعة.
- «وحّد العناوين بين السور» → التصنيفات مختلفة عمدًا.

اطلب دائمًا في النهاية: `npm run build` و `npm run verify:content`.
