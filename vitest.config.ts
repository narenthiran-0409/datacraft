import { defineConfig } from 'vitest/config';

// Phase 4.10 — minimal test runner config, kept separate from vite.config.ts
// so the dev/build config is untouched. No project previously had any test
// infrastructure (no vitest/jest/testing-library in package.json) — this is
// the first one. No react() plugin needed: esbuild's built-in JSX transform
// (driven by tsconfig's "jsx": "react-jsx") handles .tsx test files fine,
// and skipping the plugin avoids a duplicate-vite-types conflict between
// this project's vite and vitest's own nested vite dependency under `tsc
// --noEmit` (a real project already has one; vitest ships another).
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.ts'],
    globals: true,
  },
});
