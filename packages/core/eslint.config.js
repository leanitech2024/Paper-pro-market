import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next", "next/*"],
              message: "core must not import Next.js",
            },
            {
              group: ["react", "react/*"],
              message: "core must not import React",
            },
            {
              group: ["fastify", "fastify/*"],
              message: "core must not import Fastify",
            },
            { group: ["ws"], message: "core must not import ws" },
            {
              group: ["apps/web/*", "apps/market-engine/*"],
              message: "core must not import from apps",
            },
          ],
        },
      ],
    },
  },
);
