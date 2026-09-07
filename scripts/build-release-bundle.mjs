#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Release bundles contain only the exact committed source, never workspace state.
const sourceSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const { version } = JSON.parse(execFileSync("git", ["show", `${sourceSha}:package.json`], { encoding: "utf8" }));
if (!/^\d+\.\d+\.\d+-alpha\.\d+$/.test(version)) throw new Error("An explicit alpha version is required");
const name = "homebrew-tap";
const output = path.resolve("dist/release");
fs.mkdirSync(output, { recursive: true });
const archive = `${name}-${version}.tar.gz`;
const bytes = execFileSync("git", ["archive", "--format=tar.gz", `--prefix=${name}/`, sourceSha], { maxBuffer: 64 * 1024 * 1024 });
const sha256 = createHash("sha256").update(bytes).digest("hex");
fs.writeFileSync(path.join(output, archive), bytes);
fs.writeFileSync(path.join(output, `${archive}.sha256`), `${sha256}  ${archive}\n`);
fs.writeFileSync(path.join(output, `${name}.artifact.json`), JSON.stringify({ schemaVersion: 1, name, version, sourceSha, archive, sha256, bytes: bytes.length }, null, 2) + "\n");
console.log(`Release bundle: ${archive} (${sourceSha})`);
