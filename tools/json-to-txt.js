#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rawArgs = process.argv.slice(2);
const generateIndex = rawArgs.includes('--index');
const cleanArgs = rawArgs.filter(arg => arg !== '--index');
const inputDir = path.resolve(cleanArgs[0] || 'cards');
const outputDir = path.resolve(cleanArgs[1] || inputDir);

function getJsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
    .map(entry => path.join(dir, entry.name));
}

function toTxt(card) {
  const fields = [
    'id',
    'title',
    'text',
    'image',
    'set',
    'atk',
    'def',
    'cost',
    'type',
    'rarity',
    'artist'
  ];

  return fields
    .filter(key => key in card)
    .map(key => `${key}: ${card[key]}`)
    .join('\n') + '\n';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  if (!fs.existsSync(inputDir) || !fs.statSync(inputDir).isDirectory()) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const files = getJsonFiles(inputDir);
  if (!files.length) {
    console.error(`No JSON files found in ${inputDir}`);
    process.exit(1);
  }

  const indexLines = [];

  files.forEach(jsonPath => {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    let card;
    try {
      card = JSON.parse(raw);
    } catch (err) {
      console.error(`Skipping invalid JSON: ${jsonPath}`);
      return;
    }

    const base = path.basename(jsonPath, '.json');
    const txtFilename = `${base}.txt`;
    const outPath = path.join(outputDir, txtFilename);
    const content = toTxt(card);
    writeFile(outPath, content);
    indexLines.push(txtFilename);
    console.log(`Converted ${path.relative(process.cwd(), jsonPath)} -> ${path.relative(process.cwd(), outPath)}`);
  });

  if (generateIndex) {
    const indexPath = path.join(outputDir, 'index.txt');
    writeFile(indexPath, indexLines.join('\n') + '\n');
    console.log(`Wrote index: ${indexPath}`);
  }
}

main();