import test from "node:test";
import assert from "node:assert/strict";
import { identifyPlant, normalizeIdentity, type PlantIdentity } from "../src/features/homePlanters/plantIdentity";
import { CROP_PROFILES, findCropProfile, hasKnownCropCoverage } from "../src/features/diagnosis/cropReference";

const identity: PlantIdentity = {status: "identified", plant: "unknown", confidence: .91, scientific_name: "Rosa chinensis", common_name: "China rose", message: "Provider suggestion"};
test("three same-plant photos share a single request and older single-photo calls work", async () => {
  const state = globalThis as typeof globalThis & {testApiData: unknown; testExtraCount: number};
  state.testApiData = identity;
  const photo = new File(["offline"], "leaf.jpg", {type: "image/jpeg"});
  assert.equal((await identifyPlant(photo, true, [photo, photo])).confidence, .91);
  assert.equal(state.testExtraCount, 2);
  await identifyPlant(photo);
  assert.equal(state.testExtraCount, 0);
  await assert.rejects(identifyPlant(photo, true, [photo, photo, photo]), /three photos/);
  await assert.rejects(identifyPlant(new File([new Uint8Array(8 * 1024 * 1024 + 1)], "big.jpg")), /8 MB/);
});
test("taxonomy is bounded and malformed alternatives cannot break the result", () => {
  const result = normalizeIdentity({...identity, family: "Rosaceae", genus: "Rosa", common_names: ["Rose", "Rose", "China rose"], candidates: [null, {scientific_name: "bad", confidence: NaN}, {scientific_name: "Rosa gallica", common_name: "French rose", confidence: .08, flower_id: null}] as never});
  assert.equal(result.family, "Rosaceae");
  assert.deepEqual(result.common_names, ["Rose", "China rose"]);
  assert.equal(result.candidates?.length, 1);
  assert.equal(result.confidence, .91);
});
test("uncertain suggestions never enable specific flower care", () => {
  const result = normalizeIdentity({...identity, confidence: .5, flower_match: "rose"});
  assert.equal(result.status, "uncertain"); assert.equal(result.flower_match, null);
});
test("crop reference covers exactly the trained classes and excludes misleading crop aliases", () => {
  assert.equal(CROP_PROFILES.length, 14);
  assert.equal(CROP_PROFILES.flatMap(p => p.conditions).length, 38);
  assert.equal(findCropProfile("pineapple"), null);
  assert.equal(findCropProfile("sweet potato"), null);
  assert.equal(findCropProfile("maize")?.crop, "Corn");
  assert.ok(hasKnownCropCoverage("field-candidate-20261030-epoch6"));
  assert.equal(hasKnownCropCoverage("unknown-model"), false);
});
