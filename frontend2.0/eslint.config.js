import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // shadcn/ui primitives (vendor-style, not hand-rolled project code): each
    // file idiomatically co-exports a component + its `cva()` variants function
    // (badgeVariants, buttonVariants, navigationMenuTriggerStyle) or a paired
    // context hook (useFormField, useSidebar). Splitting those into a sibling
    // file would only restore Fast Refresh granularity in dev - not fix a real
    // bug - while forcing an import-path change in every consumer across the
    // app. Disabling the rule here (scoped, not project-wide) is the standard
    // trade-off for this exact shadcn/ui pattern.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // TxTrackerContext exports both <TxTrackerProvider> and its paired
    // useTxTracker() hook - the standard React context co-location pattern.
    // Same reasoning as the ui/ override above: affects Fast Refresh
    // granularity only, not runtime correctness.
    files: ["src/context/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  eslintPluginPrettier,
);
