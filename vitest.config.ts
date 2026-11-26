import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@pixel-hero/shared': path.resolve(__dirname, 'shared/src/index.ts')
    }
  },
  test: {
    include: ['shared/**/*.test.ts', 'client/**/*.test.ts', 'server/**/*.test.ts'],
    environment: 'node'
  }
});
