/**
 * Compact, self-contained QR Code Generator (Version 1-4, ECC Level M/L)
 * Produces crisp SVG paths without external dependencies.
 */

// Galois Field GF(256) log/antilog tables
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
let x = 1;
for (let i = 0; i < 255; i++) {
  EXP_TABLE[i] = x;
  LOG_TABLE[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}
EXP_TABLE[255] = EXP_TABLE[0];

function glog(n) {
  if (n < 1) throw new Error("glog(" + n + ")");
  return LOG_TABLE[n];
}
function gexp(n) {
  while (n < 0) n += 255;
  while (n >= 256) n -= 255;
  return EXP_TABLE[n];
}

// Polynomial operations
function polyMultiply(p1, p2) {
  const result = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]));
    }
  }
  return result;
}

function polyMod(dividend, divisor) {
  let result = new Uint8Array(dividend);
  while (result.length >= divisor.length) {
    const lead = result[0];
    if (lead === 0) {
      result = result.slice(1);
      continue;
    }
    const factor = glog(lead);
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gexp(glog(divisor[i]) + factor);
    }
    result = result.slice(1);
  }
  return result;
}

function getGeneratorPoly(numEC) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < numEC; i++) {
    g = polyMultiply(g, new Uint8Array([1, gexp(i)]));
  }
  return g;
}

// Version configs (capacity in 8-bit bytes for L/M)
// Version 1: 21x21, EC=7 (L) or 10 (M). Cap: 17/14 bytes
// Version 2: 25x25, EC=10 (L) or 16 (M). Cap: 32/26 bytes
// Version 3: 29x29, EC=15 (L) or 26 (M). Cap: 53/42 bytes
// Version 4: 33x33, EC=20 (L) or 36 (M). Cap: 78/62 bytes
const VERSIONS = [
  null,
  { size: 21, totalBytes: 26, ecBytes: 10, dataBytes: 16 },
  { size: 25, totalBytes: 44, ecBytes: 16, dataBytes: 28 },
  { size: 29, totalBytes: 70, ecBytes: 26, dataBytes: 44 },
  { size: 33, totalBytes: 100, ecBytes: 36, dataBytes: 64 }
];

export function generateQRCodeMatrix(text) {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Pick smallest version
  let version = 1;
  while (version <= 4 && rawBytes.length + 3 > VERSIONS[version].dataBytes) {
    version++;
  }
  if (version > 4) {
    // Truncate text if exceeds version 4 capacity
    version = 4;
  }
  const cfg = VERSIONS[version];

  // Encode data into bits: 0100 (Byte mode) + length (8 bits) + data + terminator (4 bits)
  const bitBuffer = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitBuffer.push((val >>> i) & 1);
    }
  }

  pushBits(0b0100, 4); // Byte mode
  const lenToEncode = Math.min(rawBytes.length, cfg.dataBytes - 2);
  pushBits(lenToEncode, 8);
  for (let i = 0; i < lenToEncode; i++) {
    pushBits(rawBytes[i], 8);
  }
  // Terminator
  for (let i = 0; i < 4 && bitBuffer.length < cfg.dataBytes * 8; i++) {
    bitBuffer.push(0);
  }
  // Pad to byte boundary
  while (bitBuffer.length % 8 !== 0) {
    bitBuffer.push(0);
  }
  // Pad bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bitBuffer.length < cfg.dataBytes * 8) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to byte array
  const dataBytes = new Uint8Array(cfg.dataBytes);
  for (let i = 0; i < cfg.dataBytes; i++) {
    let byteVal = 0;
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bitBuffer[i * 8 + b];
    }
    dataBytes[i] = byteVal;
  }

  // Calculate Reed-Solomon EC bytes
  const genPoly = getGeneratorPoly(cfg.ecBytes);
  const msgPoly = new Uint8Array(cfg.totalBytes);
  msgPoly.set(dataBytes, 0);
  const ecBytes = polyMod(msgPoly, genPoly);

  // Combine data + EC bytes
  const finalCodewords = new Uint8Array(cfg.totalBytes);
  finalCodewords.set(dataBytes, 0);
  finalCodewords.set(ecBytes, cfg.dataBytes);

  // Initialize Matrix
  const size = cfg.size;
  const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));

  // 1. Finder patterns (Top-left, Top-right, Bottom-left)
  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r;
        const nc = col + c;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[nr][nc] = 1;
        } else {
          matrix[nr][nc] = 0;
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment pattern for Version 2, 3, 4
  if (version >= 2) {
    const alignPos = version === 2 ? [6, 18] : version === 3 ? [6, 22] : [6, 26];
    const r = alignPos[1];
    const c = alignPos[1];
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
          matrix[r + dr][c + dc] = 1;
        } else {
          matrix[r + dr][c + dc] = 0;
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === -1) matrix[6][i] = i % 2 === 0 ? 1 : 0;
    if (matrix[i][6] === -1) matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // 4. Dark module
  matrix[4 * version + 9][8] = 1;

  // 5. Reserve format info
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = 0;
    if (matrix[i][8] === -1) matrix[i][8] = 0;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === -1) matrix[8][i] = 0;
    if (matrix[i][8] === -1) matrix[i][8] = 0;
  }

  // 6. Place data bits
  let bitIdx = 0;
  const totalBits = cfg.totalBytes * 8;
  let upward = true;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--; // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (let c = 0; c < 2; c++) {
        const nc = col - c;
        if (matrix[row][nc] === -1) {
          let bit = 0;
          if (bitIdx < totalBits) {
            const byte = finalCodewords[Math.floor(bitIdx / 8)];
            bit = (byte >>> (7 - (bitIdx % 8))) & 1;
            bitIdx++;
          }
          // Mask pattern 0: (row + col) % 2 === 0
          if ((row + nc) % 2 === 0) {
            bit ^= 1;
          }
          matrix[row][nc] = bit;
        }
      }
    }
    upward = !upward;
  }

  // 7. Format Information (Mask 0, ECC M: 101010000010010 XOR 101010000010010 = 000000000000000)
  // Standard format for ECC M, Mask 0: 0b101010000010010 ^ 0b101010000010010
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  // Apply format bits around top-left finder and others
  const coords1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    matrix[coords1[i][0]][coords1[i][1]] = formatBits[i];
  }
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i];
  }
  for (let i = 7; i < 15; i++) {
    matrix[8][size - 15 + i] = formatBits[i];
  }

  return matrix;
}

/**
 * Returns an SVG element representation for rendering or embedding.
 */
export function QRCodeSVG({ text, size = 100, fgColor = "#000000", bgColor = "#ffffff" }) {
  if (!text) return null;
  const matrix = generateQRCodeMatrix(text);
  const n = matrix.length;
  const cellSize = 1;

  let pathData = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 1) {
        pathData += `M${c},${r}h1v1h-1z `;
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      style={{ display: "inline-block", background: bgColor, borderRadius: "4px" }}
    >
      <rect width={n} height={n} fill={bgColor} />
      <path d={pathData} fill={fgColor} shapeRendering="crispEdges" />
    </svg>
  );
}
