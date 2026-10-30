import {BuilderIndex, RootHex, Slot} from "@lodestar/types";
import {MapDef} from "@lodestar/utils";

/**
 * TODO GLOAS: Revisit this value and add rational for choosing it
 */
const SLOTS_RETAINED = 2;

type BranchBids = {bestValue: number; byBuilder: Map<BuilderIndex, number>};

/** Tracks validated bid values per slot, parent and builder, independently of pool insertion. */
export class SeenExecutionPayloadBids {
  private readonly branchesBySlot = new MapDef<Slot, Map<string, BranchBids>>(() => new Map());
  private lowestPermissibleSlot: Slot = 0;

  isKnown(slot: Slot, builderIndex: BuilderIndex, parentBlockHash: RootHex, parentBlockRoot: RootHex): boolean {
    return this.getValue(slot, builderIndex, parentBlockHash, parentBlockRoot) !== undefined;
  }

  getValue(
    slot: Slot,
    builderIndex: BuilderIndex,
    parentBlockHash: RootHex,
    parentBlockRoot: RootHex
  ): number | undefined {
    return this.branchesBySlot.get(slot)?.get(branchKey(parentBlockHash, parentBlockRoot))?.byBuilder.get(builderIndex);
  }

  getBestValue(slot: Slot, parentBlockHash: RootHex, parentBlockRoot: RootHex): number | undefined {
    return this.branchesBySlot.get(slot)?.get(branchKey(parentBlockHash, parentBlockRoot))?.bestValue;
  }

  add(slot: Slot, builderIndex: BuilderIndex, parentBlockHash: RootHex, parentBlockRoot: RootHex, value: number): void {
    if (slot < this.lowestPermissibleSlot) {
      throw Error(`slot ${slot} < lowestPermissibleSlot ${this.lowestPermissibleSlot}`);
    }
    const branches = this.branchesBySlot.getOrDefault(slot);
    const key = branchKey(parentBlockHash, parentBlockRoot);
    let bids = branches.get(key);
    if (!bids) {
      bids = {bestValue: value, byBuilder: new Map()};
      branches.set(key, bids);
    }
    bids.byBuilder.set(builderIndex, value);
    bids.bestValue = Math.max(bids.bestValue, value);
  }

  prune(currentSlot: Slot): void {
    this.lowestPermissibleSlot = Math.max(currentSlot - SLOTS_RETAINED, 0);
    for (const slot of this.branchesBySlot.keys()) {
      if (slot < this.lowestPermissibleSlot) {
        this.branchesBySlot.delete(slot);
      }
    }
  }
}

function branchKey(parentBlockHash: RootHex, parentBlockRoot: RootHex): string {
  return `${parentBlockHash}:${parentBlockRoot}`;
}
