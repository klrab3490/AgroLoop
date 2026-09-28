import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "react-native": path.resolve(__dirname, "src/tests/react-native-mock.ts"),
      "expo-constants": path.resolve(__dirname, "src/tests/expo-constants-mock.ts"),
    },
  },
});
