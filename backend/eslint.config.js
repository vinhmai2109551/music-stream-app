import eslint from "@eslint/js"
import prettier from "eslint-plugin-prettier/recommended"
import globals from "globals"
import tseslint from "typescript-eslint"

/**
 * Modular monolith boundaries.
 * A module may use another module only through that module's `index.js` (its public API).
 * Reaching into `../users/users.service.js` or `../users/dto/...` is an error.
 */
const MODULES = [
  "albums",
  "artists",
  "auth",
  "comments",
  "feed",
  "follows",
  "likes",
  "playlists",
  "tracks",
  "uploads",
  "users",
]

const publicApiOnly = (names) => ({
  patterns: names.map((name) => ({
    group: [`**/${name}/**`, `!**/${name}/index.js`],
    message: `Use the public API of the "${name}" module (${name}/index.js), not its internals.`,
  })),
})

const moduleRules = MODULES.map((name) => ({
  files: [`src/modules/${name}/**/*.ts`],
  rules: {
    "no-restricted-imports": ["error", publicApiOnly(MODULES.filter((other) => other !== name))],
  },
}))

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "src/generated/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  ...moduleRules,
  {
    // Composition root, seed and tooling may also use modules through their public API only.
    files: ["src/*.ts", "src/seed/**/*.ts", "prisma/**/*.ts"],
    rules: { "no-restricted-imports": ["error", publicApiOnly(MODULES)] },
  },
  {
    // Shared kernel and infrastructure must not depend on any domain module.
    files: ["src/shared/**/*.ts", "src/infrastructure/**/*.ts", "src/config/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/modules/**"], message: "Shared code must not depend on domain modules." },
          ],
        },
      ],
    },
  },
)
