/**
 * ESLint flat config (ESLint 9+).
 *
 * - @eslint/js → core JS best practices
 * - typescript-eslint → type-aware rules for .ts / .vue script
 * - eslint-plugin-vue flat/essential → Vue 3 error-prevention rules
 * - eslint-config-prettier → turn off rules that fight Prettier
 *
 * Style (quotes, semicolons, wrapping) is Prettier’s job — see .prettierrc.json.
 */
import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    name: "app/files-to-ignore",
    ignores: ["**/dist/**", "**/dist-ssr/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    name: "app/vue-ts-parser",
    files: ["**/*.vue"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
  },
  {
    name: "app/browser-globals",
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      /* Existing codebase uses flexible records at API boundaries. */
      "@typescript-eslint/no-explicit-any": "off",
      "vue/multi-word-component-names": "off",
    },
  },
  eslintConfigPrettier,
);
