import {describe, expect, it} from "vitest";
import {toRootHex} from "@lodestar/utils";
import {SeenExecutionPayloadBids} from "../../../../src/chain/seenCache/seenExecutionPayloadBids.js";

const hash = toRootHex(Buffer.alloc(32, 1));
const root = toRootHex(Buffer.alloc(32, 2));
const other = toRootHex(Buffer.alloc(32, 3));

describe("SeenExecutionPayloadBids", () => {
  it("distinguishes an unseen bid from a zero-valued bid", () => {
    const seen = new SeenExecutionPayloadBids();
    expect(seen.getValue(2, 0, hash, root)).toBeUndefined();
    expect(seen.getBestValue(2, hash, root)).toBeUndefined();
    seen.add(2, 0, hash, root, 0);
    expect(seen.isKnown(2, 0, hash, root)).toBe(true);
    expect(seen.getValue(2, 0, hash, root)).toBe(0);
    expect(seen.getBestValue(2, hash, root)).toBe(0);
  });

  it("tracks each builder's last value and the best value independently", () => {
    const seen = new SeenExecutionPayloadBids();
    seen.add(2, 0, hash, root, 100);
    seen.add(2, 1, hash, root, 101);
    seen.add(2, 0, hash, root, 103);
    expect(seen.getValue(2, 0, hash, root)).toBe(103);
    expect(seen.getValue(2, 1, hash, root)).toBe(101);
    expect(seen.getBestValue(2, hash, root)).toBe(103);
  });

  it("isolates slots and both parent identifiers", () => {
    const seen = new SeenExecutionPayloadBids();
    seen.add(2, 0, hash, root, 100);
    for (const [slot, parentHash, parentRoot] of [
      [3, hash, root],
      [2, other, root],
      [2, hash, other],
    ] as const) {
      expect(
        seen.getValue(slot, 0, parentHash, parentRoot),
        `tuple ${slot}/${parentHash}/${parentRoot}`
      ).toBeUndefined();
      expect(
        seen.getBestValue(slot, parentHash, parentRoot),
        `tuple ${slot}/${parentHash}/${parentRoot}`
      ).toBeUndefined();
    }
  });

  it("prunes old builder values and best values at the same boundary", () => {
    const seen = new SeenExecutionPayloadBids();
    seen.add(1, 0, hash, root, 100);
    seen.add(2, 0, hash, root, 200);
    seen.prune(4);
    expect(seen.getValue(1, 0, hash, root)).toBeUndefined();
    expect(seen.getBestValue(1, hash, root)).toBeUndefined();
    expect(seen.getValue(2, 0, hash, root)).toBe(200);
    expect(seen.getBestValue(2, hash, root)).toBe(200);
    expect(() => seen.add(1, 0, hash, root, 300)).toThrow("lowestPermissibleSlot");
  });
});
