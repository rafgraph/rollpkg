#!/usr/bin/env node

import { promises as fs } from 'fs';
import { resolve } from 'path';
import { rollup } from 'rollup';
// because import doesn't work without esModuleInterop
const rollupTypescript = require('@rollup/plugin-typescript');

const error = (message: string) => {
  console.error(`Rollpkg Error: ${message}`);
  process.exit();
};

const invariant = (allGood: boolean, message: string) => {
  if (!allGood) error(message);
};

const run = async () => {
  let pkgJson;
  try {
    const readPkgJson = (await fs.readFile(
      resolve(process.cwd(), 'package.json'),
      'utf8',
    )) as string;
    pkgJson = JSON.parse(readPkgJson);
  } catch (e) {
    error(`Couldn't read package.json at ${resolve(process.cwd(), 'package.json')}`);
  }
  const name = pkgJson.name;
  invariant(
    typeof name === 'string',
    `"name" must be present in package.json and be a string, value found: ${name}`,
  );
  const mainShouldBe = `dist/${name}.cjs.js`;
  const moduleShouldBe = `dist/${name}.esm.js`;
  const typesShouldBe = `dist/${name}.d.ts`;
  invariant(
    pkgJson.main === mainShouldBe,
    `The value "main" in package.json must be "${mainShouldBe}", value found: "${pkgJson.main}"`,
  );
  invariant(
    pkgJson.module === moduleShouldBe,
    `The value "module" in package.json must be "${moduleShouldBe}", value found: "${pkgJson.module}"`,
  );
  invariant(
    pkgJson.types === typesShouldBe,
    `The value "types" in package.json must be "${typesShouldBe}", value found: "${pkgJson.types}"`,
  );
  invariant(
    typeof pkgJson.sideEffects === 'boolean',
    `"sideEffects" must be present in package.json and be a boolean, value found: ${pkgJson.sideEffects}`,
  );

  try {
    const readTsconfigJson = await fs.readFile(resolve(process.cwd(), 'tsconfig.json'), 'utf8');
  } catch (e) {
    error(`Couldn't read tsconfig.json at ${resolve(process.cwd(), 'tsconfig.json')}`);
  }

  // const fileExists = async (dirName: string, fileName: string) =>
  //   await fs
  //     .stat(resolve(dirName, fileName))
  //     .then((stats) => {
  //       return stats.isFile();
  //     })
  //     .catch(() => {
  //       return false;
  //     });

  const fileExists = async (dirName: string, fileName: string) => {
    try {
      const stats = await fs.stat(resolve(dirName, fileName));
      return stats.isFile();
    } catch {
      return false;
    }
  };

  const srcDir = resolve(process.cwd(), 'src');
  const indexTsExists = await fileExists(srcDir, 'index.ts');
  const indexTsxExists = await fileExists(srcDir, 'index.tsx');

  invariant(
    !(indexTsExists && indexTsxExists),
    `Cannot have both index.ts and index.tsx files in ${srcDir}`,
  );
  invariant(
    indexTsExists || indexTsxExists,
    `Cannot find index.ts or index.tsx entry file in ${srcDir}`,
  );

  const input = resolve(srcDir, indexTsExists ? 'index.ts' : 'index.tsx');

  const bundle = await rollup({ input, plugins: [rollupTypescript()] });
};

run();
