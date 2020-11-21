import { rollupPluginMockImplementation } from '../helpers/rollupPluginMockImplementation';

const json = jest.fn(rollupPluginMockImplementation('@rollup/plugin-json'));

export default json;
