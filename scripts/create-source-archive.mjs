/**
 * Creates a dependency-free, store-only ZIP of the project source. The input
 * walk is allow-by-default so new source/assets are included, while generated,
 * private, cache, VCS, and dependency paths are rejected centrally below.
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const EXCLUDED_DIRECTORIES = new Set([
  ".git", ".bundle-analysis", ".cache", ".idea", ".nyc_output", ".parcel-cache",
  ".turbo", ".vite", ".vscode", "coverage", "dist", "logs", "node_modules",
  "temp", "tmp",
]);
const EXCLUDED_FILE_PATTERNS = [
  /^\.env(?:\.|$)/,
  /\.zip$/i,
  /(?:^|\.)log$/i,
  /\.eslintcache$/i,
  /\.tsbuildinfo$/i,
  /\.(?:swp|swo|temp|tmp)$/i,
  /~$/,
];

export function shouldExclude(relativePath, isDirectory = false) {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.some((part) => EXCLUDED_DIRECTORIES.has(part))) return true;
  if (isDirectory) return false;
  if (parts.at(-1) === ".env.example") return false;
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(parts.at(-1) ?? ""));
}

async function collectFiles(root, directory = root) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (shouldExclude(relative, entry.isDirectory())) continue;
    if (entry.isDirectory()) files.push(...await collectFiles(root, absolute));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function localHeader(name, data, modified) {
  const header = Buffer.alloc(30);
  const checksum = crc32(data);
  const stamp = dosTimestamp(modified);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(stamp.time, 10);
  header.writeUInt16LE(stamp.date, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  return { header, checksum, stamp };
}

function centralHeader(name, data, checksum, stamp, offset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(stamp.time, 12);
  header.writeUInt16LE(stamp.date, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt32LE(offset, 42);
  return header;
}

export async function createSourceArchive(root, output) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const files = await collectFiles(root);

  for (const relative of files) {
    const absolute = path.join(root, ...relative.split("/"));
    const [data, details] = await Promise.all([readFile(absolute), stat(absolute)]);
    const name = Buffer.from(relative, "utf8");
    const { header, checksum, stamp } = localHeader(name, data, details.mtime);
    localParts.push(header, name, data);
    centralParts.push(centralHeader(name, data, checksum, stamp, offset), name);
    offset += header.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  await writeFile(output, Buffer.concat([...localParts, ...centralParts, end]));
  return { files, output };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  const root = process.cwd();
  const output = path.resolve(root, "..", `${path.basename(root)}-source.zip`);
  const result = await createSourceArchive(root, output);
  console.log(`Created ${result.output} with ${result.files.length} files.`);
}
