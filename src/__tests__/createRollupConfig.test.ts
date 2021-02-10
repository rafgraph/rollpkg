import { createRollupConfig } from '../rollupBuilds';

describe('treeshake options', () => {
  test('treeshake options with sideEffects: false', () => {
    const { treeshakeOptions } = createRollupConfig({
      addUmdBuild: false,
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
      addUmdBuild: false,
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
  test("default build plugins replaces __DEV__ with process.env.NODE_ENV !== 'production'", () => {
    const { buildPluginsDefault } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsDefault).toContainEqual({
      name: '@rollup/plugin-replace',
      calledWith: {
        __DEV__: "process.env.NODE_ENV !== 'production'",
      },
    });
  });

  test("dev build plugins replaces NODE_ENV with 'development'", () => {
    const { buildPluginsWithNodeEnvDevelopment } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsWithNodeEnvDevelopment).toContainEqual({
      name: '@rollup/plugin-replace',
      calledWith: { 'process.env.NODE_ENV': JSON.stringify('development') },
    });
  });

  test("prod build plugins replaces NODE_ENV with 'production'", () => {
    const { buildPluginsWithNodeEnvProduction } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsWithNodeEnvProduction).toContainEqual({
      name: '@rollup/plugin-replace',
      calledWith: { 'process.env.NODE_ENV': JSON.stringify('production') },
    });
  });
});

describe('umd build configuration', () => {
  test('umd package name', () => {
    const { umdNameForPkg } = createRollupConfig({
      addUmdBuild: true,
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
      addUmdBuild: true,
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
      addUmdBuild: true,
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
  test('default build plugins with sideEffects: false', () => {
    const { buildPluginsDefault } = createRollupConfig({
      addUmdBuild: true,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsDefault).toMatchSnapshot();
  });

  test('default build plugins with sideEffects: true', () => {
    const { buildPluginsDefault } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsDefault).toMatchSnapshot();
  });

  test('dev build plugins with sideEffects: false', () => {
    const { buildPluginsWithNodeEnvDevelopment } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsWithNodeEnvDevelopment).toMatchSnapshot();
  });

  test('dev build plugins with sideEffects: true', () => {
    const { buildPluginsWithNodeEnvDevelopment } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsWithNodeEnvDevelopment).toMatchSnapshot();
  });

  test('prod build plugins with sideEffects: false', () => {
    const { buildPluginsWithNodeEnvProduction } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsWithNodeEnvProduction).toMatchSnapshot();
  });

  test('prod build plugins with sideEffects: true', () => {
    const { buildPluginsWithNodeEnvProduction } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: true,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(buildPluginsWithNodeEnvProduction).toMatchSnapshot();
  });

  test('output default plugins', () => {
    const { outputPluginsDefault } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(outputPluginsDefault).toMatchSnapshot();
  });

  test('output prod plugins', () => {
    const { outputPluginsProduction } = createRollupConfig({
      addUmdBuild: false,
      kebabCasePkgName: 'test-package-name',
      pkgJsonSideEffects: false,
      pkgJsonPeerDependencyKeys: [],
    });

    expect(outputPluginsProduction).toMatchSnapshot();
  });
});
