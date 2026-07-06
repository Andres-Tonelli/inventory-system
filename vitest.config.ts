import { defineConfig } from 'vitest/config';
import * as path from 'path';

/**
 * Config de Vitest para los tests unitarios de las libs del backend.
 * Los alias replican los `paths` de tsconfig.base.json (Vitest no los lee solo).
 */
export default defineConfig({
  test: {
    include: ['libs/**/*.spec.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@inventory-system/api-contract': path.resolve(__dirname, 'libs/shared/api-contract/src/index.ts'),
      '@inventory-system/backend-domain': path.resolve(__dirname, 'libs/backend/domain/src/index.ts'),
      '@inventory-system/backend-persistence': path.resolve(__dirname, 'libs/backend/persistence-prisma/src/index.ts'),
      '@inventory-system/backend-application': path.resolve(__dirname, 'libs/backend/application/src/index.ts'),
    },
  },
});
