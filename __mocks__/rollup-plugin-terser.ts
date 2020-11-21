import { rollupPluginMockImplementation } from './helpers/rollupPluginMockImplementation';

export const terser = jest.fn(
  rollupPluginMockImplementation('rollup-plugin-terser'),
);
