  import nextPlugin from "@next/eslint-plugin-next"
  import reactHooks from "eslint-plugin-react-hooks"
  import tseslint from "typescript-eslint"

  export default [
    {
      ignores: ["node_modules/", ".next/", "dist/", "build/", "coverage/", "*.min.js"]
    },
    ...tseslint.configs.recommended,
    {
      files: ["**/*.{ts,tsx,js,jsx,mjs}"],
      plugins: {
        "@next/next": nextPlugin,
        "react-hooks": reactHooks
      },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs["core-web-vitals"].rules,
        ...reactHooks.configs.recommended.rules,
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]