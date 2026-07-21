/**
 * verify-content.mjs — يتحقق أن النص العربي لم يتغيّر حرفًا واحدًا بعد التحويل.
 *
 * يقارن نص الصفحة الأصلية (index.html) بنص ملفات MDX الناتجة، بعد توحيد المسافات فقط.
 * أي اختلاف يُعرض بالسياق ويُرجع خروجًا غير صفري.
 *
 *   node scripts/verify-content.mjs <index.html القديم> <slug>
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, textOf } from './lib/parse.mjs';

const [srcPath, slug] = process.argv.slice(2);
if (!srcPath || !slug) {
  console.error('usage: verify-content.mjs <index.html> <slug>');
  process.exit(1);
}

const html = fs.readFileSync(srcPath, 'utf8');
const doc = parse(html);

const find = (n, p) => {
  if (p(n)) return n;
  for (const c of n.children || []) {
    const r = find(c, p);
    if (r) return r;
  }
  return null;
};

const norm = (s) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/** نص القسم الأصلي، مع استبعاد العنوان الرئيسي وأزرار الواجهة */
function sectionText(sec) {
  const clone = JSON.parse(JSON.stringify(sec));
  const strip = (n) => {
    n.children = (n.children || []).filter(
      (c) =>
        !(
          c.tag === 'h2' ||
          c.tag === 'button' ||
          c.tag === 'svg' ||
          (c.tag === 'div' && /^flex items-center justify-between/.test(c.attrs?.class || ''))
        )
    );
    n.children.forEach(strip);
  };
  strip(clone);
  return norm(textOf(clone));
}

/** نص ملف MDX بعد إزالة الاستيرادات والوسوم، مع إبقاء النص الموجود داخل الخصائص */
function mdxText(file) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/^import[^\n]*\n/gm, '');

  // إزالة الوسوم بلا إضافة مسافات، مع إخراج نص الخصائص (title/summary) في مكانه
  s = s.replace(/<[^>]+>/g, (tag) => {
    const vals = [...tag.matchAll(/\b(?:title|summary)="([^"]*)"/g)].map((m) => m[1]);
    return vals.length ? ' ' + vals.join(' ') + ' ' : '';
  });
  s = s.replace(/&#123;/g, '{').replace(/&#125;/g, '}');

  return norm(s);
}

const findAll = (n, p, out = []) => {
  if (p(n)) out.push(n);
  for (const c of n.children || []) findAll(c, p, out);
  return out;
};

const main = find(doc, (n) => n.tag === 'main') || doc;
const sec = (num) =>
  find(main, (n) => n.tag === 'section' && new RegExp(`^part-?${num}$`).test(n.attrs?.id || ''));

/*
 * لا بد أن يستعمل المدقّق نفس منطق المستخرج في العثور على قسم «التصنيف الموضوعي»،
 * وإلا مرّ القسم بلا تدقيق (صفحة سورة الناس: القسم بلا id في الأصل).
 * هذا التطابق شرط ألّا تكون هناك ثغرة تحقّق صامتة.
 */
const navEl = find(doc, (n) => n.tag === 'nav');
const topicIds = navEl
  ? findAll(navEl, (n) => n.tag === 'a' && /^#./.test(n.attrs?.href || ''))
      .map((a) => a.attrs.href.slice(1))
      .filter((id) => !/^part-?[0-9]+$/.test(id))
  : [];

function topicsSection() {
  const direct = sec(2);
  if (direct) return direct;
  if (!topicIds.length) return null;
  const firstCard = find(main, (n) => topicIds.includes(n.attrs?.id || ''));
  if (!firstCard) return null;
  const owner = findAll(main, (n) => n.tag === 'section').find(
    (s) => findAll(s, (n) => n === firstCard).length > 0
  );
  if (owner) console.log('ℹ قسم التصنيف بلا id في الأصل — عُثر عليه عبر بطاقاته.');
  return owner || null;
}

const pairs = [
  ['summary', sec(1)],
  ['topics', topicsSection()],
  ['full-text', sec(3)],
];

let failed = 0;
let totalChars = 0;

for (const [name, node] of pairs) {
  const file = path.join('src/content/tafsir', slug, `${name}.mdx`);
  if (!node) {
    console.log(`— ${name}: لا يوجد في المصدر`);
    continue;
  }
  if (!fs.existsSync(file)) {
    console.error(`✗ ${name}: الملف غير موجود`);
    failed++;
    continue;
  }

  const a = sectionText(node);
  const b = mdxText(file);
  totalChars += a.length;

  if (a === b) {
    console.log(`✓ ${name}: مطابق تمامًا (${a.length.toLocaleString('en')} حرفًا)`);
    continue;
  }

  failed++;
  console.error(`✗ ${name}: اختلاف! الأصل ${a.length} حرفًا · الناتج ${b.length} حرفًا`);
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  console.error('   أول اختلاف عند الحرف ' + i);
  console.error('   الأصل : …' + a.slice(Math.max(0, i - 70), i + 70));
  console.error('   الناتج: …' + b.slice(Math.max(0, i - 70), i + 70));
}

console.log(`\nالإجمالي المقارَن: ${totalChars.toLocaleString('en')} حرفًا`);
if (failed) {
  console.error(`\n✗ فشل التحقق في ${failed} قسم/أقسام`);
  process.exit(1);
}
console.log('✓ النص العربي محفوظ بالكامل — لا فروق.');
