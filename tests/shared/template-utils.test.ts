import { describe, expect, it, test } from 'vitest';
import { processTemplate } from '../../src/shared/lib/template-utils';

describe('template-utils', () => {
  describe('processTemplate', () => {
    describe('PR number pattern', () => {
      test('should use PR number when available', () => {
        const template = 'myapp-pr-{pr-number}';
        const variables = {
          prNumber: '123',
          branchName: 'feature-login'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-pr-123');
      });

      test('should fall back to branch name when PR number is not available', () => {
        const template = 'myapp-pr-{pr-number}';
        const variables = {
          branchName: 'feature-login'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-pr-feature-login');
      });

      test('should sanitize branch name when used as fallback', () => {
        const template = 'myapp-pr-{pr-number}';
        const variables = {
          branchName: 'feature/awesome-feature'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-pr-featureawesome-feature');
      });
    });

    describe('Branch name pattern', () => {
      test('should use branch name when available', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'develop'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-develop');
      });

      test('should use branch name value for {branch-name}', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          prNumber: '456',
          branchName: 'refs-pull-456-merge'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-refs-pull-456-merge');
      });

      test('should handle sanitized branch names', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'feature-new-ui'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-feature-new-ui');
      });
    });

    describe('Static worker names', () => {
      test('should handle static names without variables', () => {
        const template = 'myapp-release-v1-2-3';
        const variables = {
          branchName: 'release/v1.2.3'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-release-v1-2-3');
      });

      test('should still sanitize static names', () => {
        const template = 'my_app@prod';
        const variables = {
          branchName: 'main'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myappprod');
      });
    });

    describe('Sanitization', () => {
      it.each([
        ['app_{pr-number}_test', { prNumber: '123', branchName: 'main' }, 'app123test'],
        ['my-app-pr-{pr-number}', { prNumber: '789', branchName: 'main' }, 'my-app-pr-789'],
        ['app.v{pr-number}', { prNumber: '1', branchName: 'main' }, 'appv1'],
        ['deploy-{branch-name}', { branchName: 'feature/auth' }, 'deploy-featureauth'],
        ['app_{branch-name}', { branchName: 'feature_test' }, 'appfeaturetest'],
        ['app@{pr-number}#test', { prNumber: '123', branchName: 'main' }, 'app123test']
      ])('should sanitize "%s" to "%s"', (template, variables, expected) => {
        expect(processTemplate(template, variables)).toBe(expected);
      });
    });

    describe('Edge cases', () => {
      test('should handle empty template', () => {
        const template = '';
        const variables = {
          branchName: 'main'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('');
      });

      test('should handle multiple variable occurrences', () => {
        const template = '{pr-number}-{pr-number}';
        const variables = {
          prNumber: '42',
          branchName: 'main'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('42-42');
      });

      test('should handle mixed variables', () => {
        const template = 'app-{pr-number}-{branch-name}';
        const variables = {
          prNumber: '100',
          branchName: 'hotfix-auth'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('app-100-hotfix-auth');
      });

      test('should handle only alphanumeric output', () => {
        const template = '{branch-name}';
        const variables = {
          branchName: 'abc123'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('abc123');
      });

      test('should handle complex branch names', () => {
        const template = 'preview-{branch-name}';
        const variables = {
          branchName: 'feature/UI-123_fix-bug@v2'
        };

        const result = processTemplate(template, variables);

        // Hyphens are preserved, only slashes, underscores, and @ are removed
        expect(result).toBe('preview-featureUI-123fix-bugv2');
      });
    });

    describe('Real-world scenarios', () => {
      test('should generate valid Cloudflare worker name for PR', () => {
        const template = '2048-game-pr-{pr-number}';
        const variables = {
          prNumber: '79',
          branchName: 'feature-using-prefix-and-numbers'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('2048-game-pr-79');
      });

      test('should generate valid worker name with branch name', () => {
        const template = 'mini-games-{branch-name}';
        const variables = {
          branchName: 'develop'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('mini-games-develop');
      });

      test('should handle fallback from PR to branch gracefully', () => {
        const template = 'myapp-pr-{pr-number}';
        const variables = {
          branchName: 'hotfix-critical-bug'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-pr-hotfix-critical-bug');
      });
    });
  });
});
