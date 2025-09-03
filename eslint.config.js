import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import typescriptEslint from "typescript-eslint";
import prettier from "@vue/eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import vueParser from "vue-eslint-parser";
import globals from "globals";

export default typescriptEslint.config(
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  prettier,
  {
    name: "app/files-to-lint",
    files: ["**/*.{ts,mts,tsx,vue,js,jsx}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/dist/**",
      "**/dist-ssr/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.env*",
      "**/public/**",
    ],
  },
  {
    name: "app/base-setup",
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    name: "app/vue-setup",
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: typescriptEslint.parser,
        sourceType: "module",
        ecmaVersion: "latest",
      },
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    name: "app/typescript-setup",
    files: ["**/*.{ts,mts,tsx}"],
    languageOptions: {
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    name: "app/test-setup",
    files: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
    },
    languageOptions: {
      globals: {
        ...vitest.environments.env.globals,
      },
    },
  },
  {
    name: "app/custom-rules",
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off", // 允许console.log用于调试
      "no-debugger": "warn",
    },
  },
);
