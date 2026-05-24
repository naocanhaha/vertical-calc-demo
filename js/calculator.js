/* 计算器状态机 & 事件绑定 */

let state = "idle";
let curA = "", curOp = "", curB = "";
let running = false;
let _animCancel = false;
const exprEl = document.getElementById("calcExpr");
const valEl = document.getElementById("calcVal");
const exprText = document.getElementById("exprText");

/* 输入位数限制：整数最多4位，小数最多3位 */
function canAddDigit(s) {
  if (!s || s === "-" || s === "-0") return true;
  const clean = s.replace("-", "");
  if (!clean.includes(".")) return clean.length < 4;
  return clean.split(".")[1].length < 3;
}

function canAddDot(s) {
  if (!s || s === "-" || s === "-0") return true;
  const clean = s.replace("-", "");
  return !clean.includes(".") && clean.length <= 4;
}

function updateDisplay() {
  valEl.textContent = state === "idle" ? "0" :
    state === "op" ? curA :
    state === "result" || state === "animating" ? valEl.textContent :
    (state === "input_a" ? (curA || "0") : (curB || "0"));
  exprEl.textContent = state === "op" ? curA + " " + OP_SYM[curOp] :
    state === "input_b" || state === "animating" ? curA + " " + OP_SYM[curOp] + " " + (curB || "") :
    state === "result" ? exprEl.textContent : "";
}

function inputDigit(d) {
  if (state === "idle" || state === "result") { curA = d; curOp = ""; curB = ""; state = "input_a"; }
  else if (state === "input_a") {
    // 阻止前导零："0"不能再接数字（除非已有小数点）
    if (curA === "0" && d === "0") return;
    if (curA === "0" && d !== ".") { curA = d; }
    else if (curA === "-0" && d === "0") return;
    else if (curA === "-0") { curA = "-" + d; }
    else { if (!canAddDigit(curA)) return; curA += d; }
  }
  else if (state === "op") {
    curB = d; state = "input_b";
  }
  else if (state === "input_b") {
    if (curB === "0" && d === "0") return;
    if (curB === "0") { curB = d; }
    else if (curB === "-0" && d === "0") return;
    else if (curB === "-0") { curB = "-" + d; }
    else { if (!canAddDigit(curB)) return; curB += d; }
  }
  updateDisplay();
}

function inputDot() {
  if (state === "idle" || state === "result") { curA = "0."; curOp = ""; curB = ""; state = "input_a"; }
  else if (state === "input_a") { if (!curA.includes(".") && canAddDot(curA)) curA += "."; }
  else if (state === "op") { curB = "0."; state = "input_b"; }
  else if (state === "input_b") { if (!curB.includes(".") && canAddDot(curB)) curB += "."; }
  updateDisplay();
}

function inputOp(op) {
  if (running) return;
  if (state === "idle") return;
  if (state === "input_b") { curOp = op; clearOpActive(); document.querySelector(`[data-act="${op}"]`)?.classList.add("active"); updateDisplay(); return; }
  if (state === "result") {
    // 除法结果含"......"，不能直接当操作数
    const txt = valEl.textContent;
    curA = txt.includes("......") ? "" : txt;
    if (!curA) return;
    curB = "";
    btnReplay.disabled = true;
  }
  curOp = op;
  state = "op";
  clearOpActive();
  document.querySelector(`[data-act="${op}"]`)?.classList.add("active");
  updateDisplay();
}

function inputNeg() {
  if (state === "input_a") {
    if (!curA || curA === "0") return;
    curA = curA.startsWith("-") ? curA.slice(1) : "-" + curA;
  }
  else if (state === "op") {
    curB = "-0"; state = "input_b";
  }
  else if (state === "input_b") {
    if (!curB || curB === "0") return;
    curB = curB.startsWith("-") ? curB.slice(1) : "-" + curB;
  }
  else if (state === "result") {
    const txt = valEl.textContent;
    if (txt.includes("......")) return; // 除法结果不取反
    curA = txt.startsWith("-") ? txt.slice(1) : "-" + txt;
    state = "input_a";
  }
  updateDisplay();
}

function inputDel() {
  if (state === "input_a" && curA.length > 0) {
    curA = curA.slice(0, -1);
    if (!curA || curA === "-") { curA = ""; state = "idle"; }
  }
  else if (state === "op") {
    curOp = ""; state = "input_a"; clearOpActive();
  }
  else if (state === "input_b" && curB.length > 0) {
    curB = curB.slice(0, -1);
    if (!curB || curB === "-") { curB = ""; state = "op"; }
  }
  updateDisplay();
}

function inputAC() {
  _animCancel = true;
  curA = ""; curOp = ""; curB = ""; state = "idle"; running = false;
  clearOpActive();
  valEl.textContent = "0"; exprEl.textContent = "";
  btnReplay.disabled = true;
}

function clearOpActive() {
  document.querySelectorAll(".btn-op").forEach(b => b.classList.remove("active"));
}

function doCalc(startAnim = true) {
  if (running) return;
  _animCancel = false;
  const a = parseFloat(curA), b = parseFloat(curB);
  if (isNaN(a) || isNaN(b)) return;
  if (Math.abs(a) > 9999 || Math.abs(b) > 9999) { valEl.textContent = "超出范围"; return; }
  if (!curOp) return;
  if (curOp === "div" && b === 0) { valEl.textContent = "除数不能为零"; return; }

  running = true;
  state = "animating";
  btnReplay.disabled = true;

  const sym = OP_SYM[curOp];
  const resultStr = formatResult(a, curOp, b);
  exprText.innerHTML = `${a} ${sym} ${b} <span class="eq-result" id="eqResult"> = ${resultStr}</span>`;
  exprEl.textContent = `${a} ${sym} ${b}`;
  valEl.textContent = "...";

  if (startAnim) build(curOp, a, b);
}

function formatResult(a, op, b) {
  if (op === "div") {
    if (b === 0) return "inf";
    // 与 buildDiv 相同的整数化逻辑，避免浮点精度问题
    const absA = Math.abs(a), absB = Math.abs(b);
    const bDecLen = String(absB).includes('.') ? String(absB).split('.')[1].length : 0;
    const dividendInt = Math.round(absA * Math.pow(10, bDecLen));
    const divisorInt = Math.round(absB * Math.pow(10, bDecLen));
    const q = Math.floor(dividendInt / divisorInt);
    const r = dividendInt - q * divisorInt;
    const sign = (a < 0) !== (b < 0) && q !== 0 ? '-' : '';
    return r === 0 ? sign + String(q) : `${sign}${q}......${r}`;
  }
  const result = op === "mul" ? a * b : op === "add" ? a + b : a - b;
  return String(parseFloat(result.toFixed(6)));
}

function showResult(a, op, b) {
  const sym = OP_SYM[op];
  const resultStr = formatResult(a, op, b);
  valEl.textContent = resultStr;
  exprEl.textContent = `${a} ${sym} ${b} = ${resultStr}`;
  const eqSpan = document.getElementById("eqResult");
  if (eqSpan) eqSpan.classList.add("show");
  running = false;
  state = "result";
  btnReplay.disabled = false;
  displayExplainIfReady();
}

/* 重绘按钮 */
const btnReplay = document.getElementById("btnReplay");
btnReplay.addEventListener("click", () => {
  if (!_lastCalc) return;
  _animCancel = false;
  running = true;
  state = "animating";
  btnReplay.disabled = true;
  valEl.textContent = "...";
  const { a, op, b } = _lastCalc;
  const sym = OP_SYM[op];
  exprText.innerHTML = `${a} ${sym} ${b} <span class="eq-result" id="eqResult"> = ${formatResult(a, op, b)}</span>`;
  replay();
});

/* 按钮事件 */
document.querySelectorAll(".calc-grid button").forEach(btn => {
  btn.addEventListener("click", () => {
    const act = btn.dataset.act;
    if (act >= "0" && act <= "9") inputDigit(act);
    else if (act === ".") inputDot();
    else if (act === "ac") inputAC();
    else if (act === "del") inputDel();
    else if (act === "neg") inputNeg();
    else if (act === "eq") doCalc();
    else if (["add","sub","mul","div"].includes(act)) inputOp(act);
  });
});

/* 键盘支持 */
document.addEventListener("keydown", e => {
  if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
  else if (e.key === ".") inputDot();
  else if (e.key === "Backspace") inputDel();
  else if (e.key === "Escape" || e.key === "Delete") inputAC();
  else if (e.key === "Enter" || e.key === "=") doCalc();
  else if (e.key === "+") inputOp("add");
  else if (e.key === "-") inputOp("sub");
  else if (e.key === "*") inputOp("mul");
  else if (e.key === "/") inputOp("div");
});

/* 初始化占位 */
showPlaceholder();
