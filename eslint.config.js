const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["node_modules/", "coverage/", "api/data/"] },
  js.configs.recommended,
  {
    rules: {
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["api/**/*.js", "eslint.config.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
  },
  {
    files: ["web/**/*.js"],
    languageOptions: {
      sourceType: "module",
      // Leaflet and Chart.js are loaded from a CDN as classic scripts.
      globals: { ...globals.browser, L: "readonly", Chart: "readonly" },
    },
    rules: { "no-console": "error" },
  },
];
