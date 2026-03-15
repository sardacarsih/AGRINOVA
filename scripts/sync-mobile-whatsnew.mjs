import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

function getRepoRoot() {
  const root = execSync("git rev-parse --show-toplevel", {
    encoding: "utf8",
  }).trim();
  if (!root) {
    throw new Error("Tidak bisa membaca root repository Git.");
  }
  return root;
}

function readPubspecVersion(pubspecPath) {
  const content = readFileSync(pubspecPath, "utf8");
  const match = content.match(
    /^\s*version:\s*([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)(?:\+[0-9]+)?\s*$/m,
  );

  if (!match) {
    throw new Error(
      "Version tidak ditemukan di pubspec.yaml (format yang didukung: x.y.z+build).",
    );
  }

  return match[1];
}

function normalizeEol(text) {
  return text.replace(/\r\n/g, "\n");
}

function ensureFileDir(path) {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function updateWhatsNewFile(filePath, titlePrefix, version, fallbackLines) {
  const targetHeader = `${titlePrefix} ${version}:`;
  const previous = existsSync(filePath) ? readFileSync(filePath, "utf8") : "";
  const normalized = normalizeEol(previous);
  const lines = normalized.length > 0 ? normalized.split("\n") : [];

  // Keep non-empty content, only normalize first title line.
  while (lines.length > 0 && lines[0].trim().length === 0) {
    lines.shift();
  }

  if (lines.length === 0) {
    lines.push(targetHeader, ...fallbackLines);
  } else if (
    /^(Versi|Version)\s+.+:\s*$/.test(lines[0].trim())
  ) {
    lines[0] = targetHeader;
  } else {
    lines.unshift(targetHeader);
  }

  const next = `${lines.join("\n").trimEnd()}\n`;
  if (next !== normalized) {
    ensureFileDir(filePath);
    writeFileSync(filePath, next, "utf8");
    return true;
  }

  return false;
}

function main() {
  const root = getRepoRoot();
  const pubspecPath = join(root, "apps", "mobile", "pubspec.yaml");
  const version = readPubspecVersion(pubspecPath);

  const idPath = join(root, "apps", "mobile", "whatsnew", "whatsnew-id-ID");
  const enPath = join(root, "apps", "mobile", "whatsnew", "whatsnew-en-US");

  const idChanged = updateWhatsNewFile(idPath, "Versi", version, [
    "- Perbaikan bug dan peningkatan performa.",
  ]);
  const enChanged = updateWhatsNewFile(enPath, "Version", version, [
    "- Bug fixes and performance improvements.",
  ]);

  if (idChanged || enChanged) {
    console.log(`[sync-whatsnew] Updated release notes to version ${version}.`);
  } else {
    console.log(`[sync-whatsnew] Release notes already on version ${version}.`);
  }
}

main();
