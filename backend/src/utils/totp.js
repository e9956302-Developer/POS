import crypto from "node:crypto";

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input) {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

export function generateTotpSecret(numBytes = 20) {
  const randomBytes = crypto.randomBytes(numBytes);
  return base32Encode(randomBytes);
}

export function generateTotpToken(secret, time = Date.now(), period = 30, digits = 6) {
  const counter = Math.floor(time / 1000 / period);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigUInt64BE(BigInt(counter));

  const keyBuffer = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", keyBuffer).update(timeBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

export function verifyTotpToken(token, secret, window = 1, period = 30, digits = 6) {
  if (!token || !secret) return false;
  const cleanToken = String(token).trim();
  if (cleanToken.length !== digits || !/^\d+$/.test(cleanToken)) return false;

  const now = Date.now();
  for (let step = -window; step <= window; step++) {
    const checkTime = now + step * period * 1000;
    const expected = generateTotpToken(secret, checkTime, period, digits);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

export function generateTotpUri(label, issuer, secret) {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedLabel = encodeURIComponent(label);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part3 = crypto.randomBytes(2).toString("hex").toUpperCase();
    codes.push(`${part1}-${part2}-${part3}`);
  }
  return codes;
}

export function hashRecoveryCode(code) {
  const normalized = String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function verifyRecoveryCodeHash(inputCode, storedHash) {
  const inputHash = hashRecoveryCode(inputCode);
  return crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(storedHash));
}
