import { rollupPluginMockImplementation } from '../helpers/rollupPluginMockImplementation';

const resolveRollup = jest.fn(
  rollupPluginMockImplementation('@rollup/plugin-resolve'),
);

export default resolveRollup;
