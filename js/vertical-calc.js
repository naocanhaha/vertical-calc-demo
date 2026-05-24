/* 四则运算竖式构建 */

let _lastCalc = null; // {a, op, b} 用于重绘

function build(op, a, b) {
  _lastCalc = { a, op, b };
  buildAndAnimate(op, a, b, true);
}

function replay() {
  if (!_lastCalc) return;
  const { a, op, b } = _lastCalc;
  buildAndAnimate(op, a, b, false);
}

function buildAndAnimate(op, a, b, withAI) {
  cv.innerHTML = "";
  const items = [];
  const sc = 0.75, colW = 72, ss = 0.85;
  const pa = parseNum(a), pb = parseNum(b);
  let aborted = false;
  if (op === "mul") buildMul(items, pa, pb, a, b, sc, colW, ss);
  else if (op === "add") buildAdd(items, pa, pb, a, b, sc, colW, ss);
  else if (op === "div") aborted = buildDiv(items, pa, pb, a, b, sc, colW, ss);
  else buildSub(items, pa, pb, a, b, sc, colW, ss);
  if (aborted) return;
  if (withAI) {
    const resultStr = formatResult(a, op, b);
    startExplainParallel(a, op, b, resultStr);
  }
  animAll(items, op, a, b);
}

/* ══════════ 乘法 ══════════ */
function buildMul(items, pa, pb, a, b, sc, colW, ss) {
  const aDecLen = pa.decD.length, bDecLen = pb.decD.length;
  const totalDec = aDecLen + bDecLen;
  const aInt = [...pa.intD, ...pa.decD];
  const bInt = [...pb.intD, ...pb.decD];
  const aStr = String(Math.abs(a)).replace('.', '');
  const bStr = String(Math.abs(b)).replace('.', '');
  const resultInt = parseInt(aStr) * parseInt(bStr);
  let rStr = String(resultInt);
  while (rStr.length <= totalDec) rStr = '0' + rStr;
  const rD = [...rStr].map(Number);
  const partials = [];
  for (let i = bInt.length - 1; i >= 0; i--) {
    const bd = bInt[i];
    if (bd === 0) continue;
    let carry = 0;
    const pd = [], pc = [];
    for (let j = aInt.length - 1; j >= 0; j--) {
      const p = bd * aInt[j] + carry;
      pd.unshift(p % 10);
      carry = Math.floor(p / 10);
      pc.push(carry);
    }
    if (carry > 0) pd.unshift(carry);
    partials.push({ digits: pd, carries: pc, shift: bInt.length - 1 - i });
  }
  const simpleMul = partials.length === 1 && partials[0].shift === 0;
  if (simpleMul) {
    const p = partials[0];
    const maxCols = Math.max(aInt.length, bInt.length, rD.length);
    const signCol = Math.max(aInt.length, bInt.length);
    const rightX = maxCols * colW + 80;
    const y1 = 60, y2 = 130, yL = 170, yR = yL + 60;
    const yC = yL - 14;
    const gx = c => rightX - c * colW;
    setSize(rightX + 70, yR + 55);
    const lb = lineLR(gx, maxCols, signCol, rightX);
    writeDigitsInline(items, aInt, aDecLen, rightX, colW, y1, sc);
    writeDigitsInline(items, bInt, bDecLen, rightX, colW, y2, sc);
    addStroke(items, SIGN.mul, gx(signCol) - 18, y2, sc * ss);
    addLine(items, lb.left, yL, lb.right - lb.left);
    const n = rD.length;
    const lastPc = p.carries[p.carries.length - 1];
    const hiCarry = lastPc > 0 && rD[0] === lastPc;
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    if (hiCarry) { [order[n - 2], order[n - 1]] = [n - 1, n - 2]; }
    order.forEach(pos => {
      if (totalDec > 0 && pos === totalDec)
        addDP(items, dpXAt(totalDec, rightX, colW), yR + DPY);
      if (pos < n - 1 && pos < p.carries.length - 1 && p.carries[pos] > 0)
        addFade(items, D[p.carries[pos]], gx(pos + 1) + 8, yC, sc * 0.45);
      addStroke(items, D[rD[n - 1 - pos]], gx(pos), yR, sc);
    });
    crossoutTrailing(items, rD, totalDec, rightX, colW, yR, sc);
  } else {
    const sumCarries = [];
    let sc2 = 0;
    for (let c = 0; c < rD.length; c++) {
      let colSum = sc2;
      partials.forEach(p => {
        const j = c - p.shift;
        if (j >= 0 && j < p.digits.length) colSum += p.digits[p.digits.length - 1 - j];
      });
      sc2 = Math.floor(colSum / 10);
      sumCarries.push(sc2);
    }
    const maxCols = Math.max(aInt.length, bInt.length, rD.length,
      ...partials.map(p => p.shift + p.digits.length));
    const rightX = maxCols * colW + 80;
    const y1 = 60, y2 = 130, yL1 = 170, rowH = 60, y3 = 220;
    const yL2 = y3 + Math.max(partials.length, 1) * rowH + 8;
    const ySumC = yL2 - 14;
    const yR = yL2 + 65;
    const gx = c => rightX - c * colW;
    setSize(rightX + 70, yR + 55);
    const signCol = Math.max(aInt.length, bInt.length);
    const lb = lineLR(gx, maxCols, signCol, rightX);
    writeDigitsInline(items, aInt, aDecLen, rightX, colW, y1, sc);
    writeDigitsInline(items, bInt, bDecLen, rightX, colW, y2, sc);
    addStroke(items, SIGN.mul, gx(signCol) - 18, y2, sc * ss);
    addLine(items, lb.left, yL1, lb.right - lb.left);
    partials.forEach(p => {
      const row = y3 + p.shift * rowH;
      const pd = p.digits, pc = p.carries, n = pd.length;
      const pLastC = pc[pc.length - 1];
      const pHiCarry = pLastC > 0 && pd[0] === pLastC;
      const order = [];
      for (let i = 0; i < n; i++) order.push(i);
      if (pHiCarry) { [order[n - 2], order[n - 1]] = [n - 1, n - 2]; }
      order.forEach(pos => {
        if (pos < n - 1 && pos < pc.length - 1 && pc[pos] > 0)
          addFade(items, D[pc[pos]], gx(pos + 1 + p.shift) + 10, row - 32, sc * 0.45, "carry-mul");
        addStroke(items, D[pd[n - 1 - pos]], gx(pos + p.shift), row, sc);
      });
    });
    addLine(items, lb.left, yL2, lb.right - lb.left);
    const n = rD.length;
    const sHiCarry = n >= 2 && sumCarries[n - 2] > 0 && rD[0] === sumCarries[n - 2];
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    if (sHiCarry) { [order[n - 2], order[n - 1]] = [n - 1, n - 2]; }
    order.forEach(c => {
      if (totalDec > 0 && c === totalDec)
        addDP(items, dpXAt(totalDec, rightX, colW), yR + DPY);
      if (sumCarries[c] > 0 && c < n - 1 && !(sHiCarry && c === n - 2))
        addFade(items, D[sumCarries[c]], gx(c + 1) + 8, ySumC, sc * 0.48);
      addStroke(items, D[rD[n - 1 - c]], gx(c), yR, sc);
    });
    crossoutTrailing(items, rD, totalDec, rightX, colW, yR, sc);
  }
}

/* ══════════ 加法 ══════════ */
function buildAdd(items, pa, pb, a, b, sc, colW, ss) {
  const result = a + b;
  const rP = parseNum(result);
  const { aD, bD, dpCol } = padAddSub(pa, pb);
  const rD = padResult(rP, dpCol);
  const neg = result < 0;
  const totalCols = aD.length;
  const maxC = Math.max(totalCols, rD.length);
  const rightX = maxC * colW + 80;
  const y1 = 70, y2 = 140, yL = 178, yC = yL - 14, yR = 250;
  const gx = c => rightX - c * colW;
  setSize(rightX + 70, yR + 55);
  const lb = lineLR(gx, maxC, Math.max(aD.length, bD.length), rightX);
  writeDigitsInline(items, aD, dpCol, rightX, colW, y1, sc);
  writeDigitsInline(items, bD, dpCol, rightX, colW, y2, sc);
  addStroke(items, SIGN.add, gx(Math.max(aD.length, bD.length)) - 18, y2, sc * ss);
  addLine(items, lb.left, yL, lb.right - lb.left);
  const carries = [];
  let carry = 0;
  for (let c = 0; c < maxC; c++) {
    const ai = aD.length - 1 - c, bi = bD.length - 1 - c;
    let s = carry + (ai >= 0 ? aD[ai] : 0) + (bi >= 0 ? bD[bi] : 0);
    carry = Math.floor(s / 10);
    carries.push(carry);
  }
  if (neg) addStroke(items, SIGN.neg, gx(rD.length) - 10, yR, sc * 0.6);
  const n = rD.length;
  const highestIsCarry = n >= 2 && carries[n - 2] > 0 && rD[0] === carries[n - 2];
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  if (highestIsCarry) { [order[n - 2], order[n - 1]] = [n - 1, n - 2]; }
  order.forEach(c => {
    if (dpCol > 0 && c === dpCol)
      addDP(items, dpXAt(dpCol, rightX, colW), yR + DPY);
    if (carries[c] > 0 && c < n - 1 && !(highestIsCarry && c === n - 2))
      addFade(items, D[carries[c]], gx(c + 1) + 8, yC, sc * 0.45);
    addStroke(items, D[rD[n - 1 - c]], gx(c), yR, sc);
  });
  crossoutTrailing(items, rD, dpCol, rightX, colW, yR, sc);
}

/* ══════════ 减法 ══════════ */
function buildSub(items, pa, pb, a, b, sc, colW, ss) {
  const negative = a < b;
  const big = negative ? b : a, small = negative ? a : b;
  const pBig = parseNum(big), pSmall = parseNum(small);
  const result = big - small;
  const rP = parseNum(result);
  const { aD: topD, bD: botD, dpCol } = padAddSub(pBig, pSmall);
  const rD = padResult(rP, dpCol);
  const totalCols = topD.length;
  const maxC = Math.max(totalCols, rD.length);
  const rightX = maxC * colW + 80;
  const y1 = 70, y2 = 140, yL = 178, yR = 250;
  const gx = c => rightX - c * colW;
  setSize(rightX + 70, yR + 55);
  const lb = lineLR(gx, maxC, Math.max(topD.length, botD.length), rightX);
  writeDigitsInline(items, topD, dpCol, rightX, colW, y1, sc);
  writeDigitsInline(items, botD, dpCol, rightX, colW, y2, sc);
  addStroke(items, SIGN.sub, gx(Math.max(topD.length, botD.length)) - 18, y2, sc * ss);
  addLine(items, lb.left, yL, lb.right - lb.left);
  const borrowNeeded = new Set();
  let borrow = 0;
  for (let c = 0; c < totalCols; c++) {
    const ai = topD.length - 1 - c, bi = botD.length - 1 - c;
    let top = topD[ai] - borrow;
    const bot = bi >= 0 ? botD[bi] : 0;
    if (top < bot) { top += 10; borrow = 1; borrowNeeded.add(c); }
    else { borrow = 0; }
  }
  if (negative) addStroke(items, SIGN.neg, gx(rD.length) - 10, yR, sc * 0.6);
  for (let c = 0; c < rD.length; c++) {
    if (dpCol > 0 && c === dpCol)
      addDP(items, dpXAt(dpCol, rightX, colW), yR + DPY);
    if (borrowNeeded.has(c))
      addDotBorrow(items, gx(c + 1), y1 - 35);
    addStroke(items, D[rD[rD.length - 1 - c]], gx(c), yR, sc);
  }
  crossoutTrailing(items, rD, dpCol, rightX, colW, yR, sc);
}

/* ══════════ 除法 ══════════ */
function buildDiv(items, pa, pb, a, b, sc, colW, ss) {
  if (b === 0) { running = false; state = "idle"; valEl.textContent = "除数不能为零"; return true; }
  const dividend = Math.abs(a), divisor = Math.abs(b);
  const aDecLen = pa.decD.length, bDecLen = pb.decD.length;
  const dividendInt = Math.round(dividend * Math.pow(10, bDecLen));
  const divisorInt = Math.round(divisor * Math.pow(10, bDecLen));
  // 放大后被除数的实际小数位数
  const scaledDecLen = Math.max(0, aDecLen - bDecLen);
  const divResult = computeDivisionSteps(dividendInt, divisorInt);
  const divDigits = [...String(divisorInt)].map(Number);
  const dvdDigits = [...String(dividendInt)].map(Number);
  const n = dvdDigits.length;
  const rightX = (n + divDigits.length + 2) * colW + 80;
  const gx = c => rightX - c * colW;
  const bracketX = gx(n - 1) - 35;
  const divLeftX = bracketX - divDigits.length * colW + 10;
  const yQ = 50, yDvd = 115, yTopLine = yDvd - 32;
  const stepH = 130;
  const startY = yDvd + 42;
  const numSteps = divResult.steps.length;
  const svgH = startY + numSteps * stepH + 20;
  setSize(rightX + 50, svgH);
  divDigits.forEach((d, i) => {
    addStroke(items, D[d], divLeftX + i * colW * 0.8, yDvd, sc);
  });
  const vl = mk("line", {
    x1: bracketX, y1: yTopLine, x2: bracketX, y2: yDvd + 30,
    stroke: "#1a1a2e", "stroke-width": 2.8, "stroke-linecap": "round"
  });
  cv.appendChild(vl);
  items.push({ el: vl, len: (yDvd + 30) - yTopLine, type: "stroke" });
  addLine(items, bracketX, yTopLine, gx(0) + 40 - bracketX);
  writeDigitsInline(items, dvdDigits, scaledDecLen, rightX, colW, yDvd, sc);
  if (scaledDecLen > 0) addDP(items, dpXAt(scaledDecLen, rightX, colW), yQ + DPY);
  let prevUpperY = yDvd;
  divResult.steps.forEach((step, si) => {
    const yUpper = (si === 0) ? prevUpperY : (startY + (si - 1) * stepH + 95);
    const yProd = startY + si * stepH;
    const yLine = yProd + 32;
    const yRem = yProd + 72;
    if (step.quotientDigit > 0 || si > 0 || step === divResult.steps[divResult.steps.length - 1]) {
      addStroke(items, D[step.quotientDigit], gx(step.quotientCol), yQ, sc);
    }
    const prod = step.productDigits;
    const prodLeft = step.productColEnd + prod.length - 1;
    for (let j = 0; j < prod.length; j++) {
      addStroke(items, D[prod[j]], gx(prodLeft - j), yProd, sc);
    }
    const lineL = gx(prodLeft) - 25;
    const lineR = gx(0) + 25;
    addLine(items, lineL, yLine, lineR - lineL);
    const borrows = computeBorrow(step.dividendPart, step.productValue);
    const isLast = si === numSteps - 1;
    const rem = step.remainder;
    if (rem > 0 || isLast) {
      const remStr = String(rem);
      const remD = [...remStr].map(Number);
      for (let j = 0; j < remD.length; j++) {
        const col = step.productColEnd + j;
        if (j < borrows.length && borrows[j]) {
          addDotBorrow(items, gx(col + 1), prevUpperY - 28);
        }
        addStroke(items, D[remD[remD.length - 1 - j]], gx(col), yRem, sc);
      }
    } else {
      for (let j = 0; j < borrows.length; j++) {
        if (borrows[j]) addDotBorrow(items, gx(step.productColEnd + j + 1), prevUpperY - 28);
      }
    }
    if (!isLast && step.nextDigitIndex >= 0) {
      const dropDigit = dvdDigits[step.nextDigitIndex];
      const dropCol = step.quotientCol - 1;
      addStroke(items, D[dropDigit], gx(dropCol), yRem, sc);
    }
    prevUpperY = yRem;
  });
  return false;
}

function computeBorrow(minuend, subtrahend) {
  const mD = [...String(minuend)].map(Number);
  const sD = [...String(subtrahend)].map(Number);
  const maxLen = Math.max(mD.length, sD.length);
  while (mD.length < maxLen) mD.unshift(0);
  while (sD.length < maxLen) sD.unshift(0);
  const borrows = [];
  let borrow = 0;
  for (let i = maxLen - 1; i >= 0; i--) {
    const top = mD[i] - borrow;
    const bot = sD[i];
    if (top < bot) { borrows.push(true); borrow = 1; }
    else { borrows.push(false); borrow = 0; }
  }
  return borrows;
}

function computeDivisionSteps(dividend, divisor) {
  const dvdDigits = [...String(dividend)].map(Number);
  const n = dvdDigits.length;
  const quotientDigits = [];
  const steps = [];
  let remainder = 0, started = false;
  for (let i = 0; i < n; i++) {
    remainder = remainder * 10 + dvdDigits[i];
    const q = Math.floor(remainder / divisor);
    const product = q * divisor;
    const newRem = remainder - product;
    quotientDigits.push(q);
    const col = n - 1 - i;
    if (q > 0 || started || i === n - 1) {
      started = true;
      steps.push({
        quotientDigit: q, quotientCol: col,
        productDigits: [...String(product)].map(Number),
        productColEnd: col, productValue: product,
        dividendPart: remainder, remainder: newRem,
        nextDigitIndex: i < n - 1 ? i + 1 : -1,
      });
    }
    remainder = newRem;
  }
  if (steps.length === 0) {
    steps.push({
      quotientDigit: 0, quotientCol: n - 1,
      productDigits: [0], productColEnd: n - 1, productValue: 0,
      dividendPart: dividend, remainder: dividend, nextDigitIndex: -1,
    });
  }
  return { quotientDigits, steps, remainder: steps[steps.length - 1].remainder };
}
