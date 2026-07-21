/** محلل HTML بسيط كافٍ لصفحات التفسير (لا يحتاج حزم خارجية). */
const VOID = new Set(['br','img','hr','meta','link','input','path','circle','source']);

export function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--([\s\S]*?)-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'>]+))?)*)\s*(\/?)>/g;
  let last = 0, m;
  const pushText = (t) => {
    if (!t) return;
    stack[stack.length - 1].children.push({ tag: '#text', text: t });
  };
  while ((m = re.exec(html))) {
    pushText(html.slice(last, m.index));
    last = re.lastIndex;
    if (m[1] !== undefined) continue;                      // تعليق: يُتجاهل
    if (m[2]) {                                            // وسم إغلاق
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === m[2].toLowerCase()) { stack.length = i; break; }
      }
      continue;
    }
    const tag = m[3].toLowerCase();
    const attrs = {};
    const ar = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
    let a;
    while ((a = ar.exec(m[4] || ''))) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const node = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!VOID.has(tag) && !m[5]) stack.push(node);
  }
  pushText(html.slice(last));
  return root;
}

/** كل النص الظاهر داخل عقدة، لأغراض المقارنة. */
export function textOf(node) {
  if (node.tag === '#text') return node.text;
  if (node.tag === 'svg' || node.tag === 'script' || node.tag === 'style') return '';
  return (node.children || []).map(textOf).join('');
}

export const cls = (node) =>
  (node.attrs?.class || '').trim().split(/\s+/).filter(Boolean).sort().join(' ');
