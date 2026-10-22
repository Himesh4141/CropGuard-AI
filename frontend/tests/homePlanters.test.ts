import test from "node:test";
import assert from "node:assert/strict";
import { assessPixels } from "../src/features/homePlanters/imageAssessment";
import { buildCareGuide } from "../src/features/homePlanters/careGuide";
import { normalizeIdentity, identifyPlant } from "../src/features/homePlanters/plantIdentity";
import { loadScans, saveScan, clearScans } from "../src/features/homePlanters/localHistory";
import { preparePlantPhoto } from "../src/features/homePlanters/smartPhoto";

function pixels(color: number[]) {
  const data = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...color, 255], i);
  return data;
}

test("black and white photos produce limited observations", () => {
  for (const color of [[0, 0, 0], [255, 255, 255]]) {
    const result = assessPixels(32, 32, pixels(color));
    assert.equal(result.usable, false);
    assert.ok(buildCareGuide("unknown", ["wilting"], result).some(x => x.includes("Both dry soil")));
  }
});
test("green photo remains available despite low edge detail", () => {
  const result = assessPixels(32, 32, pixels([50, 150, 50]));
  assert.equal(result.usable, true);
  assert.ok(result.retakeReasons.some(x => x.includes("blur")));
});
test("invalid pixel buffers are rejected", () => assert.throws(() => assessPixels(32, 32, new Uint8ClampedArray(4)))) ;
test("low confidence remains uncertain", () => {
  const result = normalizeIdentity({status: "identified", plant: "tulsi", confidence: .5, scientific_name: "Ocimum tenuiflorum", common_name: "Tulsi", message: ""});
  assert.equal(result.status, "uncertain");
  assert.equal(result.plant, "unknown");
});
test("uncertain identity cannot select species care", () => {
  assert.equal(normalizeIdentity({status: "uncertain", plant: "tulsi", confidence: .8, scientific_name: "Ocimum tenuiflorum", common_name: "Tulsi", message: ""}).plant, "unknown");
});
test("variegation does not become a diagnosis", () => {
  const result = assessPixels(32, 32, pixels([50, 150, 50]));
  result.signals = ["yellow_tones"];
  const care = buildCareGuide("pothos", [], result).join(" ");
  assert.match(care, /natural variegation/);
  assert.doesNotMatch(care, /If leaves are truly turning yellow/);
});
test("history round trip, cap and explicit storage errors", () => {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {configurable: true, value: {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k)}});
  for (let i = 0; i < 35; i++) saveScan({id: String(i), date: new Date().toISOString(), plant: "unknown", symptoms: [], signals: [], usable: false});
  assert.equal(loadScans().length, 30);
  assert.equal(loadScans()[0]?.id, "34");
  clearScans();
  assert.equal(loadScans().length, 0);
  globalThis.localStorage.setItem = () => { throw new Error("Quota exceeded"); };
  assert.throws(() => saveScan({id: "x", date: new Date().toISOString(), plant: "unknown", symptoms: [], signals: [], usable: false}), /could not be saved/);
});
test("invalid image intake is rejected", async () => {
  await assert.rejects(preparePlantPhoto(new File(["bad"], "x.txt", {type: "text/plain"})), /JPG/);
});
test("prepared flag is submitted and malformed identity is rejected", async () => {
  const state = globalThis as typeof globalThis & {testApiData: unknown; testPhotoPrepared: string};
  state.testApiData = null;
  await assert.rejects(identifyPlant(new File(["x"], "leaf.png", {type: "image/png"}), true), /invalid result/);
  assert.equal(state.testPhotoPrepared, "true");
});
