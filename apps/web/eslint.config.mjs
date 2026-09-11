import nextConfig from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    // These rules are React Compiler diagnostics rather than correctness checks. The
    // current app intentionally uses guarded async loading, browser cookie writes, and
    // time-based badges in client components; keep those patterns lint-clean until they
    // are migrated to error boundaries/effects in a dedicated UI pass.
    rules: {
      "react-hooks/error-boundaries": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    // §14 security boundary: the service-role client may only be constructed in code
    // that is guaranteed server-only. Route handlers and Server Action modules qualify;
    // a page or component does not, because it can be pulled into a client bundle.
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "app/api/**",
      "**/actions.ts",
      "lib/supabase/admin.ts",
      "lib/compliance/templates.ts",
      "lib/knowledge/ingest.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/admin",
              message:
                "The service-role client is server-only. Import it from app/api/**/route.ts or a *.actions.ts module.",
            },
          ],
        },
      ],
    },
  },
  {
    // LLM output is rendered as text. Never as HTML.
    files: ["**/*.tsx"],
    rules: {
      "react/no-danger": "error",
    },
  },
];

export default eslintConfig;
