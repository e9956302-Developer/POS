import test from "node:test";
import assert from "node:assert/strict";
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpToken,
  verifyTotpToken,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyRecoveryCodeHash
} from "../src/utils/totp.js";

test("TOTP - RFC 4648 Base32 vectors", () => {
  const vectors = [
    ["", ""],
    ["f", "MY"],
    ["fo", "MZXQ"],
    ["foo", "MZXW6"],
    ["foob", "MZXW6YQ"],
    ["fooba", "MZXW6YTB"],
    ["foobar", "MZXW6YTBOI"]
  ];
  for (const [plain, enc] of vectors) {
    assert.equal(base32Encode(Buffer.from(plain)), enc);
    assert.equal(base32Decode(enc).toString(), plain);
  }
});

test("TOTP - RFC 6238 Official SHA-1 Test Vectors", () => {
  const secretBytes = Buffer.from("12345678901234567890", "ascii");
  const secret = base32Encode(secretBytes);

  const vectors = [
    { time: 59, expected: "287082" },
    { time: 1111111109, expected: "081804" },
    { time: 1111111111, expected: "050471" },
    { time: 1234567890, expected: "005924" },
    { time: 2000000000, expected: "279037" }
  ];

  for (const v of vectors) {
    const code = generateTotpToken(secret, v.time * 1000);
    assert.equal(code, v.expected);
  }
});

test("TOTP - Clock Drift Tolerance (Window = 2 covers +/- 60s)", () => {
  const secret = generateTotpSecret(20);
  const now = Date.now();

  // Current token
  const currentToken = generateTotpToken(secret, now);
  assert.equal(verifyTotpToken(currentToken, secret), true, "Current token must be valid");

  // Tokens 30s in past (-1 step) and 60s in past (-2 steps)
  const past30Token = generateTotpToken(secret, now - 30000);
  const past60Token = generateTotpToken(secret, now - 60000);
  assert.equal(verifyTotpToken(past30Token, secret), true, "-30s token must be valid with window=2");
  assert.equal(verifyTotpToken(past60Token, secret), true, "-60s token must be valid with window=2");

  // Tokens 30s in future (+1 step) and 60s in future (+2 steps)
  const future30Token = generateTotpToken(secret, now + 30000);
  const future60Token = generateTotpToken(secret, now + 60000);
  assert.equal(verifyTotpToken(future30Token, secret), true, "+30s token must be valid with window=2");
  assert.equal(verifyTotpToken(future60Token, secret), true, "+60s token must be valid with window=2");

  // Far past (-120s) and far future (+120s) must be rejected
  const farPast = generateTotpToken(secret, now - 120000);
  const farFuture = generateTotpToken(secret, now + 120000);
  assert.equal(verifyTotpToken(farPast, secret), false, "-120s token must be rejected");
  assert.equal(verifyTotpToken(farFuture, secret), false, "+120s token must be rejected");
});

test("TOTP - Clipboard Formatting Robustness (spaces, hyphens, non-breaking spaces)", () => {
  const secret = generateTotpSecret(20);
  const code = generateTotpToken(secret);
  const p1 = code.slice(0, 3);
  const p2 = code.slice(3);

  // Authenticator app copied with space: "123 456"
  assert.equal(verifyTotpToken(`${p1} ${p2}`, secret), true, "Token with middle space must be accepted");

  // Token with hyphen: "123-456"
  assert.equal(verifyTotpToken(`${p1}-${p2}`, secret), true, "Token with hyphen must be accepted");

  // Token with leading/trailing spaces
  assert.equal(verifyTotpToken(`   ${code}   `, secret), true, "Token with outer spaces must be accepted");

  // Token with non-breaking space (from mobile keyboards)
  assert.equal(verifyTotpToken(`${p1}\u00A0${p2}`, secret), true, "Token with NBSP must be accepted");

  // Invalid tokens
  assert.equal(verifyTotpToken(code.slice(0, 5), secret), false, "5-digit token must be rejected");
  assert.equal(verifyTotpToken(code + "9", secret), false, "7-digit token must be rejected");
  assert.equal(verifyTotpToken("ABCDEF", secret), false, "Alphabetical token must be rejected");
  assert.equal(verifyTotpToken("", secret), false, "Empty token must be rejected");
  assert.equal(verifyTotpToken(null, secret), false, "Null token must be rejected");
});

test("TOTP - Recovery Code generation and constant-time verification", () => {
  const codes = generateRecoveryCodes(10);
  assert.equal(codes.length, 10);

  for (const rawCode of codes) {
    const hash = hashRecoveryCode(rawCode);
    assert.equal(verifyRecoveryCodeHash(rawCode, hash), true, "Valid code matches hash");

    // Lowercase and stripped dashes also match
    assert.equal(verifyRecoveryCodeHash(rawCode.toLowerCase(), hash), true);
    assert.equal(verifyRecoveryCodeHash(rawCode.replace(/-/g, ""), hash), true);

    // Wrong code fails
    assert.equal(verifyRecoveryCodeHash("WRONG-CODE-0000", hash), false);
  }
});

