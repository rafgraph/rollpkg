export const rollupPluginMockImplementation = (pluginName: string) => (
  arg: unknown,
): string | { name: string; calledWith: unknown } =>
  arg !== undefined
    ? {
        name: pluginName,
        calledWith: arg,
      }
    : pluginName;
