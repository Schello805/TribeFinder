import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "dance-connect/**",
    // Generated code
    "src/generated/**",
    // Scripts and utility files
    "scripts/**",
    "**/*.js",
    "**/*.config.js",
    // Public files (service workers, etc.)
    "public/workbox-*.js",
    "public/sw.js",
    "public/swe-worker-*.js",
  ]),
  {
    files: ["src/components/ui/ImageWithFallback.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
