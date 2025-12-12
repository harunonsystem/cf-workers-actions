import * as fs from 'node:fs';
import * as core from '@actions/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('node:fs');
vi.mock('@actions/core');
vi.mock('../../src/shared/lib/logger');

import { updateWranglerToml } from '../../src/shared/lib/wrangler-utils';

describe('wrangler-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateWranglerToml', () => {
    const mockTomlPath = './wrangler.toml';
    const mockBackupPath = './wrangler.toml.bak';

    test('should update existing name in environment section', async () => {
      const existingToml = `name = "my-app"
main = "src/index.ts"

[env.preview]
name = "my-app-preview"
vars = { ENV = "preview" }`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'new-worker-name');

      expect(fs.existsSync).toHaveBeenCalledWith(mockTomlPath);
      expect(fs.copyFileSync).toHaveBeenCalledWith(mockTomlPath, mockBackupPath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockTomlPath,
        expect.stringContaining('name = "new-worker-name"')
      );
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('✅ Updated existing name'));
    });

    test('should add name if not present in environment section', async () => {
      const existingToml = `name = "my-app"
main = "src/index.ts"

[env.preview]
vars = { ENV = "preview" }`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'new-worker-name');

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        mockTomlPath,
        expect.stringContaining('name = "new-worker-name"')
      );
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('✅ Added name to wrangler.toml')
      );
    });

    test('should throw error if file does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      await expect(updateWranglerToml(mockTomlPath, 'preview', 'test-worker')).rejects.toThrow(
        'wrangler.toml not found'
      );
    });

    test('should throw error if environment section not found', async () => {
      const existingToml = `name = "my-app"
main = "src/index.ts"`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});

      await expect(updateWranglerToml(mockTomlPath, 'preview', 'test-worker')).rejects.toThrow(
        '[env.preview] section not found'
      );
    });

    test('should restore backup on failure', async () => {
      const existingToml = `name = "my-app"

[env.preview]
name = "old-name"`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(updateWranglerToml(mockTomlPath, 'preview', 'test-worker')).rejects.toThrow(
        'Write failed'
      );

      // Should restore backup
      expect(fs.copyFileSync).toHaveBeenCalledWith(mockBackupPath, mockTomlPath);
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Failed to update wrangler.toml')
      );
    });

    test('should create backup before updating', async () => {
      const existingToml = `name = "my-app"

[env.preview]
name = "old-name"`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'new-name');

      expect(fs.copyFileSync).toHaveBeenCalledWith(mockTomlPath, mockBackupPath);
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('✅ Created backup'));
    });

    test('should handle multiple environment sections', async () => {
      const existingToml = `name = "my-app"

[env.staging]
name = "my-app-staging"

[env.preview]
name = "my-app-preview"

[env.production]
name = "my-app-prod"`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'new-preview-name');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const updatedContent = writeCall[1] as string;

      // Should only update preview section
      expect(updatedContent).toContain('name = "new-preview-name"');
      expect(updatedContent).toContain('name = "my-app-staging"');
      expect(updatedContent).toContain('name = "my-app-prod"');
      expect(updatedContent).not.toContain('name = "my-app-preview"');
    });

    test('should preserve comments and formatting', async () => {
      const existingToml = `# Main config
name = "my-app"

# Preview environment
[env.preview]
name = "old-name"
# Environment variables
vars = { ENV = "preview" }`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'new-name');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const updatedContent = writeCall[1] as string;

      // Should preserve comments
      expect(updatedContent).toContain('# Main config');
      expect(updatedContent).toContain('# Preview environment');
      expect(updatedContent).toContain('# Environment variables');
    });

    test('should handle worker names with special characters', async () => {
      const existingToml = `name = "my-app"

[env.preview]
vars = { ENV = "preview" }`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'my-app-pr-123');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const updatedContent = writeCall[1] as string;

      expect(updatedContent).toContain('name = "my-app-pr-123"');
    });

    test('should add name right after environment section header', async () => {
      const existingToml = `name = "my-app"

[env.preview]
vars = { ENV = "preview" }
compatibility_date = "2023-01-01"`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(existingToml);
      vi.mocked(fs.copyFileSync).mockImplementation(() => {});
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});

      await updateWranglerToml(mockTomlPath, 'preview', 'test-name');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const updatedContent = writeCall[1] as string;
      const lines = updatedContent.split('\n');

      const previewIndex = lines.findIndex((line) => line.includes('[env.preview]'));
      expect(lines[previewIndex + 1]).toContain('name = "test-name"');
    });
  });
});
