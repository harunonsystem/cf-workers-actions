import { describe, test, expect, beforeEach, vi } from 'vitest';
import { CloudflareApi } from '../src/shared/lib/cloudflare-api';

global.fetch = vi.fn();

describe('Cleanup - Protected Workers', () => {
  let api: CloudflareApi;
  const mockApiToken = 'test-token';
  const mockAccountId = 'test-account';

  beforeEach(() => {
    api = new CloudflareApi(mockApiToken, mockAccountId);
    vi.clearAllMocks();
  });

  describe('findWorkersByPattern with protection', () => {
    test('should exclude protected workers from pattern match', async () => {
      const mockWorkers = [
        'myapp-pr-123',
        'myapp-pr-456',
        'myapp-develop',
        'myapp-staging',
        'myapp-production'
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('myapp-*');
      expect(allWorkers).toHaveLength(5);
      expect(allWorkers).toEqual(mockWorkers);

      const protectedSet = new Set(['myapp-develop', 'myapp-staging', 'myapp-production']);
      const filtered = allWorkers.filter((name) => !protectedSet.has(name));

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(['myapp-pr-123', 'myapp-pr-456']);
    });

    test('should protect workers matching pattern', async () => {
      const mockWorkers = [
        'myapp-pr-123',
        'myapp-develop-feature',
        'myapp-staging-test',
        'myapp-production'
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('myapp-*');

      const protectedPatterns = [/^.*-develop.*$/, /^.*-staging.*$/, /^.*-production$/];

      const filtered = allWorkers.filter((name) => {
        for (const pattern of protectedPatterns) {
          if (pattern.test(name)) {
            return false;
          }
        }
        return true;
      });

      expect(filtered).toHaveLength(1);
      expect(filtered).toEqual(['myapp-pr-123']);
    });

    test('should handle wildcard protection patterns', async () => {
      const mockWorkers = ['myapp-pr-123', 'myapp-pr-456', 'project-develop', 'project-staging'];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('*');

      const protectedPattern = /^.*-(develop|staging)$/;
      const filtered = allWorkers.filter((name) => !protectedPattern.test(name));

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(['myapp-pr-123', 'myapp-pr-456']);
    });

    test('should combine protected workers and patterns', async () => {
      const mockWorkers = [
        'myapp-pr-100',
        'myapp-pr-200',
        'myapp-develop',
        'myapp-staging',
        'special-worker',
        'test-develop-branch'
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('*');

      const protectedSet = new Set(['myapp-develop', 'myapp-staging', 'special-worker']);
      const protectedPattern = /^.*-develop.*$/;

      const filtered = allWorkers.filter((name) => {
        if (protectedSet.has(name)) return false;
        if (protectedPattern.test(name)) return false;
        return true;
      });

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(['myapp-pr-100', 'myapp-pr-200']);
    });

    test('should handle empty protection lists', async () => {
      const mockWorkers = ['myapp-pr-123', 'myapp-develop'];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('myapp-*');

      const protectedSet = new Set<string>();
      const filtered = allWorkers.filter((name) => !protectedSet.has(name));

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(mockWorkers);
    });
  });

  describe('Pattern matching edge cases', () => {
    test('should handle workers with similar names', async () => {
      const mockWorkers = ['app-develop', 'app-developer', 'app-development', 'app-pr-1'];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('app-*');

      const protectedPattern = /^app-develop$/;
      const filtered = allWorkers.filter((name) => !protectedPattern.test(name));

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(['app-developer', 'app-development', 'app-pr-1']);
    });

    test('should protect exact match only', async () => {
      const mockWorkers = ['myapp-staging', 'myapp-staging-old', 'myapp-staging-v2'];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValueOnce({
          success: true,
          result: mockWorkers.map((name) => ({ id: name, script: name }))
        })
      });

      const allWorkers = await api.findWorkersByPattern('myapp-*');

      const protectedSet = new Set(['myapp-staging']);
      const filtered = allWorkers.filter((name) => !protectedSet.has(name));

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(['myapp-staging-old', 'myapp-staging-v2']);
    });
  });
});
