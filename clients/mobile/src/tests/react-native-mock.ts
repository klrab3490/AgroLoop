export const Platform = {
  OS: "ios",
  select: <T>(obj: Record<string, T> & { default?: T }): T | undefined => obj.ios ?? obj.default,
  isTesting: true,
};

export const TurboModuleRegistry = {
  get: () => null,
  getEnforcing: () => ({}),
};

export const NativeModules = {};

export const findNodeHandle = () => null;

export default {
  Platform,
  TurboModuleRegistry,
  NativeModules,
  findNodeHandle,
};
