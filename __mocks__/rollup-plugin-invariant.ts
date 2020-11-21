import { rollupPluginMockImplementation } from './helpers/rollupPluginMockImplementation';

const invariantPlugin = jest.fn(
  rollupPluginMockImplementation('rollup-plugin-invariant'),
);

export default invariantPlugin;
