import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@paper-market/web", "apps/web/*"],
              message: "market-engine must not import from apps/web",
            },
            {
              group: ["next", "next/*", "react"],
              message: "market-engine must not import Next/React",
            },
          ],
        },
      ],
    },
  },
);
