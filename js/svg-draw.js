/* SVG 绘制原语 */

const cv = document.getElementById("cv");

function mk(tag, a) {
  const e = document.createElementNS(NS, tag);
  for (const k in a) e.setAttribute(k, a[k]);
  return e;
}

function setSize(w, h) {
  cv.setAttribute("viewBox", `0 0 ${w} ${h}`);
  cv.removeAttribute("width");
  cv.removeAttribute("height");
}

function addStroke(items, d, x, y, s) {
  const p = mk("path", { d, transform: `translate(${x},${y}) scale(${s})` });
  cv.appendChild(p);
  items.push({ el: p, len: p.getTotalLength(), type: "stroke" });
}

function addFade(items, d, x, y, s, cls) {
  const p = mk("path", { d, transform: `translate(${x},${y}) scale(${s})`, class: cls || "carry", opacity: "0" });
  cv.appendChild(p);
  items.push({ el: p, len: 0, type: "fade" });
}

function addLine(items, x, y, len) {
  const l = mk("line", {
    x1: x, y1: y, x2: x + len, y2: y,
    stroke: "#1a1a2e", "stroke-width": 2.2, "stroke-linecap": "round"
  });
  cv.appendChild(l);
  items.push({ el: l, len: Math.abs(len), type: "stroke" });
}

function addDotBorrow(items, x, y) {
  const c = mk("circle", { cx: x, cy: y, r: 3.5, class: "borrow-dot", opacity: "0" });
  cv.appendChild(c);
  items.push({ el: c, len: 0, type: "dot" });
}

function addDP(items, x, y) {
  const c = mk("circle", { cx: x, cy: y, r: 3, class: "dp", opacity: "0" });
  cv.appendChild(c);
  items.push({ el: c, len: 0, type: "fade" });
}

function addCrossout(items, x, y, s) {
  const l = mk("line", {
    x1: x - 14 * s, y1: y - 14 * s, x2: x + 14 * s, y2: y + 14 * s,
    class: "crossout", opacity: "0"
  });
  cv.appendChild(l);
  items.push({ el: l, len: 0, type: "fade" });
}

/* 占位装饰图案 */
function showPlaceholder() {
  cv.innerHTML = '';
  requestAnimationFrame(() => {
    const pw = cv.clientWidth || 400;
    const ph = cv.clientHeight || 300;
    cv.setAttribute("viewBox", `0 0 ${pw} ${ph}`);
    const cx = pw / 2, cy = ph / 2;
    const deco = [
      `M ${pw*.15} ${ph*.2} L ${pw*.3} ${ph*.35}`,
      `M ${pw*.7} ${ph*.15} L ${pw*.85} ${ph*.3}`,
      `M ${pw*.2} ${ph*.7} L ${pw*.35} ${ph*.85}`,
      `M ${pw*.65} ${ph*.65} L ${pw*.8} ${ph*.8}`,
      `M ${cx-12} ${cy} L ${cx+12} ${cy}`,
      `M ${cx} ${cy-12} L ${cx} ${cy+12}`,
      `M ${cx+24} ${cy-10} L ${cx+44} ${cy+10}`,
      `M ${cx+44} ${cy-10} L ${cx+24} ${cy+10}`,
      `M ${cx-48} ${cy} L ${cx-28} ${cy}`,
    ];
    deco.forEach(d => {
      const p = mk("path", {
        d, fill: "none", stroke: "#c8c0b0", "stroke-width": 1.5,
        "stroke-linecap": "round", opacity: "0.5"
      });
      cv.appendChild(p);
    });
    [[cx-38, cy-8, 2], [cx-38, cy+8, 2]].forEach(([x,y,r]) => {
      const c = mk("circle", { cx: x, cy: y, r, fill: "#c8c0b0", opacity: "0.5" });
      cv.appendChild(c);
    });
  });
}
