import { resolve } from 'path';
import * as fs from 'fs-extra';
import { PackageJson } from 'type-fest';

import { fileExists, convertPkgNameToKebabCase } from './utils';
import { invariant } from './errorUtils';

interface ConfigureRollpkg {
  (options: { args: string[]; cwd: string }): Promise<
    | {
        watchMode: boolean;
        pkgJsonName: string;
        pkgName: string;
        input: string;
        pkgSideEffects: boolean;
        pkgDependencies: string[];
        pkgPeerDependencies: string[];
      }
    | never
  >;
}

export const checkInvariantsAndGetConfiguration: ConfigureRollpkg = async ({
  args,
  cwd,
}) => {
  invariant(
    args.length === 1 && (args[0] === 'build' || args[0] === 'watch'),
    `rollpkg requires a "build" or "watch" command with no arguments, received: "${args.join(
      ' ',
    )}"`,
  );

  const watchMode = args[0] === 'watch';

  let pkgJson: PackageJson;
  try {
    const readPkgJson = await fs.readFile(resolve(cwd, 'package.json'), 'utf8');
    pkgJson = JSON.parse(readPkgJson) as PackageJson;
  } catch {
    throw Error(`Cannot read package.json at ${resolve(cwd, 'package.json')}`);
  }
  invariant(
    typeof pkgJson.name === 'string',
    `"name" field is required in package.json and needs to be a string, value found: ${pkgJson.name}`,
  );
  // type cast as string because previous invariant check makes this code
  // unreachable if pkgJson.name is not a string, which TS doesn't understand
  const pkgJsonName = pkgJson.name as string;
  const pkgName = convertPkgNameToKebabCase(pkgJsonName);

  const mainShouldBe = `dist/${pkgName}.cjs.js`;
  const moduleShouldBe = `dist/${pkgName}.esm.js`;
  const typesShouldBe = `dist/index.d.ts`;
  invariant(
    pkgJson.main === mainShouldBe,
    `The value of "main" in package.json needs to be "${mainShouldBe}", value found: "${pkgJson.main}"`,
  );
  invariant(
    pkgJson.module === moduleShouldBe,
    `The value of "module" in package.json needs to be "${moduleShouldBe}", value found: "${pkgJson.module}"`,
  );
  invariant(
    pkgJson.types === typesShouldBe,
    `The value of "types" in package.json needs to be "${typesShouldBe}", value found: "${pkgJson.types}"`,
  );
  invariant(
    typeof pkgJson.sideEffects === 'boolean',
    `"sideEffects" field is required in package.json and needs to be a boolean, value found: ${pkgJson.sideEffects}`,
  );
  // type cast as boolean because previous invariant check makes this code
  // unreachable if pkgJson.name is not a string, which TS doesn't understand
  const pkgSideEffects = pkgJson.sideEffects as boolean;

  try {
    await fs.readFile(resolve(cwd, 'tsconfig.json'), 'utf8');
  } catch (e) {
    throw new Error(
      `Cannot read tsconfig.json at ${resolve(cwd, 'tsconfig.json')}`,
    );
  }

  const srcDir = resolve(cwd, 'src');
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

  const pkgDependencies = pkgJson.dependencies
    ? Object.keys(pkgJson.dependencies)
    : [];
  const pkgPeerDependencies = pkgJson.peerDependencies
    ? Object.keys(pkgJson.peerDependencies)
    : [];

  return {
    watchMode,
    pkgJsonName,
    pkgName,
    input,
    pkgSideEffects,
    pkgDependencies,
    pkgPeerDependencies,
  };
};
