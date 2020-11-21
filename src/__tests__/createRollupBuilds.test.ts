import { mocked } from 'ts-jest/utils';
import mockFs from 'mock-fs';
import * as fs from 'fs-extra';
import { rollup, watch, RollupBuild } from 'rollup';

import { rollupWatch, createBundles, writeBundles } from '../rollupBuilds';

const mockedWatch = mocked(watch, true);
const mockedRollup = mocked(rollup);

describe('rollupWatch', () => {
  beforeEach(() => {
    rollupWatch({
      kebabCasePkgName: 'test-package-name',
      pkgJsonDependencyKeys: ['some-dependency'],
      pkgJsonPeerDependencyKeys: ['some-peer-dependency'],
      entryFile: 'src/index.ts',
      treeshakeOptions: { annotations: true },
      esmBuildPlugins: [{ name: 'some-esm-build-plugin' }],
      devBuildPlugins: [{ name: 'some-dev-build-plugin' }],
      outputPlugins: [{ name: 'some-output-plugin' }],
    });
  });

  test('watch called with esm build options', () => {
    const watchCallArg = mockedWatch.mock.calls[0][0] as unknown[];

    expect(watchCallArg[0]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-dependency",
          "some-peer-dependency",
        ],
        "input": "src/index.ts",
        "output": Object {
          "file": "dist/test-package-name.esm.js",
          "format": "esm",
          "plugins": Array [
            Object {
              "name": "some-output-plugin",
            },
          ],
          "sourcemap": true,
        },
        "plugins": Array [
          Object {
            "name": "some-esm-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });

  test('watch called with cjs dev build options', () => {
    const watchCallArg = mockedWatch.mock.calls[0][0] as unknown[];

    expect(watchCallArg[1]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-dependency",
          "some-peer-dependency",
        ],
        "input": "src/index.ts",
        "output": Object {
          "file": "dist/test-package-name.cjs.js",
          "format": "cjs",
          "plugins": Array [
            Object {
              "name": "some-output-plugin",
            },
          ],
          "sourcemap": true,
        },
        "plugins": Array [
          Object {
            "name": "some-dev-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });

  test('watcher.on called once to start watching', () => {
    const watcher = mockedWatch.mock.results[0].value as { on: () => void };

    expect(watcher.on).toHaveBeenCalledTimes(1);
  });
});

describe('createBundles', () => {
  beforeEach(async () => {
    await createBundles({
      entryFile: 'src/index.ts',
      pkgJsonDependencyKeys: ['some-dependency'],
      pkgJsonPeerDependencyKeys: ['some-peer-dependency'],
      umdExternalDependencies: ['some-umd-external-dependency'],
      treeshakeOptions: { annotations: true },
      esmBuildPlugins: [{ name: 'some-esm-build-plugin' }],
      devBuildPlugins: [{ name: 'some-dev-build-plugin' }],
      prodBuildPlugins: [{ name: 'some-prod-build-plugin' }],
    });
  });

  test('creates 5 bundles', () => {
    expect(rollup).toHaveBeenCalledTimes(5);
  });

  test('creates esm bundle', () => {
    expect(mockedRollup.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-dependency",
          "some-peer-dependency",
        ],
        "input": "src/index.ts",
        "plugins": Array [
          Object {
            "name": "some-esm-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });

  test('creates cjs dev bundle', () => {
    expect(mockedRollup.mock.calls[1][0]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-dependency",
          "some-peer-dependency",
        ],
        "input": "src/index.ts",
        "plugins": Array [
          Object {
            "name": "some-dev-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });

  test('creates cjs prod bundle', () => {
    expect(mockedRollup.mock.calls[2][0]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-dependency",
          "some-peer-dependency",
        ],
        "input": "src/index.ts",
        "plugins": Array [
          Object {
            "name": "some-prod-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });

  test('creates umd dev bundle', () => {
    expect(mockedRollup.mock.calls[3][0]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-umd-external-dependency",
        ],
        "input": "src/index.ts",
        "plugins": Array [
          Object {
            "name": "some-dev-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });

  test('creates umd prod bundle', () => {
    expect(mockedRollup.mock.calls[4][0]).toMatchInlineSnapshot(`
      Object {
        "external": Array [
          "some-umd-external-dependency",
        ],
        "input": "src/index.ts",
        "plugins": Array [
          Object {
            "name": "some-prod-build-plugin",
          },
        ],
        "treeshake": Object {
          "annotations": true,
        },
      }
    `);
  });
});

describe('writeBundles', () => {
  const mockedBundleEsm = mocked(({
    write: jest.fn(),
  } as unknown) as RollupBuild);
  const mockedBundleCjsDev = mocked(({
    write: jest.fn(),
  } as unknown) as RollupBuild);
  const mockedBundleCjsProd = mocked(({
    write: jest.fn(),
  } as unknown) as RollupBuild);
  const mockedBundleUmdDev = mocked(({
    write: jest.fn(),
  } as unknown) as RollupBuild);
  const mockedBundleUmdProd = mocked(({
    write: jest.fn(),
  } as unknown) as RollupBuild);

  beforeEach(async () => {
    mockFs({
      '/dist': {},
    });
    await writeBundles({
      cwd: '/',
      kebabCasePkgName: 'test-package-name',
      bundleEsm: mockedBundleEsm,
      bundleCjsDev: mockedBundleCjsDev,
      bundleCjsProd: mockedBundleCjsProd,
      bundleUmdDev: mockedBundleUmdDev,
      bundleUmdProd: mockedBundleUmdProd,
      outputPlugins: [{ name: 'some-output-plugin' }],
      outputProdPlugins: [{ name: 'some-output-prod-plugin' }],
      umdNameForPkg: 'TestPackageName',
      umdDependencyGlobals: { 'some-umd-global-dep': 'TheGlobalDep' },
    });
  });

  test('writes esm bundle', () => {
    mockFs.restore();
    expect(mockedBundleEsm.write.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "file": "dist/test-package-name.esm.js",
        "format": "esm",
        "plugins": Array [
          Object {
            "name": "some-output-plugin",
          },
        ],
        "sourcemap": true,
        "sourcemapExcludeSources": false,
      }
    `);
  });

  test('writes cjs dev bundle', () => {
    mockFs.restore();
    expect(mockedBundleCjsDev.write.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "file": "dist/test-package-name.cjs.development.js",
        "format": "cjs",
        "plugins": Array [
          Object {
            "name": "some-output-plugin",
          },
        ],
        "sourcemap": true,
        "sourcemapExcludeSources": false,
      }
    `);
  });

  test('writes cjs prod bundle', () => {
    mockFs.restore();
    expect(mockedBundleCjsProd.write.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "compact": true,
        "file": "dist/test-package-name.cjs.production.js",
        "format": "cjs",
        "plugins": Array [
          Object {
            "name": "some-output-prod-plugin",
          },
        ],
        "sourcemap": true,
        "sourcemapExcludeSources": false,
      }
    `);
  });

  test('writes umd dev bundle', () => {
    mockFs.restore();
    expect(mockedBundleUmdDev.write.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "file": "dist/test-package-name.umd.development.js",
        "format": "umd",
        "globals": Object {
          "some-umd-global-dep": "TheGlobalDep",
        },
        "name": "TestPackageName",
        "plugins": Array [
          Object {
            "name": "some-output-plugin",
          },
        ],
        "sourcemap": true,
        "sourcemapExcludeSources": false,
      }
    `);
  });

  test('writes umd prod bundle', () => {
    mockFs.restore();
    expect(mockedBundleUmdProd.write.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "compact": true,
        "file": "dist/test-package-name.umd.production.js",
        "format": "umd",
        "globals": Object {
          "some-umd-global-dep": "TheGlobalDep",
        },
        "name": "TestPackageName",
        "plugins": Array [
          Object {
            "name": "some-output-prod-plugin",
          },
        ],
        "sourcemap": true,
        "sourcemapExcludeSources": false,
      }
    `);
  });

  test('writes cjs entry file', async () => {
    const cjsEntryFile = await fs.readFile(
      '/dist/test-package-name.cjs.js',
      'utf8',
    );

    mockFs.restore();
    expect(cjsEntryFile).toMatchInlineSnapshot(`
      "'use strict';

      if (process.env.NODE_ENV === 'production') {
        module.exports = require('./test-package-name.cjs.production.js');
      } else {
        module.exports = require('./test-package-name.cjs.development.js');
      }"
    `);
  });
});
