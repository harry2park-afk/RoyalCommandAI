import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({ test: { environment: 'node', include: ['docs/maintenance/qa/joint-ai-entry.spec.ts'] }, resolve: { alias: { '@': path.resolve('src') } } });
