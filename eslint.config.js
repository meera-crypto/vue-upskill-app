/**
 * ESLint flat config (ESLint 9+).
 *
 * - @eslint/js → core JS best practices
 * - eslint-plugin-vue flat/essential → Vue 3 error-prevention rules
 * - eslint-config-prettier → turn off rules that fight Prettier
 *
 * Style (quotes, semicolons, wrapping) is Prettier’s job — see .prettierrc.json.
 */
import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    name: "app/files-to-lint",
    files: ["**/*.{js,mjs,cjs,vue}"],
  },
  {
    name: "app/files-to-ignore",
    ignores: [
      "**/dist/**",
      "**/dist-ssr/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  {
    name: "app/vue-and-js",
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Prefer explicit unused handling in learning code; keep noise low.
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "vue/multi-word-component-names": "off",
    },
  },
  eslintConfigPrettier,
];
