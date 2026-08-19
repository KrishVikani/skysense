module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/no-unescaped-entities": "off",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
  },
};