import { beforeEach } from 'vitest';

beforeEach(() => {
  // Reset environment variables
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
});
