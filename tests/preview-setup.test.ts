import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  createBackup,
  updateWorkerName,
  updateEnvVars,
  updateRoutes,
  setupPreviewEnvironment,
} from '../src/preview-setup/setup';

describe('preview-setup', () => {
  let testDir: string;
  let testTomlPath: string;

  const minimalToml = `name = "test-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"
`;

  beforeEach(() => {
    // Create temporary directory for tests
    testDir = mkdtempSync(join(tmpdir(), 'preview-setup-test-'));
    testTomlPath = join(testDir, 'wrangler.toml');

    // Create minimal wrangler.toml
    writeFileSync(testTomlPath, minimalToml, 'utf-8');
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('createBackup', () => {
    it('should create a backup file', () => {
      const backupPath = createBackup(testTomlPath);

      expect(backupPath).toMatch(/wrangler\.toml\.backup\.\d+$/);

      const original = readFileSync(testTomlPath, 'utf-8');
      const backup = readFileSync(backupPath, 'utf-8');

      expect(backup).toBe(original);
    });

    it('should throw error if file does not exist', () => {
      expect(() => createBackup('/nonexistent/file.toml')).toThrow(
        'File not found'
      );
    });
  });

  describe('updateWorkerName', () => {
    it('should add new environment section', () => {
      updateWorkerName(testTomlPath, 'preview', 'test-worker-preview-123');

      const content = readFileSync(testTomlPath, 'utf-8');

      expect(content).toContain('[env.preview]');
      expect(content).toContain('name = "test-worker-preview-123"');
    });

    it('should update existing environment section', () => {
      // Add existing preview environment
      const tomlWithEnv = `${minimalToml}
[env.preview]
name = "old-worker-name"
`;
      writeFileSync(testTomlPath, tomlWithEnv, 'utf-8');

      updateWorkerName(testTomlPath, 'preview', 'new-worker-name');

      const content = readFileSync(testTomlPath, 'utf-8');

      expect(content).toContain('name = "new-worker-name"');
      expect(content).not.toContain('old-worker-name');
    });

    it('should throw error if file does not exist', () => {
      expect(() =>
        updateWorkerName('/nonexistent/file.toml', 'preview', 'worker')
      ).toThrow('File not found');
    });
  });

  describe('updateEnvVars', () => {
    it('should add environment variables', () => {
      updateEnvVars(testTomlPath, 'preview', {
        ENVIRONMENT: 'preview',
        DEBUG: 'true',
      });

      const content = readFileSync(testTomlPath, 'utf-8');

      expect(content).toContain('[env.preview.vars]');
      expect(content).toContain('ENVIRONMENT = "preview"');
      expect(content).toContain('DEBUG = "true"');
    });

    it('should throw error if file does not exist', () => {
      expect(() =>
        updateEnvVars('/nonexistent/file.toml', 'preview', {})
      ).toThrow('File not found');
    });
  });

  describe('updateRoutes', () => {
    it('should add routes', () => {
      updateRoutes(testTomlPath, 'preview', [
        'example.com/*',
        'preview.example.com/*',
      ]);

      const content = readFileSync(testTomlPath, 'utf-8');

      expect(content).toContain('[[env.preview.routes]]');
      expect(content).toContain('pattern = "example.com/*"');
      expect(content).toContain('pattern = "preview.example.com/*"');
    });

    it('should throw error if file does not exist', () => {
      expect(() =>
        updateRoutes('/nonexistent/file.toml', 'preview', [])
      ).toThrow('File not found');
    });
  });

  describe('setupPreviewEnvironment', () => {
    it('should setup preview environment with all options', () => {
      const result = setupPreviewEnvironment({
        wranglerTomlPath: testTomlPath,
        environmentName: 'preview',
        workerName: 'test-worker-pr-42',
        createBackup: true,
        updateVars: {
          ENVIRONMENT: 'preview',
        },
        updateRoutes: ['preview.example.com/*'],
      });

      expect(result.updated).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toMatch(/wrangler\.toml\.backup\.\d+$/);

      const content = readFileSync(testTomlPath, 'utf-8');

      expect(content).toContain('[env.preview]');
      expect(content).toContain('name = "test-worker-pr-42"');
      expect(content).toContain('[env.preview.vars]');
      expect(content).toContain('ENVIRONMENT = "preview"');
      expect(content).toContain('[[env.preview.routes]]');
      expect(content).toContain('pattern = "preview.example.com/*"');
    });

    it('should setup without backup', () => {
      const result = setupPreviewEnvironment({
        wranglerTomlPath: testTomlPath,
        environmentName: 'preview',
        workerName: 'test-worker',
        createBackup: false,
      });

      expect(result.updated).toBe(true);
      expect(result.backupPath).toBeUndefined();
    });

    it('should setup without optional parameters', () => {
      const result = setupPreviewEnvironment({
        wranglerTomlPath: testTomlPath,
        environmentName: 'preview',
        workerName: 'test-worker',
      });

      expect(result.updated).toBe(true);

      const content = readFileSync(testTomlPath, 'utf-8');

      expect(content).toContain('name = "test-worker"');
      expect(content).not.toContain('[env.preview.vars]');
      expect(content).not.toContain('[[env.preview.routes]]');
    });
  });
});
