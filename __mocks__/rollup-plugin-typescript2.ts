import { rollupPluginMockImplementation } from './helpers/rollupPluginMockImplementation';

const rollupTypescript = jest.fn(
  rollupPluginMockImplementation('rollup-plugin-typescript2'),
);

export default rollupTypescript;
