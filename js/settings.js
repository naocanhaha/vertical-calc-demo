/* 设置面板 & SVG 截图 */

const cfgEnable = document.getElementById("cfgEnable");
const cfgUrl = document.getElementById("cfgUrl");
const cfgKey = document.getElementById("cfgKey");
const cfgModel = document.getElementById("cfgModel");
const cfgVision = document.getElementById("cfgVision");
const explainBody = document.getElementById("explainBody");

try {
  const saved = JSON.parse(localStorage.getItem("vc_settings") || "{}");
  if (saved.url) cfgUrl.value = saved.url;
  if (saved.key) cfgKey.value = saved.key;
  if (saved.model) cfgModel.value = saved.model;
  if (saved.vision === false) cfgVision.checked = false;
  if (saved.enable) cfgEnable.checked = true;
} catch(e) {}

function saveSettings() {
  localStorage.setItem("vc_settings", JSON.stringify({
    enable: cfgEnable.checked, url: cfgUrl.value, key: cfgKey.value,
    model: cfgModel.value, vision: cfgVision.checked
  }));
}
[cfgEnable, cfgUrl, cfgKey, cfgModel, cfgVision].forEach(el => el.addEventListener("change", saveSettings));

document.getElementById("btnSettings").addEventListener("click", () => {
  document.getElementById("settingsPanel").classList.toggle("open");
});

function svgToBase64() {
  const vb = cv.getAttribute("viewBox") || "0 0 400 300";
  const [, , w, h] = vb.split(/[\s,]+/).map(Number);
  const clone = cv.cloneNode(true);
  clone.setAttribute("width", w);
  clone.setAttribute("height", h);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `path,line{fill:none;stroke:#2d3a2e;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round}.carry{stroke:#c62828;stroke-width:2}.carry-mul{stroke:#1565c0;stroke-width:1.8}.borrow-dot{fill:#c62828;stroke:none}.dp{fill:#2d3a2e;stroke:none}.crossout{stroke:#c62828;stroke-width:2.5}`;
  clone.insertBefore(style, clone.firstChild);
  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
