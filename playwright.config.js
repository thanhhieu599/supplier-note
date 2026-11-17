import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/integration', timeout: 20000, expect: {timeout:5000},
 fullyParallel: false, workers: 1, retries: 0,
 use: { headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium' }, trace: 'retain-on-failure' },
 reporter: [['list'], ['json', {outputFile:'test-results/integration.json'}]],
});
