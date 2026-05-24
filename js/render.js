/* Markdown + KaTeX 渲染 */
function renderMd(s) {
  const tokens = [];
  const ph = i => `​⁣${i}⁣​`;
  function protect(text, type) { tokens.push({text, type}); return ph(tokens.length - 1); }
  function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function renderTex(latex, display) {
    try { return katex.renderToString(latex, { throwOnError: false, displayMode: display }); }
    catch { return esc(latex); }
  }
  const hasKatex = typeof katex !== 'undefined';

  s = s.replace(/```[\s\S]*?```/g, m => protect(m, 'cb'));
  s = s.replace(/`[^`\n]+`/g, m => protect(m, 'ic'));
  s = s.replace(/\$\$[\s\S]*?\$\$/g, m => protect(m, 'dm'));
  s = s.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, m => protect(m, 'im'));
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, m => protect(m, 'dm'));
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, m => protect(m, 'im'));

  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = s.split('\n');
  let html = '', inUl = false, inOl = false, para = '';
  function flush() { if (para) { html += '<p>' + para + '</p>'; para = ''; } }
  function closeList() { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } }

  for (const line of lines) {
    const t = line.trim();
    if (/^### /.test(t))        { flush(); closeList(); html += '<h3>' + t.slice(4) + '</h3>'; }
    else if (/^## /.test(t))    { flush(); closeList(); html += '<h2>' + t.slice(3) + '</h2>'; }
    else if (/^# /.test(t))     { flush(); closeList(); html += '<h1>' + t.slice(2) + '</h1>'; }
    else if (/^---+$/.test(t))  { flush(); closeList(); html += '<hr>'; }
    else if (/^&gt; /.test(t))  { flush(); closeList(); html += '<blockquote>' + t.slice(5) + '</blockquote>'; }
    else if (/^\d+\. /.test(t)) {
      flush(); if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += '<li>' + t.replace(/^\d+\. /, '') + '</li>';
    }
    else if (/^[-*] /.test(t)) {
      flush(); if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += '<li>' + t.slice(2) + '</li>';
    }
    else if (t === '')          { flush(); closeList(); }
    else                        { closeList(); para += (para ? '<br>' : '') + t; }
  }
  flush(); closeList();

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  tokens.forEach((tk, i) => {
    let r;
    if (tk.type === 'cb') {
      const code = tk.text.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
      r = '<pre><code>' + esc(code) + '</code></pre>';
    } else if (tk.type === 'ic') {
      r = '<code>' + esc(tk.text.slice(1, -1)) + '</code>';
    } else if (tk.type === 'dm') {
      let math = tk.text;
      if (math.startsWith('$$')) math = math.slice(2, -2).trim();
      else if (math.startsWith('\\[')) math = math.slice(2, -2).trim();
      r = '<div class="math-display">' + (hasKatex ? renderTex(math, true) : esc(math)) + '</div>';
    } else if (tk.type === 'im') {
      let math = tk.text;
      if (math.startsWith('$')) math = math.slice(1, -1);
      else if (math.startsWith('\\(')) math = math.slice(2, -2);
      r = '<span class="math-inline">' + (hasKatex ? renderTex(math, false) : esc(math)) + '</span>';
    }
    html = html.split(ph(i)).join(r);
  });
  return html;
}
