import { describe, test, expect } from 'vitest';

/**
 * prepare-preview-deploy アクションのテンプレート処理ロジックのテスト
 */

interface TemplateVariables {
  prNumber?: string;
  branchName: string;
}

/**
 * テンプレート処理関数
 * - {pr-number}: PR番号、なければブランチ名にフォールバック
 * - {branch-name}: ブランチ名
 */
function processTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace {pr-number} with PR number if available, otherwise fall back to branch-name
  const prIdentifier = variables.prNumber || variables.branchName;
  result = result.replace(/\{pr-number\}/g, prIdentifier);
  
  // Replace {branch-name} with branch name
  result = result.replace(/\{branch-name\}/g, variables.branchName);

  // Sanitize: remove invalid characters (only alphanumeric and dashes allowed)
  result = result.replace(/[^a-zA-Z0-9-]/g, '');

  return result;
}

/**
 * ブランチ名のサニタイズ
 * - スラッシュをハイフンに変換
 * - 無効な文字を削除
 */
function sanitizeBranchName(branchName: string): string {
  return branchName.replace(/\//g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

/**
 * デプロイメントURL生成
 */
function generateDeploymentUrl(workerName: string, domain: string): string {
  return `https://${workerName}.${domain}`;
}

describe('prepare-preview-deploy', () => {
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
      test('should remove invalid characters', () => {
        const template = 'app_{pr-number}_test';
        const variables = {
          prNumber: '123',
          branchName: 'main'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('app123test');
      });

      test('should preserve hyphens', () => {
        const template = 'my-app-pr-{pr-number}';
        const variables = {
          prNumber: '789',
          branchName: 'main'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('my-app-pr-789');
      });

      test('should remove dots', () => {
        const template = 'app.v{pr-number}';
        const variables = {
          prNumber: '1',
          branchName: 'main'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('appv1');
      });

      test('should remove slashes from branch names', () => {
        const template = 'deploy-{branch-name}';
        const variables = {
          branchName: 'feature/auth'
        };

        const result = processTemplate(template, variables);

        expect(result).toBe('deploy-featureauth');
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
    });
  });

  describe('sanitizeBranchName', () => {
    test('should replace slashes with hyphens', () => {
      expect(sanitizeBranchName('feature/login')).toBe('feature-login');
    });

    test('should handle multiple slashes', () => {
      expect(sanitizeBranchName('feature/ui/modal')).toBe('feature-ui-modal');
    });

    test('should remove invalid characters', () => {
      expect(sanitizeBranchName('fix_bug@123')).toBe('fixbug123');
    });

    test('should preserve alphanumeric and hyphens', () => {
      expect(sanitizeBranchName('release-v1-2-3')).toBe('release-v1-2-3');
    });

    test('should handle refs/heads/ prefix', () => {
      const ref = 'refs/heads/feature/auth';
      const branchName = ref.replace(/^refs\/heads\//, '');
      expect(sanitizeBranchName(branchName)).toBe('feature-auth');
    });
  });

  describe('generateDeploymentUrl', () => {
    test('should generate URL with workers.dev domain', () => {
      const url = generateDeploymentUrl('myapp-pr-123', 'workers.dev');
      expect(url).toBe('https://myapp-pr-123.workers.dev');
    });

    test('should generate URL with custom domain', () => {
      const url = generateDeploymentUrl('myapp-pr-456', 'preview.example.com');
      expect(url).toBe('https://myapp-pr-456.preview.example.com');
    });

    test('should generate URL with subdomain', () => {
      const url = generateDeploymentUrl('api', 'staging.mycompany.workers.dev');
      expect(url).toBe('https://api.staging.mycompany.workers.dev');
    });

    test('generated URL should be valid', () => {
      const url = generateDeploymentUrl('test-app', 'workers.dev');
      expect(() => new URL(url)).not.toThrow();
    });

    test('should handle complex worker names', () => {
      const url = generateDeploymentUrl('my-awesome-app-pr-9999', 'custom.dev');
      expect(url).toBe('https://my-awesome-app-pr-9999.custom.dev');
    });
  });

  describe('Integration scenarios', () => {
    test('PR-based preview with custom domain', () => {
      const template = 'myapp-pr-{pr-number}';
      const variables = {
        prNumber: '123',
        branchName: 'feature-test'
      };
      const domain = 'preview.example.com';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-pr-123');
      expect(url).toBe('https://myapp-pr-123.preview.example.com');
    });

    test('Branch-based deployment with workers.dev', () => {
      const template = 'myapp-{branch-name}';
      const variables = {
        branchName: sanitizeBranchName('feature/awesome-ui')
      };
      const domain = 'workers.dev';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-feature-awesome-ui');
      expect(url).toBe('https://myapp-feature-awesome-ui.workers.dev');
    });

    test('Release deployment with version', () => {
      const template = 'myapp-release-v1-2-3';
      const variables = {
        branchName: 'release/v1.2.3'
      };
      const domain = 'workers.dev';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-release-v1-2-3');
      expect(url).toBe('https://myapp-release-v1-2-3.workers.dev');
    });

    test('Fallback from PR to branch when PR number missing', () => {
      const template = 'myapp-pr-{pr-number}';
      const ref = 'refs/heads/hotfix/critical-bug';
      const branchName = sanitizeBranchName(ref.replace(/^refs\/heads\//, ''));
      const variables = { branchName };
      const domain = 'workers.dev';

      const workerName = processTemplate(template, variables);
      const url = generateDeploymentUrl(workerName, domain);

      expect(workerName).toBe('myapp-pr-hotfix-critical-bug');
      expect(url).toBe('https://myapp-pr-hotfix-critical-bug.workers.dev');
    });
  });
});
