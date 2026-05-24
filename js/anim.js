/* 动画引擎 */
function animAll(items, op, a, b) {
  const spd = parseFloat(document.getElementById("speed").value) || 1;
  items.forEach(it => {
    if (it.type === "stroke") {
      it.el.setAttribute("stroke-dasharray", it.len);
      it.el.setAttribute("stroke-dashoffset", it.len);
    } else {
      it.el.style.transition = `opacity ${300 / spd}ms`;
    }
  });
  let i = 0;
  function next() {
    if (_animCancel) { _animCancel = false; return; }
    if (i >= items.length) {
      showResult(a, op, b);
      return;
    }
    const it = items[i];
    if (it.type === "stroke") {
      const dur = Math.max(it.len * 2.5, 220) / spd;
      it.el.style.transition = `stroke-dashoffset ${dur}ms ease`;
      it.el.getBoundingClientRect();
      it.el.setAttribute("stroke-dashoffset", "0");
      i++; setTimeout(next, dur + 50 / spd);
    } else if (it.type === "fade") {
      it.el.style.opacity = "1";
      i++; setTimeout(next, 350 / spd);
    } else {
      it.el.style.opacity = "1";
      i++; setTimeout(next, 250 / spd);
    }
  }
  next();
}
