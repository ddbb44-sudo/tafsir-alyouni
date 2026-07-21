/**
 * lint-mdx.mjs — يكشف أخطاء بنية MDX قبل تشغيل البناء.
 *
 * سبب وجوده: MDX يعامل الوسم الذي يبدأ نصه على سطر الفتح نفسه كـ«فقرة»،
 * ويشترط إغلاقه داخل الفقرة. ووضع وسم الإغلاق في أول سطر تالٍ يبدأ كتلة جديدة
 * فتنتهي الفقرة قبل الإغلاق، فيفشل البناء برسالة:
 *   Expected a closing tag for `<X>` before the end of `paragraph`
 *
 *   node scripts/lint-mdx.mjs [مسار المجلد]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || 'src/content/tafsir';

/** كل ملفات mdx تحت المجلد */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const TAG = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;

let problems = 0;
let checked = 0;

for (const file of walk(root)) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const rel = path.relative(process.cwd(), file);
  checked++;

  // 1) وسم يفتح ومعه نص على السطر نفسه لكنه لا يُغلق على السطر نفسه
  lines.forEach((line, i) => {
    if (/^\s*import\s/.test(line)) return;
    TAG.lastIndex = 0;
    let m;
    const opened = [];
    while ((m = TAG.exec(line))) {
      const [full, closing, name, , selfClose] = m;
      if (selfClose) continue;
      if (closing) {
        const idx = opened.map((o) => o.name).lastIndexOf(name);
        if (idx !== -1) opened.splice(idx, 1);
        continue;
      }
      const after = line.slice(m.index + full.length);
      opened.push({ name, hasTextAfter: after.trim().length > 0 });
    }
    for (const o of opened) {
      if (o.hasTextAfter) {
        console.error(
          `✗ ${rel}:${i + 1}  الوسم <${o.name}> يبدأ نصه على سطره لكنه لا يُغلق عليه.\n` +
            `   ضع </${o.name}> على السطر نفسه، أو ابدأ المحتوى بسطر جديد.`
        );
        problems++;
      }
    }
  });

  // 2) توازن الوسوم في الملف كله
  const src = fs.readFileSync(file, 'utf8').replace(/^import[^\n]*$/gm, '');
  const tally = {};
  TAG.lastIndex = 0;
  let m2;
  while ((m2 = TAG.exec(src))) {
    const [, closing, name, , selfClose] = m2;
    if (selfClose) continue;
    tally[name] = (tally[name] || 0) + (closing ? -1 : 1);
  }
  for (const [name, n] of Object.entries(tally)) {
    if (n !== 0) {
      console.error(`✗ ${rel}  الوسم <${name}> غير متوازن (${n > 0 ? 'ناقص إغلاق' : 'إغلاق زائد'}: ${n})`);
      problems++;
    }
  }

  // 3) أقواس معقوفة داخل النص (تكسر MDX)
  const stripped = src.replace(/<[^>]*>/g, '');
  if (/[{}]/.test(stripped)) {
    console.error(`✗ ${rel}  يحتوي { أو } داخل النص — استعمل &#123; و &#125;`);
    problems++;
  }
}

console.log(`\nفُحص ${checked} ملف MDX.`);
if (problems) {
  console.error(`✗ ${problems} مشكلة — أصلحها قبل البناء.`);
  process.exit(1);
}
console.log('✓ بنية MDX سليمة.');
