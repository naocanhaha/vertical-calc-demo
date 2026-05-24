/* SVG 工具函数 */

function parseNum(n) {
  if (!Number.isFinite(n)) return { neg: false, intD: [0], decD: [] };
  const neg = n < 0;
  const s = String(Math.abs(n));
  if (s.includes(".")) {
    const [ip, dp] = s.split(".");
    return { neg, intD: (ip||"0").split("").map(Number), decD: dp.split("").map(Number) };
  }
  return { neg, intD: (s==="0"?[0]:[...s].map(Number)), decD: [] };
}

function dpXAt(decLen, rightX, colW) {
  return rightX - decLen * colW + colW / 2;
}

function lineLR(gx, maxCols, signCol, rightX) {
  const leftMost = gx(Math.max(maxCols, signCol));
  return { left: leftMost - 30, right: rightX + 30 };
}

/* 从左往右写数字，跳过前导零 */
function writeDigitsInline(items, digits, decLen, rightX, colW, y, sc) {
  const gx = c => rightX - c * colW;
  const intLen = digits.length - decLen;
  const minKeep = decLen > 0 ? intLen : intLen - 1;
  let startIdx = 0;
  while (startIdx < minKeep && digits[startIdx] === 0) startIdx++;
  if (decLen > 0 && startIdx >= intLen) startIdx = intLen - 1;
  for (let i = startIdx; i < digits.length; i++) {
    addStroke(items, D[digits[i]], gx(digits.length - 1 - i), y, sc);
    if (decLen > 0 && i === intLen - 1)
      addDP(items, dpXAt(decLen, rightX, colW), y + DPY);
  }
}

/* 划掉末尾零 */
function crossoutTrailing(items, rD, decCount, rightX, colW, yR, sc) {
  if (decCount <= 0) return;
  const gx = c => rightX - c * colW;
  let trailZeros = 0;
  for (let i = rD.length - 1; i >= Math.max(0, rD.length - decCount); i--) {
    if (rD[i] === 0) trailZeros++; else break;
  }
  if (trailZeros === 0) return;
  for (let k = 0; k < trailZeros; k++) addCrossout(items, gx(k), yR, sc);
  if (trailZeros >= decCount) addCrossout(items, dpXAt(decCount, rightX, colW), yR + DPY, 1);
}

/* 对齐辅助 */
function padAddSub(pa, pb) {
  const maxInt = Math.max(pa.intD.length, pb.intD.length);
  const maxDec = Math.max(pa.decD.length, pb.decD.length);
  const aInt = [...Array(maxInt - pa.intD.length).fill(0), ...pa.intD];
  const bInt = [...Array(maxInt - pb.intD.length).fill(0), ...pb.intD];
  const aDec = [...pa.decD, ...Array(maxDec - pa.decD.length).fill(0)];
  const bDec = [...pb.decD, ...Array(maxDec - pb.decD.length).fill(0)];
  return { aD: [...aInt, ...aDec], bD: [...bInt, ...bDec], dpCol: maxDec };
}

function padResult(rP, dpCol) {
  let { intD, decD } = rP;
  let dec = [...decD];
  while (dec.length < dpCol) dec.push(0);
  if (intD.length === 0 || (intD.length === 1 && intD[0] === 0 && dpCol > 0))
    intD = [0];
  return [...intD, ...dec];
}
