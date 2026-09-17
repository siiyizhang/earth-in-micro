import assert from "node:assert/strict";
import test from "node:test";
import { buildChains } from "../src/community/taxonChains";
import type { Prediction } from "../src/community/identify";
const prediction = (rank: string, name: string, probability = .8): Prediction => ({rank, name, label:name, probability});
const predictions = [prediction("phylum", "Tardigrada"), prediction("class", "Eutardigrada"), prediction("order", "Parachela"), prediction("family", "Macrobiotidae"), prediction("genus", "Macrobiotus")];
test("suggestions contain the genus and its actual parent family", () => {
  const chain = buildChains(predictions, predictions).find(c => c.links.at(-1)?.name === "Macrobiotus")!;
  assert.ok(chain);
  assert.equal(chain.links.find(l => l.rank === "family")?.name, "Macrobiotidae");
  assert.ok(Math.abs(chain.score - .8) < 1e-9);
});
test("changing genus recomputes family and order rather than combining independent top guesses", () => {
  const ranked = [...predictions, prediction("genus", "Milnesium", .6)];
  const alternative = buildChains(ranked, ranked).find(c => c.links.at(-1)?.name === "Milnesium")!;
  assert.equal(alternative.links.find(l => l.rank === "family")?.name, "Milnesiidae");
  assert.equal(alternative.links.find(l => l.rank === "order")?.name, "Apochela");
  assert.equal(alternative.links.find(l => l.rank === "family")?.probability, null);
  const constrained = buildChains(ranked, ranked, { genus: alternative.links.at(-1)! });
  assert.ok(constrained.length);
  assert.ok(constrained.every(c => c.links.at(-1)?.name === "Milnesium"));
});
test("confidence uses the full head distribution for ancestors outside top candidates", () => {
  const ranked = [prediction("genus", "Milnesium", .6)];
  const chain = buildChains(ranked, [...ranked, prediction("family", "Milnesiidae", .02)])[0];
  assert.equal(chain.links.find(l => l.rank === "family")?.probability, .02);
  assert.ok(Math.abs(chain.score - Math.sqrt(.6 * .02)) < 1e-9);
});
test("unknown model labels do not invent taxonomic relationships", () => {
  assert.deepEqual(buildChains([prediction("genus", "not a real taxon")], []), []);
});
