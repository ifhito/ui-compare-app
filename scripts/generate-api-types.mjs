#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import openapiTS from 'openapi-typescript';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(__filename), '..');
const inputPath = resolve(projectRoot, 'specs', 'openapi.yaml');
const outputPath = resolve(projectRoot, 'docs', 'api-types.ts');

const args = process.argv.slice(2);
const checkMode = args.includes('--check');

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function generate() {
  return openapiTS(inputPath, { version: 3 });
}

async function main() {
  const generated = await generate();
  await ensureDir(dirname(outputPath));

  try {
    const existing = await readFile(outputPath, 'utf8');
    if (checkMode) {
      if (existing === generated) {
        console.log('API types are up to date.');
        return;
      }
      console.error('Generated API types are out of date. Run `pnpm generate:api`.');
      process.exit(1);
    }

    if (existing === generated) {
      console.log('API types already up to date.');
      return;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    if (checkMode) {
      console.error('Generated API types are missing. Run `pnpm generate:api`.');
      process.exit(1);
    }
  }

  if (checkMode) {
    console.error('Generated API types are out of date. Run `pnpm generate:api`.');
    process.exit(1);
  }

  await writeFile(outputPath, generated, 'utf8');
  console.log(`API types written to ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
