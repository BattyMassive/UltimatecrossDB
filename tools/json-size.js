#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.startsWith('--') ? arg.slice(2).split('=') : [null, null];
    if (key) {
      args[key] = value === undefined ? true : value;
    }
  });
  return args;
}

function usage() {
  console.log('Usage: node tools/json-size.js --dir=cards [--mode=minify|pretty] [--out=cards-out]');
  console.log('  --dir     Directory containing .json files');
  console.log('  --mode    minify (default) or pretty');
  console.log('  --out     Optional output directory; if omitted, files are overwritten in place');
  console.log('  --help    Show this help message');
}

function getJsonFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getJsonFiles(fullPath));
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
      files.push(fullPath);
    }
  });
  return files;
}

function normalizeOutPath(filePath, inputDir, outputDir) {
  if (!outputDir) {
    return filePath;
  }
  const rel = path.relative(inputDir, filePath);
  return path.join(outputDir, rel);
}

function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function transformJsonFiles(inputDir, outputDir, mode) {
  const files = getJsonFiles(inputDir);
  if (files.length === 0) {
    console.error(`No .json files found in: ${inputDir}`);
    process.exit(1);
  }

  files.forEach(file => {
    const raw = fs.readFileSync(file, 'utf8');
    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error(`Failed to parse JSON: ${file}`);
      console.error(err.message);
      return;
    }

    const outputPath = normalizeOutPath(file, inputDir, outputDir);
    ensureDirectoryExists(outputPath);

    const jsonText = mode === 'pretty'
      ? JSON.stringify(data, null, 2) + '\n'
      : JSON.stringify(data);

    fs.writeFileSync(outputPath, jsonText, 'utf8');
    const before = Buffer.byteLength(raw, 'utf8');
    const after = Buffer.byteLength(jsonText, 'utf8');
    console.log(`${path.relative(process.cwd(), outputPath)}: ${before} -> ${after} bytes`);
  });
}

(function main() {
  const args = parseArgs();
  if (args.help || !args.dir) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const inputDir = path.resolve(args.dir);
  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    console.error(`Directory not found: ${inputDir}`);
    process.exit(1);
  }

  const mode = args.mode === 'pretty' ? 'pretty' : 'minify';
  const outputDir = args.out ? path.resolve(args.out) : null;

  transformJsonFiles(inputDir, outputDir, mode);
})();
