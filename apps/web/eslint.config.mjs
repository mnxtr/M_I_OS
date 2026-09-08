import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**"],
  },
  {
    // §14 security boundary: the service-role client may only be constructed in code
    // that is guaranteed server-only. Route handlers and Server Action modules qualify;
    // a page or component does not, because it can be pulled into a client bundle.
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["app/api/**", "**/actions.ts", "lib/supabase/admin.ts"],
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
