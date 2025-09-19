import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "sw.js",
      "workbox-*.js",
      "jest.setup.js",
      "scripts/test-setup.js",
      "scripts/seed-emulator-enhanced.js",
      "scripts/seed-emulator-fixed.js",
      "src/__tests__/performance-benchmarks.disabled/**"
    ]
  },
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]},
  {
    languageOptions: { 
      globals: globals.browser,
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },
  // Specific config for Node.js files
  {
    files: ["**/*.cjs", "jest.config.cjs", "babel.config.cjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
];