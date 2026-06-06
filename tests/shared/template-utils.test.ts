import { describe, expect, it, test } from 'vitest';
import { processTemplate } from '../../src/shared/lib/template-utils';

describe('template-utils', () => {
  describe('processTemplate', () => {
    describe('Branch name pattern', () => {
      test('should use branch name when available', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'develop',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-develop');
      });

      test('should use branch name value for {branch-name}', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'refs-pull-456-merge',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-refs-pull-456-merge');
      });

      test('should handle sanitized branch names', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'feature-new-ui',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-feature-new-ui');
      });
    });

    describe('Commit hash pattern', () => {
      test('should use commit hash when available', () => {
        const template = 'myapp-{commit-hash}';
        const variables = {
          branchName: 'feature-login',
          commitHash: 'deadbeef'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-deadbeef');
      });

      test('should handle multiple commit hash occurrences', () => {
        const template = '{commit-hash}-{commit-hash}';
        const variables = {
          branchName: 'main',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('abc1234-abc1234');
      });
    });

    describe('Static worker names', () => {
      test('should handle static names without variables', () => {
        const template = 'myapp-release-v1-2-3';
        const variables = {
          branchName: 'release/v1.2.3',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-release-v1-2-3');
      });

      test('should still sanitize static names', () => {
        const template = 'my_app@prod';
        const variables = {
          branchName: 'main',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myappprod');
      });
    });

    describe('Sanitization', () => {
      it.each([
        ['app_{commit-hash}_test', { branchName: 'main', commitHash: '1234567' }, 'app1234567test'],
        ['my-app-{commit-hash}', { branchName: 'main', commitHash: '789abcd' }, 'my-app-789abcd'],
        ['app.v{commit-hash}', { branchName: 'main', commitHash: '1' }, 'appv1'],
        [
          'deploy-{branch-name}',
          { branchName: 'feature/auth', commitHash: 'abc1234' },
          'deploy-featureauth'
        ],
        [
          'app_{branch-name}',
          { branchName: 'feature_test', commitHash: 'abc1234' },
          'appfeaturetest'
        ],
        ['app@{commit-hash}#test', { branchName: 'main', commitHash: '1234567' }, 'app1234567test']
      ])('should sanitize "%s" to "%s"', (template, variables, expected) => {
        expect(processTemplate(template, variables)).toBe(expected);
      });
    });

    describe('Edge cases', () => {
      test('should handle empty template', () => {
        const template = '';
        const variables = {
          branchName: 'main',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('');
      });

      test('should handle mixed variables', () => {
        const template = 'app-{branch-name}-{commit-hash}';
        const variables = {
          branchName: 'hotfix-auth',
          commitHash: 'cafe123'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('app-hotfix-auth-cafe123');
      });

      test('should handle only alphanumeric output', () => {
        const template = '{branch-name}';
        const variables = {
          branchName: 'abc123',
          commitHash: 'def4567'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('abc123');
      });

      test('should handle complex branch names', () => {
        const template = 'preview-{branch-name}';
        const variables = {
          branchName: 'feature/UI-123_fix-bug@v2',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('preview-featureui-123fix-bugv2');
      });
    });

    describe('Length limit', () => {
      test('should truncate worker names longer than 54 characters', () => {
        const template = 'cf-actions-e2e-{branch-name}';
        const variables = {
          branchName: 'feature-using-branchname-instead-of-prnumber',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('cf-actions-e2e-feature-using-branchname-instead-of-prn');
        expect(result.length).toBe(54);
      });

      test('should not truncate worker names within 54 characters', () => {
        const template = 'myapp-{branch-name}';
        const variables = {
          branchName: 'short-branch',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('myapp-short-branch');
        expect(result.length).toBeLessThanOrEqual(54);
      });
    });

    describe('Real-world scenarios', () => {
      test('should generate valid Cloudflare worker name for branch', () => {
        const template = '2048-game-{branch-name}';
        const variables = {
          branchName: 'feature-using-prefix-and-numbers',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('2048-game-feature-using-prefix-and-numbers');
      });

      test('should generate valid worker name with branch name', () => {
        const template = 'mini-games-{branch-name}';
        const variables = {
          branchName: 'develop',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('mini-games-develop');
      });

      test('should generate valid worker name with commit hash', () => {
        const template = 'afkkeyboard-{commit-hash}';
        const variables = {
          branchName: 'hotfix-critical-bug',
          commitHash: 'deadbeef'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('afkkeyboard-deadbeef');
      });

      test('should lowercase worker name to satisfy Cloudflare naming rules', () => {
        const template = 'mini-games-app-{branch-name}';
        const variables = {
          branchName: 'claude-markdown-preview-tool-0CKAi',
          commitHash: 'abc1234'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('mini-games-app-claude-markdown-preview-tool-0ckai');
        expect(result).toBe(result.toLowerCase());
      });
    });
  });
});
