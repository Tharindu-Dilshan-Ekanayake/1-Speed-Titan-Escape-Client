import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // The render loop mutates three.js objects (uniforms, transforms, the shared
    // input state) inside useFrame on purpose - that is how R3F avoids re-rendering
    // at 60fps. The compiler's immutability rule can't tell that apart from
    // mutating React state, so it is off for game code only.
    files: ['src/game/**/*.{js,jsx}'],
    rules: { 'react-hooks/immutability': 'off' },
  },
])
