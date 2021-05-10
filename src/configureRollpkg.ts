import { resolve } from 'path';
import * as fs from 'fs-extra';
import validateNpmPackageName from 'validate-npm-package-name';
import { PackageJson } from 'type-fest';

import { fileExists, convertPkgNameToKebabCase } from './utils';
import { invariant } from './errorUtils';

interface ConfigureRollpkg {
  (input: { args: string[]; cwd: string }): Promise<
    | {
        watchMode: boolean;
        tsconfigPath?: string;
        addUmdBuild: boolean;
        includeBundlephobiaStats: boolean;
        pkgJsonName: string;
        kebabCasePkgName: string;
        entryFile: string;
        pkgJsonSideEffects: boolean;
        pkgJsonDependencyKeys: string[];
        pkgJsonPeerDependencyKeys: string[];
        pkgJsonUmdGlobalDependencies?: { [key: string]: string };
      }
    | never
  >;
}

export const checkInvariantsAndGetConfiguration: ConfigureRollpkg = async ({
  args,
  cwd,
}) => {
  invariant(
    args[0] === 'build' || args[0] === 'watch',
    `rollpkg requires a "build" or "watch" command, received: "${args.join(
      ' ',
    )}"`,
  );

  const watchMode = args[0] === 'watch';

  let tsconfigPath;
  const tsconfigOptionIdx = args.indexOf('--tsconfig');
  if (tsconfigOptionIdx !== -1) {
    tsconfigPath = args[tsconfigOptionIdx + 1];
    try {
      await fs.readFile(tsconfigPath, 'utf8');
    } catch (e) {
      throw new Error(`Cannot read tsconfig at ${tsconfigPath}`);
    }
  }

  const addUmdBuild = args.includes('--addUmdBuild');
  invariant(
    !watchMode || (watchMode && !addUmdBuild),
    '--addUmdBuild option is not valid in watch mode (only the esm build is created in watch mode)',
  );

  const includeBundlephobiaStats = !args.includes('--noStats');
  invariant(
    !watchMode || (watchMode && includeBundlephobiaStats),
    '--noStats option is not valid in watch mode (stats are never calculated in watch mode)',
  );

  interface PkgJson extends PackageJson {
    umdGlobalDependencies?: { [key: string]: string };
  }
  let pkgJson: PkgJson;

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

  const isValidName = validateNpmPackageName(pkgJsonName);
  invariant(
    isValidName.validForNewPackages,
    `Invalid npm package name, see https://www.npmjs.com/package/validate-npm-package-name\n${
      isValidName.errors?.length
        ? isValidName.errors
            ?.map((npmError) => `Npm Error: ${npmError}`)
            .join('\n')
        : ''
    }`,
  );

  const kebabCasePkgName = convertPkgNameToKebabCase(pkgJsonName);

  const mainShouldBe = `dist/${kebabCasePkgName}.cjs.js`;
  const moduleShouldBe = `dist/${kebabCasePkgName}.esm.js`;
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
    !pkgJson.types || pkgJson.types === typesShouldBe,
    `The value of "types" in package.json needs to be "${typesShouldBe}", value found: "${pkgJson.types}"`,
  );
  invariant(
    typeof pkgJson.sideEffects === 'boolean',
    `"sideEffects" field is required in package.json and needs to be a boolean, value found: ${pkgJson.sideEffects}`,
  );
  // type cast as boolean because previous invariant check makes this code
  // unreachable if pkgJson.name is not a string, which TS doesn't understand
  const pkgJsonSideEffects = pkgJson.sideEffects as boolean;

  const pkgJsonDependencyKeys = pkgJson.dependencies
    ? Object.keys(pkgJson.dependencies)
    : [];
  const pkgJsonPeerDependencyKeys = pkgJson.peerDependencies
    ? Object.keys(pkgJson.peerDependencies)
    : [];

  invariant(
    !pkgJson.umdGlobalDependencies ||
      (typeof pkgJson.umdGlobalDependencies === 'object' &&
        !Array.isArray(pkgJson.umdGlobalDependencies) &&
        Object.values(pkgJson.umdGlobalDependencies).every(
          (value) => typeof value === 'string',
        )),
    'If "umdGlobalDependencies" is specified in package.json, it needs to be an object of the form { "package-name": "GlobalName" }, for example { "react-dom": "ReactDOM" }',
  );
  const pkgJsonUmdGlobalDependencies = pkgJson.umdGlobalDependencies;

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

  const entryFile = resolve(srcDir, indexTsExists ? 'index.ts' : 'index.tsx');

  return {
    watchMode,
    tsconfigPath,
    addUmdBuild,
    includeBundlephobiaStats,
    pkgJsonName,
    kebabCasePkgName,
    entryFile,
    pkgJsonSideEffects,
    pkgJsonDependencyKeys,
    pkgJsonPeerDependencyKeys,
    pkgJsonUmdGlobalDependencies,
  };
};
