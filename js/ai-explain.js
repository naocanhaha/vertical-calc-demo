/* AI 讲解并行请求 */

const OP_SYM = { add: "+", sub: "−", mul: "×", div: "÷" };

let _aiResult = null;
let _animDone = false;
let _aiVer = 0;
let _aiAbort = null;

function displayExplainIfReady() {
  _animDone = true;
  if (_aiResult === null) return;
  if (_aiResult === false) return;
  explainBody.innerHTML = _aiResult;
}

async function startExplainParallel(a, op, b, resultStr) {
  if (_aiAbort) _aiAbort.abort();
  _aiAbort = new AbortController();
  const ver = ++_aiVer;
  _aiResult = null;
  _animDone = false;
  explainBody.innerHTML = '<p class="placeholder">按 = 开始计算后<br>这里将显示竖式计算的讲解</p>';
  document.getElementById("explainNotice").style.display = "none";

  if (!cfgEnable.checked) { _aiResult = false; return; }
  const url = cfgUrl.value.trim();
  const key = cfgKey.value.trim();
  const model = cfgModel.value.trim();
  if (!url || !key || !model) { _aiResult = false; return; }

  const sym = OP_SYM[op];
  document.getElementById("explainNotice").style.display = "";
  explainBody.innerHTML = '<p class="loading">正在生成讲解</p>';

  let imgData = null;
  if (cfgVision.checked && cv.innerHTML.trim()) {
    imgData = await svgToBase64();
  }

  const opHint = {mul:"说明每一位的乘法和进位，以及部分积如何相加得到最终结果",div:"说明每一步的试商、乘减过程和最后的余数",add:"说明每一位的相加和进位过程",sub:"说明每一位的相减和借位过程"}[op];
  const calcDetail = buildCalcDetail(a, op, b, resultStr);
  const promptBase = `你是一位亲切有趣的小学数学老师，正在给学生讲解这道竖式计算：

${a} ${sym} ${b} = ${resultStr}

计算步骤明细：
${calcDetail}

要求：
- 按步骤逐步讲解，每一步说清楚算什么、写什么、进位/借位怎么处理
- 语气轻松活泼，像在课堂上跟小朋友说话，可以用比喻和鼓励的话
- ${opHint}
- 500字左右
- 算式用 LaTeX 行内格式，如 $4 \\times 6 = 24$
- 在讲解关键步骤时，用等宽字体的代码块画出那一小步的竖式图示，比如：
  \`\`\`
    88
  × 44
  ----
   352   ← 4×88
  \`\`\`
- 不要写"总结"之类的结尾套话`;

  const messages = [{ role: "user", content: [] }];
  if (imgData) {
    messages[0].content.push({ type: "image_url", image_url: { url: imgData } });
    messages[0].content.push({ type: "text", text: promptBase + "\n\n上方是这道竖式计算的书写过程图片，请结合图片中的具体数字进行讲解。" });
  } else {
    messages[0].content = [{ type: "text", text: promptBase + "\n\n（注意：你没有收到图片，但上方已提供完整的计算步骤明细，请据此详细讲解。）" }];
  }

  try {
    const resp = await fetch(url.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model, messages, max_tokens: 8192 }),
      signal: _aiAbort.signal
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().catch(() => "")}`);
    const data = await resp.json();
    if (ver !== _aiVer) return;
    const text = data.choices?.[0]?.message?.content
      || data.output?.text
      || "（未获取到回复）";
    _aiResult = renderMd(text);
  } catch (e) {
    if (ver !== _aiVer || e.name === "AbortError") return;
    _aiResult = `<p class="err">请求失败: ${e.message}</p>`;
  }
  if (_animDone) {
    explainBody.innerHTML = _aiResult;
  }
}

/* 生成文字版计算步骤明细，供非多模态模型参考 */
function buildCalcDetail(a, op, b, resultStr) {
  const lines = [];
  if (op === "mul") {
    const aStr = String(Math.abs(a)).replace('.', '');
    const bInt = [...String(Math.abs(b)).replace('.', '')].map(Number);
    const aInt = [...String(Math.abs(a)).replace('.', '')].map(Number);
    const partials = [];
    for (let i = bInt.length - 1; i >= 0; i--) {
      const bd = bInt[i];
      if (bd === 0) continue;
      let carry = 0; const pd = [];
      for (let j = aInt.length - 1; j >= 0; j--) {
        const p = bd * aInt[j] + carry;
        pd.unshift(p % 10);
        carry = Math.floor(p / 10);
      }
      if (carry > 0) pd.unshift(carry);
      const shift = bInt.length - 1 - i;
      partials.push({ digits: pd, digit: bd, shift, value: parseInt(pd.join(''), 10) });
    }
    partials.forEach(p => {
      const pos = p.shift > 0 ? `（左移${p.shift}位）` : '';
      lines.push(`- ${p.digit} × ${aStr} = ${p.value}${pos}`);
    });
    if (partials.length > 1) {
      lines.push(`- 最终将 ${partials.map(p => p.value).join(' + ')} 相加 = ${resultStr}`);
    }
  } else if (op === "add") {
    const pa = parseNum(a), pb = parseNum(b);
    const { aD, bD } = padAddSub(pa, pb);
    const maxC = Math.max(aD.length, bD.length);
    let carry = 0;
    for (let c = 0; c < maxC; c++) {
      const ai = aD.length - 1 - c, bi = bD.length - 1 - c;
      const av = ai >= 0 ? aD[ai] : 0, bv = bi >= 0 ? bD[bi] : 0;
      const s = av + bv + carry;
      const newCarry = Math.floor(s / 10);
      lines.push(`- 第${c + 1}位：${av} + ${bv}${carry ? ' + ' + carry + '(进位)' : ''} = ${s}，写${s % 10}${newCarry ? '，进' + newCarry : ''}`);
      carry = newCarry;
    }
  } else if (op === "sub") {
    const negative = a < b;
    const big = negative ? b : a, small = negative ? a : b;
    const pBig = parseNum(big), pSmall = parseNum(small);
    const { aD: topD, bD: botD } = padAddSub(pBig, pSmall);
    const totalCols = topD.length;
    let borrow = 0;
    for (let c = 0; c < totalCols; c++) {
      const ai = topD.length - 1 - c, bi = botD.length - 1 - c;
      let top = topD[ai] - borrow;
      const bot = bi >= 0 ? botD[bi] : 0;
      const didBorrow = top < bot;
      if (didBorrow) top += 10;
      const diff = top - bot;
      lines.push(`- 第${c + 1}位：${topD[ai]}${borrow ? ' − ' + borrow + '(借位)' : ''} = ${top}，${top} − ${bot} = ${diff}${didBorrow ? '（借位）' : ''}`);
      borrow = didBorrow ? 1 : 0;
    }
    if (negative) lines.push(`- 结果为负数`);
  } else if (op === "div") {
    // 与 buildDiv 相同的整数化逻辑
    const divisor = Math.abs(b);
    const dividend = Math.abs(a);
    const bDecLen = String(divisor).includes('.') ? String(divisor).split('.')[1].length : 0;
    const dividendInt = Math.round(dividend * Math.pow(10, bDecLen));
    const divisorInt = Math.round(divisor * Math.pow(10, bDecLen));
    const divResult = computeDivisionSteps(dividendInt, divisorInt);
    divResult.steps.forEach((step, i) => {
      lines.push(`- 第${i + 1}步：${step.dividendPart} ÷ ${divisorInt} = 商${step.quotientDigit}，${step.quotientDigit} × ${divisorInt} = ${step.productValue}，余${step.remainder}`);
    });
    const q = Math.floor(dividendInt / divisorInt);
    const r = dividendInt - q * divisorInt;
    lines.push(`- 最终：商 = ${q}，余数 = ${r}`);
  }
  return lines.join('\n');
}
