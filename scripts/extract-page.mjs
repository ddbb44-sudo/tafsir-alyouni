/**
 * extract-page.mjs — يحوّل صفحة HTML قديمة إلى ملفات MDX دون المساس بالنص العربي.
 *
 * المبدأ: كل عنصر غير معروف يوقف التحويل برسالة واضحة بدل تخمينه أو حذفه.
 * الاستخدام:
 *   node scripts/extract-page.mjs <مسار index.html> <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, textOf, cls } from './lib/parse.mjs';

const [srcPath, slug] = process.argv.slice(2);
if (!srcPath || !slug) { console.error('usage: extract-page.mjs <index.html> <slug>'); process.exit(1); }

const html = fs.readFileSync(srcPath, 'utf8');
const doc = parse(html);

const find = (node, pred) => {
  if (pred(node)) return node;
  for (const c of node.children || []) { const r = find(c, pred); if (r) return r; }
  return null;
};
const findAll = (node, pred, out = []) => {
  if (pred(node)) out.push(node);
  for (const c of node.children || []) findAll(c, pred, out);
  return out;
};

/* ─────────────────────────── جدول التحويل ───────────────────────────
   المفتاح: "tag|classes مرتبة أبجديًا"   →   دالة تُرجع {open, close} أو 'skip'
   أي تركيبة غير مذكورة هنا ستوقف السكربت. هذا مقصود.
   ------------------------------------------------------------------- */
const MAP = new Map(Object.entries({
  // بطاقات
  'div|card': () => ({ open: '<TafsirCard>', close: '</TafsirCard>' }),
  'div|card p-6': () => ({ open: '<TafsirCard variant="compact">', close: '</TafsirCard>' }),
  'div|card card-quran-main mb-12': () => ({ open: '<TafsirCard variant="quran">', close: '</TafsirCard>' }),

  // عناوين
  'h3|mt-0 section-label': () => ({ open: '<SectionTitle level={3} first>', close: '</SectionTitle>' }),
  'h3|section-label': () => ({ open: '<SectionTitle level={3}>', close: '</SectionTitle>' }),
  'h4|section-label': () => ({ open: '<SectionTitle level={4}>', close: '</SectionTitle>' }),
  'h3|border-[var(--border-color)] border-b font-bold mb-4 pb-2 text--[var(--quran-red)] text-xl': null, // placeholder

  // نصوص قرآنية ككتلة
  'span|font-quran quran-passage-text': () => ({ open: '<QuranBlock>', close: '</QuranBlock>' }),
  'span|font-quran quran-passage-text text-[var(--text-main)]': () => ({ open: '<QuranBlock tone="main">', close: '</QuranBlock>' }),
  'span|font-quran quran-support-text': () => ({ open: '<QuranBlock variant="support">', close: '</QuranBlock>' }),
  'p|font-quran': () => ({ open: '<QuranBlock variant="opening" as="p">', close: '</QuranBlock>' }),

  // اقتباس قرآني داخل السطر
  'span|font-quran text-[var(--quran-red)] text-xl': () => ({ open: '<Ayah>', close: '</Ayah>' }),
  'span|font-quran text-[var(--quran-red)]': () => ({ open: '<Ayah size="inherit">', close: '</Ayah>' }),
  'span|font-quran text-[var(--quran-blue)] text-xl': () => ({ open: '<Ayah tone="blue">', close: '</Ayah>' }),
  'span|font-quran text-[var(--text-main)] text-xl': () => ({ open: '<Ayah tone="main">', close: '</Ayah>' }),

  // نص عادي
  'p|mb-4': () => ({ open: '<p>', close: '</p>' }),
  'p|': () => ({ open: '<p>', close: '</p>' }),
  'strong|': () => ({ open: '<strong>', close: '</strong>' }),
  'strong|text-[var(--text-main)]': () => ({ open: '<strong>', close: '</strong>' }),
  'span|font-semibold': () => ({ open: '<strong>', close: '</strong>' }),
  'strong|font-semibold': () => ({ open: '<strong>', close: '</strong>' }),
  'strong|font-semibold text-xl': () => ({ open: '<strong>', close: '</strong>' }),
  'strong|font-quran text-[var(--text-main)] text-xl': () => ({ open: '<strong><Ayah tone="main">', close: '</Ayah></strong>' }),
  'span|font-semibold text-xl': () => ({ open: '<strong>', close: '</strong>' }),
  'li|': () => ({ open: '<li>', close: '</li>' }),
  'br|': () => ({ open: '<br />', close: '' }),

  // قوائم
  'ul|list-disc list-inside space-y-1': () => ({ open: '<ul>', close: '</ul>' }),
  'ul|list-disc list-inside space-y-2': () => ({ open: '<ul>', close: '</ul>' }),
  'ul|list-disc list-inside space-y-3': () => ({ open: '<ul>', close: '</ul>' }),
  'ul|list-disc list-inside mt-2 space-y-2': () => ({ open: '<ul>', close: '</ul>' }),
  'ul|list-disc list-inside space-y-2 text-[var(--text-secondary)]': () => ({ open: '<ul data-muted="true">', close: '</ul>' }),
  'ul|list-disc list-inside mb-4 space-y-2 text-[var(--text-secondary)]': () => ({ open: '<ul data-muted="true">', close: '</ul>' }),
  'ol|list-decimal list-inside mb-4 space-y-2 text-[var(--text-secondary)]': () => ({ open: '<ol data-muted="true">', close: '</ol>' }),

  // تنبيهات
  'blockquote|bg-[var(--bg-surface)] border-[var(--quran-blue)] border-r-4 font-semibold italic my-4 pr-4 py-3 rounded text-[var(--text-secondary)] text-lg': () => ({ open: '<Note emphasis="lg">', close: '</Note>' }),
  'blockquote|bg-[var(--bg-surface)] border-[var(--quran-blue)] border-r-4 font-semibold my-4 pr-4 py-3 rounded text-[var(--text-secondary)]': () => ({ open: '<Note>', close: '</Note>' }),
}));
MAP.delete('h3|border-[var(--border-color)] border-b font-bold mb-4 pb-2 text--[var(--quran-red)] text-xl');

/* ─────────────────────── قواعد بالأنماط (RULES) ───────────────────────
   تُفحص قبل جدول MAP الحرفي. سببها أن كل صفحة قديمة استعملت أصناف Tailwind
   مختلفة لنفس المعنى، فمطابقة النص الحرفي لا تتوسّع. هنا نطابق بالمعنى.
   الترتيب مهم: أول قاعدة تنطبق هي التي تُستعمل.
   --------------------------------------------------------------------- */
const has = (n, ...tokens) => {
  const c = n.attrs?.class || '';
  return tokens.every((t) => c.includes(t));
};
/** مطابقة صنف كامل (لا جزء منه) — لتفادي التباس quran-main مع text-quran-main */
const hasToken = (n, ...tokens) => {
  const set = new Set((n.attrs?.class || '').split(/\s+/));
  return tokens.every((t) => set.has(t));
};

const RULES = [
  /* ── زخارف تُحذف (لا نص فيها) ──────────────────────────────────── */
  /*
   * قاعدة عامة: أي حاوية لا تحوي نصًا إطلاقًا فهي زخرفة بحتة
   * (شريط تحته العنوان، نقطة، خط فاصل، شكل خلفية). حذفها لا يفقد محتوى،
   * ويؤكد ذلك المدقّق الذي يقارن النص حرفًا بحرف.
   */
  { when: (n) => /^(div|span|hr)$/.test(n.tag) && !textOf(n).trim(), skip: true },
  // شكل خلفية مزخرف خلف البطاقة (صفحة البقرة)
  { when: (n) => n.tag === 'div' && has(n, 'absolute'), skip: true },
  // فاصل بصري — يوفّره التخطيط
  { when: (n) => n.tag === 'div' && has(n, 'section-divider'), skip: true },

  /* ── حاويات تخطيطية شفافة ──────────────────────────────────────── */
  { when: (n) => n.tag === 'div' && has(n, 'text-center') && !has(n, 'bg-'), transparent: true },
  { when: (n) => n.tag === 'div' && has(n, 'space-y-') && !has(n, 'bg-'), transparent: true },
  { when: (n) => n.tag === 'div' && has(n, 'prose'), transparent: true },
  { when: (n) => n.tag === 'div' && /^(mb|mt)-/.test((n.attrs?.class || '').trim()) && !has(n, 'bg-'), transparent: true },

  /* ── نصوص قرآنية بأسماء أصناف مجرّدة (صفحة البقرة) ─────────────── */
  { when: (n) => hasToken(n, 'quran-main'), open: '<QuranBlock variant="opening" as="p">', close: '</QuranBlock>' },
  { when: (n) => hasToken(n, 'quran-passage'), open: '<QuranBlock>', close: '</QuranBlock>' },
  { when: (n) => hasToken(n, 'quran-evidence'), open: '<Ayah tone="blue">', close: '</Ayah>' },

  /* ── صناديق منبّهة/اقتباسات ────────────────────────────────────── */
  // صندوق موسّط (شعر، اقتباس)
  {
    when: (n) => /^(p|span|div)$/.test(n.tag) && has(n, 'bg-gray-') && has(n, 'text-center'),
    open: '<Note variant="quote">', close: '</Note>',
  },
  // لوح مظلّل بحجم بطاقة
  {
    when: (n) => n.tag === 'article' && /bg-(gray|slate|indigo|blue)-/.test(n.attrs?.class || ''),
    open: '<TafsirCard>', close: '</TafsirCard>',
  },
  // صندوق تنبيه عام (أي خلفية ملوّنة خفيفة)
  {
    when: (n) =>
      /^(p|div|blockquote)$/.test(n.tag) &&
      /bg-(gray|slate|indigo|blue|amber|yellow|emerald)-/.test(n.attrs?.class || '') &&
      !has(n, 'inline-block'),
    open: '<Note>', close: '</Note>',
  },
  // شارة/لصيقة صغيرة
  {
    when: (n) => has(n, 'rounded-full') && has(n, 'inline-block'),
    open: '<Badge>', close: '</Badge>',
  },

  /* ── عناوين ونصوص عامة في بقية الصفحات ─────────────────────────── */
  { when: (n) => n.tag === 'h3' && has(n, 'font-bold'), open: '<TopicTitle level={3}>', close: '</TopicTitle>' },
  { when: (n) => n.tag === 'h4' && has(n, 'font-bold'), open: '<SectionTitle level={4}>', close: '</SectionTitle>' },
  // فقرة عريضة تُستعمل كعنوان صغير — تبقى فقرة مع إبقاء العرض
  { when: (n) => n.tag === 'p' && has(n, 'font-bold'), open: '<p><strong>', close: '</strong></p>' },
  // نص ثانوي صغير
  { when: (n) => n.tag === 'span' && has(n, 'text-sm'), open: '<span data-muted="true">', close: '</span>' },
  { when: (n) => n.tag === 'span' && has(n, 'italic'), open: '<em>', close: '</em>' },
  { when: (n) => n.tag === 'p' && has(n, 'text-gray-'), open: '<p>', close: '</p>' },

  // ── حاويات شفافة (تخطيط فقط، لا معنى) ─────────────────────────────
  { when: (n) => n.tag === 'div' && has(n, 'flex', 'flex-col', 'gap-'), transparent: true },
  { when: (n) => n.tag === 'div' && has(n, 'p-6', 'flex', 'gap-6') && !has(n, 'bg-white'), transparent: true },
  { when: (n) => n.tag === 'div' && has(n, 'text-scale-original'), transparent: true },
  { when: (n) => n.tag === 'div' && has(n, 'space-y-4') && !has(n, 'bg-'), transparent: true },
  // div بلا أصناف — غلاف تخطيطي محض
  { when: (n) => n.tag === 'div' && !(n.attrs?.class || '').trim(), transparent: true },
  // جسم <details> بعد الملخّص (يوفّر LinguisticDetails غلافه)
  { when: (n) => n.tag === 'div' && has(n, 'p-4') && has(n, 'border-t'), transparent: true },

  // ── فاصل بصري ──────────────────────────────────────────────────────
  { when: (n) => n.tag === 'div' && has(n, 'justify-center', 'py-8'), skip: true },

  // ── بطاقات ─────────────────────────────────────────────────────────
  {
    when: (n) => (n.tag === 'article' || n.tag === 'div') && has(n, 'bg-white', 'rounded-'),
    open: '<TafsirCard>', close: '</TafsirCard>',
  },
  // شريط علوي ملوّن داخل البطاقة (يحمل الآية)
  {
    when: (n) => n.tag === 'div' && has(n, 'bg-gray-50', 'border-b'),
    open: '<CardBanner>', close: '</CardBanner>',
  },
  // صندوق تنبيه أزرق → يقابل Note بالخط الأزرق الجانبي في النظام الموحّد
  {
    when: (n) => n.tag === 'div' && has(n, 'bg-blue-'),
    open: '<Note>', close: '</Note>',
  },
  // صندوق اقتباس/شعر (رمادي، وسط، مائل)
  {
    when: (n) => (n.tag === 'div' || n.tag === 'p') && has(n, 'italic') && has(n, 'text-center'),
    open: '<Note variant="quote">', close: '</Note>',
  },

  // ── نصوص قرآنية ─────────────────────────────────────────────────────
  {
    when: (n) => has(n, 'font-amiri') && has(n, 'quran-main'),
    open: '<QuranBlock variant="opening" as="p">', close: '</QuranBlock>',
  },
  {
    when: (n) => has(n, 'font-amiri') && has(n, 'quran-passage'),
    open: '<QuranBlock>', close: '</QuranBlock>',
  },
  // دليل/حديث → أزرق (يقابل --quran-blue في نظام الألوان الموحّد)
  {
    when: (n) => has(n, 'font-amiri') && has(n, 'evidence'),
    open: '<Ayah tone="blue">', close: '</Ayah>',
  },
  {
    when: (n) => has(n, 'font-amiri') && has(n, 'quran'),
    open: '<Ayah>', close: '</Ayah>',
  },
  { when: (n) => has(n, 'font-amiri'), open: '<Ayah>', close: '</Ayah>' },

  /* ── مفردات دلالية إضافية من صفحات الإخلاص والبقرة والفلق والناس ──
     المطابقة على المعنى (دليل / آية / عنوان فرعي / بطاقة) لا على شكل الأصناف. */

  // دليل أو حديث → أزرق
  {
    when: (n) => has(n, 'quran-evidence') || has(n, 'evidence'),
    open: '<Ayah tone="blue">', close: '</Ayah>',
  },
  // آية معروضة ككتلة
  {
    when: (n) => has(n, 'quran-passage'),
    open: '<QuranBlock>', close: '</QuranBlock>',
  },
  // آية داخل السطر (تسميات مختلفة بين الصفحات)
  {
    when: (n) =>
      has(n, 'text-quran-main') || has(n, 'text-quranic') || has(n, 'text-quran-red') ||
      has(n, 'font-quran') || has(n, 'font-amiri'),
    open: '<Ayah>', close: '</Ayah>',
  },
  // بطاقات بتسميات الصفحات المختلفة
  {
    when: (n) =>
      (n.tag === 'div' || n.tag === 'article') &&
      (has(n, 'editorial-card') || has(n, 'tafsir-element') ||
       has(n, 'bg-ui-card') || has(n, 'bg-apple-card') || has(n, 'bg-card-light')),
    open: '<TafsirCard>', close: '</TafsirCard>',
  },
  // عناوين فرعية بتسميات مختلفة
  {
    when: (n) => /^h[34]$/.test(n.tag) && (has(n, 'sub-heading') || has(n, 'section-heading')),
    open: '<SectionTitle level={4}>', close: '</SectionTitle>',
  },
  { when: (n) => /^h[34]$/.test(n.tag) && has(n, 'text-h3'), open: '<TopicTitle level={3}>', close: '</TopicTitle>' },
  // نص الفقرات بتسميات مختلفة
  {
    when: (n) => n.tag === 'p' && (has(n, 'tafsir-body') || has(n, 'body-text') || has(n, 'text-body')),
    open: '<p>', close: '</p>',
  },
  // عنصر قائمة موضوعية
  { when: (n) => n.tag === 'li' && has(n, 'topic-list-item'), open: '<li>', close: '</li>' },
  // فاصل أفقي
  { when: (n) => n.tag === 'hr', skip: true },

  // ── عناوين ──────────────────────────────────────────────────────────
  // عنوان موضوع: h2/h3 بخط سفلي، أو عنوان تحريري في النص الكامل
  {
    when: (n) => n.tag === 'h3' && has(n, 'text-scale-h3'),
    open: '<TopicTitle level={3}>', close: '</TopicTitle>',
  },
  {
    when: (n) => n.tag === 'h3' && has(n, 'text-scale-h4'),
    open: '<SectionTitle level={3}>', close: '</SectionTitle>',
  },
  {
    when: (n) => n.tag === 'h4' && has(n, 'text-scale-h4'),
    open: '<SectionTitle level={4}>', close: '</SectionTitle>',
  },

  // ── نص عادي ─────────────────────────────────────────────────────────
  { when: (n) => n.tag === 'p' && has(n, 'text-scale-body'), open: '<p>', close: '</p>' },
  { when: (n) => n.tag === 'span' && has(n, 'font-bold'), open: '<strong>', close: '</strong>' },
  { when: (n) => n.tag === 'span' && has(n, 'font-semibold'), open: '<strong>', close: '</strong>' },

  // ── قوائم ───────────────────────────────────────────────────────────
  {
    when: (n) => n.tag === 'ul' && has(n, 'list-none'),
    open: '<ul data-plain="true">', close: '</ul>',
  },
  { when: (n) => n.tag === 'ul', open: '<ul>', close: '</ul>' },
  { when: (n) => n.tag === 'ol', open: '<ol>', close: '</ol>' },
];

function matchRule(node) {
  if (node.tag === '#text') return null;
  for (const r of RULES) if (r.when(node)) return r;
  return null;
}

/** عناوين المواضيع: أي h3 يحمل حدًا سفليًا ولونًا أحمر */
const isTopicTitle = (n) =>
  n.tag === 'h3' && /border-b/.test(n.attrs.class || '') && /quran-red/.test(n.attrs.class || '');

/** عناصر تُتجاهل تمامًا (يتكفل بها التخطيط لا المحتوى) */
const isSkipped = (n) =>
  (n.tag === 'div' && /visual-divider/.test(n.attrs.class || '')) ||
  (n.tag === 'div' && /^flex items-center justify-between/.test(n.attrs.class || '')) ||
  n.tag === 'button' || n.tag === 'svg' || n.tag === 'path' ||
  (n.tag === 'h2');

/** حاويات لا تُنتج وسمًا: يتكفل بها التخطيط (FullTextSection يوفّر #full-text-content) */
const TRANSPARENT = new Set(['div|space-y-6 text-original']);

/** الوسوم الكتليّة — تحدد متى يُستعمل الشكل المتعدد الأسطر */
const BLOCK_TAGS = /^(div|article|ul|ol|section|p|li|h3|h4|blockquote|details)$/;
const isBlockNode = (n) => n.tag !== '#text' && BLOCK_TAGS.test(n.tag);

const problems = [];
const esc = (s) => s.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');

function serialize(node, depth = 0) {
  const pad = '  '.repeat(depth);

  if (node.tag === '#text') {
    const t = node.text.replace(/\s+/g, ' ');
    return t.trim() ? esc(t) : (/\s/.test(node.text) ? ' ' : '');
  }
  if (isSkipped(node)) return '';

  if (node.tag === 'details') {
    const sum = node.children.find((c) => c.tag === 'summary');
    const rest = node.children.filter((c) => c !== sum);
    const label = sum ? textOf(sum).replace(/\s+/g, ' ').trim() : '';
    let inner = rest.map((c) => serialize(c, depth + 1)).join('');
    // نفس قاعدة MDX: المحتوى يبدأ بسطر جديد وإلا عُومل كفقرة ووجب إغلاقه داخلها
    if (!inner.startsWith('\n')) inner = `\n${pad}  ` + inner.replace(/^[ \t]+/, '');
    return `\n${pad}<LinguisticDetails summary="${label}">${inner}\n${pad}</LinguisticDetails>`;
  }

  if (isTopicTitle(node)) {
    const inner = node.children.map((c) => serialize(c, depth + 1)).join('');
    return `\n${pad}<TopicTitle>${inner}</TopicTitle>`;
  }

  // حاويات شفافة: نمرر أبناءها دون وسم (التخطيط يوفّر الغلاف)
  if (TRANSPARENT.has(`${node.tag}|${cls(node)}`)) {
    return node.children.map((c) => serialize(c, depth)).join('');
  }

  const key = `${node.tag}|${cls(node)}`;
  let open, close;

  const exact = MAP.get(key);
  if (exact) {
    ({ open, close } = exact());
  } else {
    // لا مطابقة حرفية ← جرّب القواعد بالأنماط
    const r = matchRule(node);
    if (!r) {
      problems.push(key);
      return '';
    }
    if (r.skip) return '';
    if (r.transparent) return node.children.map((c) => serialize(c, depth)).join('');
    ({ open, close } = r);
  }
  // عنصر فارغ (<br />) — سطري، بلا مسافات إضافية
  if (!close) return open;

  const isBlock = BLOCK_TAGS.test(node.tag) || /Card|Details/.test(open);
  const inner = node.children.map((c) => serialize(c, isBlock ? depth + 1 : depth)).join('');

  // العناصر السطرية تُكتب في مكانها تمامًا دون \n أو مسافة بادئة،
  // لأن أي مسافة قبلها تظهر للقارئ كفراغ لم يكن في الصفحة الأصلية.
  if (!isBlock) return `${open}${inner}${close}`;

  /*
   * قاعدة MDX المهمة:
   * إذا بدأ النص على سطر وسم الفتح نفسه، فإن MDX يعامل الكتلة كفقرة (paragraph)
   * ويشترط أن يُغلق الوسم داخل الفقرة نفسها. ووضع وسم الإغلاق في أول سطر تالٍ
   * يبدأ كتلة MDX جديدة فتنتهي الفقرة قبل الإغلاق ← خطأ:
   *   "Expected a closing tag for `<Note>` before the end of `paragraph`"
   *
   * لذلك: الشكل المتعدد الأسطر (flow) يُستعمل فقط عندما يكون للعنصر أبناء كتليّون
   * (فيبدأ المحتوى بسطر جديد أصلًا). وإلا فالإغلاق على السطر نفسه.
   */
  const hasBlockChild = node.children.some(isBlockNode);
  if (!hasBlockChild) {
    // لا أبناء كتليّون ← كل شيء على سطر واحد (آمن في MDX دائمًا)
    return `\n${pad}${open}${inner}${close}`;
  }

  /*
   * فيه أبناء كتليّون ← لا بد أن يبدأ المحتوى بسطر جديد، وإلا عُومل كفقرة
   * ووجب إغلاقه داخلها. إن بدأ المحتوى بعنصر سطري (مثل <QuranBlock> داخل بطاقة)
   * نستبدل المسافة البادئة الموجودة أصلًا بسطر جديد + إزاحة.
   * كلاهما «مسافة بيضاء» فالنص المعروض لا يتغيّر — ويؤكد ذلك verify-content.
   */
  let body = inner;
  if (!body.startsWith('\n')) {
    body = `\n${pad}  ` + body.replace(/^[ \t]+/, '');
  }
  return `\n${pad}${open}${body}\n${pad}${close}`;
}

/* ── تحديد الأقسام ─────────────────────────────────────────────────── */
const main = find(doc, (n) => n.tag === 'main') || doc;
const sectionByPart = (num) =>
  find(main, (n) => n.tag === 'section' && new RegExp(`^part-?${num}$`).test(n.attrs?.id || ''));

/* ── شريط التنقل الأصلي: مصدر أسماء المراسي وتسمياتها ──────────────────
   نقرأه من الصفحة نفسها بدل افتراض نمط معيّن، لأن الصفحات اختلفت:
   فمنها ما استعمل cat-* ومنها sec-* ومنها الاسم مجرّدًا (#meanings).      */
const navEl = find(doc, (n) => n.tag === 'nav');
const navLinks = navEl
  ? findAll(navEl, (n) => n.tag === 'a' && /^#./.test(n.attrs?.href || '')).map((a) => ({
      id: a.attrs.href.slice(1),
      label: textOf(a).replace(/\s+/g, ' ').trim(),
    }))
  : [];
const isPartAnchor = (id) => /^part-?[0-9]+$/.test(id);
const topicIds = navLinks.map((l) => l.id).filter((id) => !isPartAnchor(id));

/*
 * قسم «التصنيف الموضوعي» قد لا يحمل id إطلاقًا (صفحة سورة الناس — خلل حقيقي
 * في الأصل). لذلك نبحث عنه بالمحتوى: القسم الذي يضم أول بطاقة تصنيف.
 */
function topicsSection() {
  const direct = sectionByPart(2);
  if (direct) return direct;
  if (!topicIds.length) return null;
  const firstCard = find(main, (n) => topicIds.includes(n.attrs?.id || ''));
  if (!firstCard) return null;
  const sections = findAll(main, (n) => n.tag === 'section');
  const owner = sections.find((s) => findAll(s, (n) => n === firstCard).length > 0);
  if (owner) console.log('ℹ قسم التصنيف بلا id في الأصل — عُثر عليه عبر بطاقاته.');
  return owner || null;
}

const parts = { summary: sectionByPart(1), topics: topicsSection(), 'full-text': sectionByPart(3) };

const PATHS = {
  TafsirCard: '../../../components/ui/Card.astro',
  CardBanner: '../../../components/ui/CardBanner.astro',
  SectionTitle: '../../../components/ui/SectionTitle.astro',
  TopicTitle: '../../../components/ui/TopicTitle.astro',
  QuranBlock: '../../../components/tafsir/QuranBlock.astro',
  Ayah: '../../../components/tafsir/Ayah.astro',
  Note: '../../../components/tafsir/Note.astro',
  LinguisticDetails: '../../../components/tafsir/LinguisticDetails.astro',
  TopicCard: '../../../components/tafsir/TopicCard.astro',
  Badge: '../../../components/ui/Badge.astro',
};

const outDir = path.join('src/content/tafsir', slug);
fs.mkdirSync(outDir, { recursive: true });

const anchors = [];
for (const [name, sec] of Object.entries(parts)) {
  if (!sec) { console.log(`— لا يوجد قسم ${name}`); continue; }

  let body;
  if (name === 'topics') {
    // كل بطاقة تصنيف تصبح <TopicCard> بمرساها الخاص
    /*
     * البطاقات تُلتقط بمراسيها المأخوذة من شريط التنقل الأصلي، لا بأصنافها،
     * لأن الصفحات استعملت أنماطًا مختلفة: cat-* و sec-* و الاسم المجرّد.
     * والمرسى المعتمد يصير cat-* دائمًا مع إبقاء الأصل كاسم بديل.
     */
    const cards = findAll(sec, (c) => topicIds.includes(c.attrs?.id || ''));
    body = cards.map((card) => {
      const original = card.attrs.id || '';
      // المرسى المعتمد موحّد cat-* ، والأصل يبقى اسمًا بديلًا فلا تنكسر الروابط
      const canonical = original.startsWith('cat-')
        ? original
        : 'cat-' + original.replace(/^sec-/, '');
      const legacy = original && original !== canonical ? [original] : [];

      const h = card.children.find((c) => /^h[2-4]$/.test(c.tag)) || card.children.find(isTopicTitle);
      const title = h ? textOf(h).replace(/\s+/g, ' ').trim() : '';
      const navLabel = navLinks.find((l) => l.id === original)?.label || title;
      anchors.push({ id: canonical, label: navLabel, legacy });

      const rest = card.children.filter((c) => c !== h);
      const inner = rest.map((c) => serialize(c, 1)).join('');
      const legacyAttr = legacy.length ? ` legacy={${JSON.stringify(legacy)}}` : '';
      return `\n<TopicCard id="${canonical}" title="${title}"${legacyAttr}>${inner}\n</TopicCard>`;
    }).join('\n');
  } else {
    body = sec.children.map((c) => serialize(c, 0)).join('');
  }

  const used = Object.keys(PATHS).filter((c) => new RegExp(`<${c}[\\s/>]`).test(body));
  const header = used.map((c) => `import ${c} from '${PATHS[c]}';`).join('\n');
  fs.writeFileSync(path.join(outDir, `${name}.mdx`), `${header}\n${body}\n`, 'utf8');
  console.log(`✓ ${name}.mdx`);
}

if (problems.length) {
  console.error('\n✗ تراكيب غير معروفة (لم تُحوَّل) — أضفها إلى MAP:');
  [...new Set(problems)].forEach((p) => console.error('   ' + p));
  process.exit(2);
}
/* مسوّدة بيانات تعين على كتابة meta.json (تُراجع يدويًا ثم تُحذف) */
const partTitles = {};
for (const [name, num] of [['summary', 1], ['topics', 2], ['full-text', 3]]) {
  const sec = parts[name];
  if (!sec) continue;
  const h2 = find(sec, (n) => n.tag === 'h2');
  partTitles[`part-${num}`] = h2 ? textOf(h2).replace(/\s+/g, ' ').trim() : '';
}
const navAnchors = navLinks.map((l) =>
  isPartAnchor(l.id)
    ? { id: `part-${l.id.replace(/^part-?/, '')}`, label: l.label, legacy: [l.id].filter((x) => x !== `part-${l.id.replace(/^part-?/, '')}`) }
    : anchors.find((a) => a.legacy?.includes(l.id) || a.id === l.id || a.id === 'cat-' + l.id.replace(/^sec-/, '')) || { id: l.id, label: l.label, legacy: [] }
);
fs.writeFileSync(
  path.join(outDir, '_draft-meta.json'),
  JSON.stringify({ parts: partTitles, anchors: navAnchors, sections: Object.keys(parts).filter((k) => parts[k]) }, null, 2),
  'utf8'
);
console.log('\n✓ تم التحويل بلا مشاكل');
