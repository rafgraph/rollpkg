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
    args.length === 1 && (args[0] === 'build' || args[0] === 'watch'),
    `rollpkg requires a "build" or "watch" command with no arguments, received: "${args.join(
      ' ',
    )}"`,
  );

  const watchMode = args[0] === 'watch';

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
    pkgJson.types === typesShouldBe,
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

  const entryFile = resolve(srcDir, indexTsExists ? 'index.ts' : 'index.tsx');

  return {
    watchMode,
    pkgJsonName,
    kebabCasePkgName,
    entryFile,
    pkgJsonSideEffects,
    pkgJsonDependencyKeys,
    pkgJsonPeerDependencyKeys,
    pkgJsonUmdGlobalDependencies,
  };
};
