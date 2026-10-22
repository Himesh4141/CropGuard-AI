import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const dir = await mkdtemp(join(tmpdir(), "cropguard-tests-"));
try {
  const output = join(dir, "tests.cjs");
  await build({entryPoints: ["tests/homePlanters.test.ts"], outfile: output, bundle: true, platform: "node", format: "cjs", plugins: [{name: "offline-api", setup(builder) {
    builder.onResolve({filter: /^@\/services\/apiClient$/}, () => ({path: "api", namespace: "offline"}));
    builder.onLoad({filter: /.*/, namespace: "offline"}, () => ({contents: "export const apiClient = {post: async (_url, form) => {globalThis.testPhotoPrepared = form.get('photo_prepared'); return {data: globalThis.testApiData};}};"}));
  }}]});
  const result = spawnSync(process.execPath, ["--test", output], {stdio: "inherit"});
  process.exitCode = result.status ?? 1;
} finally {
  if (!resolve(dir).startsWith(resolve(tmpdir()) + sep) || !basename(dir).startsWith("cropguard-tests-")) {
    throw new Error("Refusing to clean up an unexpected test directory");
  }
  await rm(dir, {recursive: true, force: true});
}
