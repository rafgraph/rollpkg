import mockFs from 'mock-fs';
import { PackageJson } from 'type-fest';

import { checkInvariantsAndGetConfiguration } from '../configureRollpkg';

interface PkgJson extends PackageJson {
  umdGlobalDependencies?: { [key: string]: string };
}
interface CreateTestPackageJson {
  (): PkgJson;
}
// create a new package.json object each time so it can be mutated to meet the test's needs
const createTestPackageJson: CreateTestPackageJson = () => ({
  name: 'test-package-name',
  main: 'dist/test-package-name.cjs.js',
  module: 'dist/test-package-name.esm.js',
  types: 'dist/index.d.ts',
  sideEffects: false,
  dependencies: {
    'some-dependency': '^1.0.0',
  },
  peerDependencies: {
    'some-peer-dependency': '^1.0.0',
  },
});

afterEach(() => {
  mockFs.restore();
});

// mockFs note: use absolute path "/" in mockFs so that snapshots of error messages
// that contain the path (as a helpful hint to the user) don't change based on where
// the rollpkg directory is located, e.g. if the test snapshot contains /Users/rafael/dev/rollpkg
// the tests will only pass when rollpkg is located in the /Users/rafael/dev directory

describe('fails with incorrect configuration', () => {
  test('fails without a "build" or "watch" command', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: [],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"rollpkg requires a \\"build\\" or \\"watch\\" command with no arguments, received: \\"\\""`,
    );
  });

  test('fails without a package.json file', async () => {
    mockFs({
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cannot read package.json at /package.json"`,
    );
  });

  test('fails when "name" field not present', async () => {
    const packageJson = createTestPackageJson();
    delete packageJson.name;
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\\"name\\" field is required in package.json and needs to be a string, value found: undefined"`,
    );
  });

  test('fails when "name" is not a valid npm package name', async () => {
    const packageJson = createTestPackageJson();
    packageJson.name = '!some/name';
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
          "Invalid npm package name, see https://www.npmjs.com/package/validate-npm-package-name
          Npm Error: name can only contain URL-friendly characters"
        `);
  });

  test('fails when "main" field not present', async () => {
    const packageJson = createTestPackageJson();
    delete packageJson.main;
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The value of \\"main\\" in package.json needs to be \\"dist/test-package-name.cjs.js\\", value found: \\"undefined\\""`,
    );
  });

  test('fails when "main" does not match convention', async () => {
    const packageJson = createTestPackageJson();
    packageJson.main = 'some-main.js';
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The value of \\"main\\" in package.json needs to be \\"dist/test-package-name.cjs.js\\", value found: \\"some-main.js\\""`,
    );
  });

  test('fails when "module" field not present', async () => {
    const packageJson = createTestPackageJson();
    delete packageJson.module;
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The value of \\"module\\" in package.json needs to be \\"dist/test-package-name.esm.js\\", value found: \\"undefined\\""`,
    );
  });

  test('fails when "module" does not match convention', async () => {
    const packageJson = createTestPackageJson();
    packageJson.module = 'some-module.js';
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The value of \\"module\\" in package.json needs to be \\"dist/test-package-name.esm.js\\", value found: \\"some-module.js\\""`,
    );
  });

  test('fails when "types" does not match convention', async () => {
    const packageJson = createTestPackageJson();
    packageJson.types = 'some-types.d.ts';
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"The value of \\"types\\" in package.json needs to be \\"dist/index.d.ts\\", value found: \\"some-types.d.ts\\""`,
    );
  });

  test('fails when "sideEffects" field is not present', async () => {
    const packageJson = createTestPackageJson();
    delete packageJson.sideEffects;
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\\"sideEffects\\" field is required in package.json and needs to be a boolean, value found: undefined"`,
    );
  });

  test('fails when "sideEffects" is not a boolean', async () => {
    const packageJson = createTestPackageJson();
    packageJson.sideEffects = ['/src/someFileWithSideEffects.ts'];
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"\\"sideEffects\\" field is required in package.json and needs to be a boolean, value found: /src/someFileWithSideEffects.ts"`,
    );
  });

  test('fails when "umdGlobalDependencies" is present but not an object of strings', async () => {
    const packageJson = createTestPackageJson();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore because intentionally violating types to test that it throws
    packageJson.umdGlobalDependencies = { 'some-global-dep': true };
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"If \\"umdGlobalDependencies\\" is specified in package.json, it needs to be an object of the form { \\"package-name\\": \\"GlobalName\\" }, for example { \\"react-dom\\": \\"ReactDOM\\" }"`,
    );
  });

  test('fails without a src/index.ts or src/index.tsx file', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cannot find index.ts or index.tsx entry file in /src"`,
    );
  });

  test('fails when both src/index.ts and src/index.tsx files exist', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/src/index.ts': '',
      '/src/index.tsx': '',
      '/tsconfig.json': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Cannot have both index.ts and index.tsx files in /src"`,
    );
  });
});

describe('correctly configures rollpkg', () => {
  test('rollpkg build', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });
    const { watchMode } = await checkInvariantsAndGetConfiguration({
      args: ['build'],
      cwd: '/',
    });

    expect(watchMode).toBe(false);
  });

  test('rollpkg watch', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });
    const { watchMode } = await checkInvariantsAndGetConfiguration({
      args: ['watch'],
      cwd: '/',
    });

    expect(watchMode).toBe(true);
  });

  test('scoped package name', async () => {
    const packageJson = createTestPackageJson();
    packageJson.name = '@scope/package-name';
    packageJson.main = 'dist/scope-package-name.cjs.js';
    packageJson.module = 'dist/scope-package-name.esm.js';
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });
    const {
      pkgJsonName,
      kebabCasePkgName,
    } = await checkInvariantsAndGetConfiguration({
      args: ['build'],
      cwd: '/',
    });

    expect(pkgJsonName).toBe('@scope/package-name');
    expect(kebabCasePkgName).toBe('scope-package-name');
  });

  test('with index.ts entry file', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });
    const { entryFile } = await checkInvariantsAndGetConfiguration({
      args: ['build'],
      cwd: '/',
    });

    expect(entryFile).toBe('/src/index.ts');
  });

  test('with index.tsx entry file', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
      '/src/index.tsx': '',
    });
    const { entryFile } = await checkInvariantsAndGetConfiguration({
      args: ['build'],
      cwd: '/',
    });

    expect(entryFile).toBe('/src/index.tsx');
  });

  test('with no "dependencies" and no "peerDependencies"', async () => {
    const packageJson = createTestPackageJson();
    delete packageJson.dependencies;
    delete packageJson.peerDependencies;
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });
    const {
      pkgJsonDependencyKeys,
      pkgJsonPeerDependencyKeys,
    } = await checkInvariantsAndGetConfiguration({
      args: ['build'],
      cwd: '/',
    });

    expect(pkgJsonDependencyKeys).toEqual([]);
    expect(pkgJsonPeerDependencyKeys).toEqual([]);
  });

  test('with "umdGlobalDependencies"', async () => {
    const packageJson = createTestPackageJson();
    packageJson.umdGlobalDependencies = { 'react-dom': 'ReactDOM' };
    mockFs({
      '/package.json': JSON.stringify(packageJson),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });
    const {
      pkgJsonUmdGlobalDependencies,
    } = await checkInvariantsAndGetConfiguration({
      args: ['build'],
      cwd: '/',
    });

    expect(pkgJsonUmdGlobalDependencies).toEqual({ 'react-dom': 'ReactDOM' });
  });

  test('full config snapshot', async () => {
    mockFs({
      '/package.json': JSON.stringify(createTestPackageJson()),
      '/tsconfig.json': '',
      '/src/index.ts': '',
    });

    await expect(
      checkInvariantsAndGetConfiguration({
        args: ['build'],
        cwd: '/',
      }),
    ).resolves.toMatchInlineSnapshot(`
            Object {
              "addUmdBuild": false,
              "entryFile": "/src/index.ts",
              "includeBundlephobiaStats": true,
              "kebabCasePkgName": "test-package-name",
              "pkgJsonDependencyKeys": Array [
                "some-dependency",
              ],
              "pkgJsonName": "test-package-name",
              "pkgJsonPeerDependencyKeys": Array [
                "some-peer-dependency",
              ],
              "pkgJsonSideEffects": false,
              "pkgJsonUmdGlobalDependencies": undefined,
              "tsconfigPath": undefined,
              "watchMode": false,
            }
          `);
  });
});
