import { createRollupConfig } from '../rollupBuilds';

describe('treeshake options', () => {
  test('treeshake options with sideEffects: false', () => {
    const { treeshakeOptions } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(treeshakeOptions).toMatchInlineSnapshot(`
      Object {
        "annotations": true,
        "moduleSideEffects": false,
        "propertyReadSideEffects": false,
        "tryCatchDeoptimization": false,
        "unknownGlobalSideEffects": false,
      }
    `);
  });

  test('treeshake options with sideEffects: true', () => {
    const { treeshakeOptions } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(treeshakeOptions).toMatchInlineSnapshot(`
      Object {
        "annotations": true,
        "moduleSideEffects": true,
        "propertyReadSideEffects": true,
        "tryCatchDeoptimization": true,
        "unknownGlobalSideEffects": true,
      }
    `);
  });
});

describe('replaces dev mode code', () => {
  test("esm build plugins replaces __DEV__ with process.env.NODE_ENV !== 'production'", () => {
    const { esmBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(esmBuildPlugins).toContainEqual({
      name: '@rollup/plugin-replace',
      calledWith: {
        __DEV__: "process.env.NODE_ENV !== 'production'",
      },
    });
  });

  test("dev build plugins replaces NODE_ENV with 'development'", () => {
    const { devBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(devBuildPlugins).toContainEqual({
      name: '@rollup/plugin-replace',
      calledWith: { 'process.env.NODE_ENV': JSON.stringify('development') },
    });
  });

  test("prod build plugins replaces NODE_ENV with 'production'", () => {
    const { prodBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(prodBuildPlugins).toContainEqual({
      name: '@rollup/plugin-replace',
      calledWith: { 'process.env.NODE_ENV': JSON.stringify('production') },
    });
  });
});

describe('umd build configuration', () => {
  test('umd package name', () => {
    const { umdNameForPkg } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: ['some-peer-dependency'],
    });

    expect(umdNameForPkg).toBe('TestPackageName');
  });

  test('umd external globals when umdGlobalDependencies is not specified', () => {
    const {
      umdExternalDependencies,
      umdDependencyGlobals,
    } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: ['some-peer-dependency'],
    });

    expect(umdExternalDependencies).toContain('some-peer-dependency');
    expect(umdDependencyGlobals).toMatchObject({
      'some-peer-dependency': 'SomePeerDependency',
    });
  });

  test('umd external globals when umdGlobalDependencies is specified', () => {
    const {
      umdExternalDependencies,
      umdDependencyGlobals,
    } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: ['some-peer-dependency'],
      pkgJsonUmdGlobalDependencies: {
        'some-listed-umd-global-dependency': 'TheGlobalTestDependency',
      },
    });

    expect(umdExternalDependencies).toContain(
      'some-listed-umd-global-dependency',
    );
    expect(umdDependencyGlobals).toMatchObject({
      'some-listed-umd-global-dependency': 'TheGlobalTestDependency',
    });
  });
});

describe('rollup plugins', () => {
  test('esm build plugins with sideEffects: false', () => {
    const { esmBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(esmBuildPlugins).toMatchSnapshot();
  });

  test('esm build plugins with sideEffects: true', () => {
    const { esmBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(esmBuildPlugins).toMatchSnapshot();
  });

  test('dev build plugins with sideEffects: false', () => {
    const { devBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(devBuildPlugins).toMatchSnapshot();
  });

  test('dev build plugins with sideEffects: true', () => {
    const { devBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(devBuildPlugins).toMatchSnapshot();
  });

  test('prod build plugins with sideEffects: false', () => {
    const { prodBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(prodBuildPlugins).toMatchSnapshot();
  });

  test('prod build plugins with sideEffects: true', () => {
    const { prodBuildPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(prodBuildPlugins).toMatchSnapshot();
  });

  test('output plugins', () => {
    const { outputPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(outputPlugins).toMatchSnapshot();
  });

  test('output prod plugins', () => {
    const { outputProdPlugins } = createRollupConfig({
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(outputProdPlugins).toMatchSnapshot();
  });
});
