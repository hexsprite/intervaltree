import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  replaceNodeEnv: true,
  env: {
    INTERVAL_TREE_DEBUG: "",
  },
});
