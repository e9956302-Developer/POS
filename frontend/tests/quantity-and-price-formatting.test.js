import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { stripTrailingZeros, formatCleanPrice } from "../src/utils/numberFormat.js";

describe("stripTrailingZeros & formatCleanPrice utility", () => {
  it("strips trailing zeros from decimals", () => {
    assert.equal(stripTrailingZeros("150.00"), "150");
    assert.equal(stripTrailingZeros(150.0), "150");
    assert.equal(stripTrailingZeros("150.50"), "150.5");
    assert.equal(stripTrailingZeros("150.25"), "150.25");
    assert.equal(stripTrailingZeros("0.00"), "0");
    assert.equal(stripTrailingZeros(0), "0");
    assert.equal(stripTrailingZeros(""), "");
    assert.equal(stripTrailingZeros(null), "");
    assert.equal(stripTrailingZeros(undefined), "");
    assert.equal(stripTrailingZeros("150000.00"), "150000");
  });

  it("formats clean prices without unnecessary trailing zeros", () => {
    assert.equal(formatCleanPrice("1500"), "1,500");
    assert.equal(formatCleanPrice("1500.00"), "1,500");
    assert.equal(formatCleanPrice("1500.5"), "1,500.5");
    assert.equal(formatCleanPrice("1500.25"), "1,500.25");
    assert.equal(formatCleanPrice(0), "0");
  });
});
