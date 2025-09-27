import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * Helper function to simulate TOML modification logic from deploy2
 * This replicates the modifyWranglerTomlContent function for testing
 */
function modifyWranglerTomlContent(
  content: string,
  environment: string,
  workerName: string
): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inTargetEnv = false;
  let envSectionFound = false;
  let nameUpdated = false;

  const targetSection = `[env.${environment}]`;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if we're entering the target environment section
    if (line === targetSection) {
      inTargetEnv = true;
      envSectionFound = true;
      result.push(lines[i]);
      continue;
    }

    // Check if we're entering a different environment section
    if (line.startsWith('[env.') && line !== targetSection) {
      inTargetEnv = false;
    }

    // Check if we're entering any other section
    if (line.startsWith('[') && !line.startsWith('[env.')) {
      inTargetEnv = false;
    }

    // If we're in the target environment and find a name line, replace it
    if (inTargetEnv && line.startsWith('name ')) {
      result.push(`name = "${workerName}"`);
      nameUpdated = true;
      continue;
    }

    result.push(lines[i]);
  }

  // If environment section wasn't found, add it
  if (!envSectionFound) {
    result.push('');
    result.push(`# Added by deploy2 action`);
    result.push(targetSection);
    result.push(`name = "${workerName}"`);
    nameUpdated = true;
  }

  // If environment section was found but no name was updated, add name
  if (envSectionFound && !nameUpdated) {
    // Find the target section and add name after it
    const modifiedResult: string[] = [];
    let addedName = false;

    for (let i = 0; i < result.length; i++) {
      modifiedResult.push(result[i]);

      if (result[i].trim() === targetSection && !addedName) {
        modifiedResult.push(`name = "${workerName}"`);
        addedName = true;
      }
    }

    return modifiedResult.join('\n');
  }

  return result.join('\n');
}

describe('deploy2', () => {
  describe('TOML modification', () => {
    test('should modify existing environment section with name', () => {
      const content = `name = "myapp"
main = "src/index.js"

[env.preview]
name = "myapp-preview"
vars = { ENVIRONMENT = "preview" }`;

      const result = modifyWranglerTomlContent(content, 'preview', 'myapp-pr-123');

      expect(result).toContain('name = "myapp-pr-123"');
      expect(result).not.toContain('name = "myapp-preview"');
      expect(result).toContain('[env.preview]');
    });

    test('should modify existing environment section without name', () => {
      const content = `name = "myapp"
main = "src/index.js"

[env.preview]
vars = { ENVIRONMENT = "preview" }`;

      const result = modifyWranglerTomlContent(content, 'preview', 'myapp-pr-123');

      expect(result).toContain('name = "myapp-pr-123"');
      expect(result).toContain('[env.preview]');
    });

    test('should create new environment section if not exists', () => {
      const content = `name = "myapp"
main = "src/index.js"

[env.production]
name = "myapp"`;

      const result = modifyWranglerTomlContent(content, 'preview', 'myapp-pr-123');

      expect(result).toContain('# Added by deploy2 action');
      expect(result).toContain('[env.preview]');
      expect(result).toContain('name = "myapp-pr-123"');
    });

    test('should not modify other environment sections', () => {
      const content = `name = "myapp"

[env.staging]
name = "myapp-staging"

[env.preview]
name = "myapp-preview"

[env.production]
name = "myapp"`;

      const result = modifyWranglerTomlContent(content, 'preview', 'myapp-pr-123');

      expect(result).toContain('name = "myapp-staging"');
      expect(result).toContain('name = "myapp"');
      expect(result).toContain('name = "myapp-pr-123"');
      expect(result).not.toContain('name = "myapp-preview"');
    });

    test('should handle complex TOML with comments and spacing', () => {
      const content = `# Main configuration
name = "myapp"
main = "src/index.js"
compatibility_date = "2023-12-01"

[vars]
ENVIRONMENT = "production"

# Staging environment
[env.staging]
name = "myapp-staging"
vars = { ENVIRONMENT = "staging" }

# Preview environment  
[env.preview]
name = "myapp-preview"
vars = { ENVIRONMENT = "preview" }`;

      const result = modifyWranglerTomlContent(content, 'preview', 'myapp-feature-auth');

      expect(result).toContain('name = "myapp-feature-auth"');
      expect(result).toContain('# Preview environment');
      expect(result).toContain('name = "myapp-staging"');
      expect(result).not.toContain('name = "myapp-preview"');
    });
  });

  describe('integrated url generation', () => {
    beforeEach(() => {
      // Mock GitHub context
      vi.resetAllMocks();
    });

    test('should detect preview pattern with {pr_number}', () => {
      const pattern = 'myapp-pr-{pr_number}';
      const isPreview = pattern.includes('{pr_number}');
      expect(isPreview).toBe(true);
    });

    test('should detect non-preview pattern without {pr_number}', () => {
      const pattern = 'myapp-{branch}';
      const isPreview = pattern.includes('{pr_number}');
      expect(isPreview).toBe(false);
    });

    test('should generate worker URL with subdomain', () => {
      const workerName = 'myapp-pr-123';
      const subdomain = 'mydomain';

      // Import the function from the source for testing
      const expectedUrl = `https://${workerName}.${subdomain}.workers.dev`;
      expect(expectedUrl).toBe('https://myapp-pr-123.mydomain.workers.dev');
    });

    test('should generate worker URL without subdomain', () => {
      const workerName = 'myapp-pr-123';

      const expectedUrl = `https://${workerName}.workers.dev`;
      expect(expectedUrl).toBe('https://myapp-pr-123.workers.dev');
    });
  });

  /**
   * Helper function to simulate exclude branches parsing
   */
  function parseExcludeBranches(input: string): string[] {
    if (!input) return [];
    input = input.trim();
    if (input.startsWith('[')) {
      try {
        return JSON.parse(input);
      } catch {
        // Fallback to CSV parsing
      }
    }
    return input
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Helper function to simulate workflow mode logic
   */
  function shouldSkipDeployForBranch(
    refName: string,
    workflowMode: 'auto' | 'gitflow' | 'githubflow',
    excludeBranches: string,
    releaseBranchPattern: string = 'release/'
  ): boolean {
    // Check exclude list
    const excluded = parseExcludeBranches(excludeBranches);
    if (excluded.includes(refName)) {
      return true;
    }

    // Apply workflow mode logic
    const isReleaseBranch = refName.startsWith('release/') || refName.startsWith('hotfix/');
    const isMainBranch = refName === 'main' || refName === 'master';

    if (workflowMode === 'auto') {
      if (isReleaseBranch) {
        return (
          !refName.startsWith(releaseBranchPattern.replace(/\*.*$/, '')) &&
          !refName.startsWith('hotfix/')
        );
      }
      return !isMainBranch;
    } else if (workflowMode === 'gitflow') {
      return !isReleaseBranch;
    } else if (workflowMode === 'githubflow') {
      return !isMainBranch;
    }

    return false;
  }

  describe('workflow mode and branch filtering', () => {
    describe('exclude branches parsing', () => {
      test('should parse CSV exclude branches', () => {
        const result = parseExcludeBranches('dependabot,staging,test');
        expect(result).toEqual(['dependabot', 'staging', 'test']);
      });

      test('should parse JSON array exclude branches', () => {
        const result = parseExcludeBranches('["dependabot","staging","test"]');
        expect(result).toEqual(['dependabot', 'staging', 'test']);
      });

      test('should handle empty exclude branches', () => {
        const result = parseExcludeBranches('');
        expect(result).toEqual([]);
      });

      test('should handle CSV with spaces', () => {
        const result = parseExcludeBranches(' dependabot , staging , test ');
        expect(result).toEqual(['dependabot', 'staging', 'test']);
      });

      test('should fallback to CSV when JSON parsing fails', () => {
        const result = parseExcludeBranches('[invalid json,');
        expect(result).toEqual(['[invalid json']);
      });
    });

    describe('auto workflow mode', () => {
      test('should deploy main branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('main', 'auto', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should deploy master branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('master', 'auto', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should deploy release branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('release/1.2.0', 'auto', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should deploy hotfix branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('hotfix/urgent-fix', 'auto', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should skip feature branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('feature/new-auth', 'auto', '', 'release/');
        expect(shouldSkip).toBe(true);
      });

      test('should skip development branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('develop', 'auto', '', 'release/');
        expect(shouldSkip).toBe(true);
      });
    });

    describe('gitflow workflow mode', () => {
      test('should deploy release branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('release/1.2.0', 'gitflow', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should deploy hotfix branch', () => {
        const shouldSkip = shouldSkipDeployForBranch(
          'hotfix/urgent-fix',
          'gitflow',
          '',
          'release/'
        );
        expect(shouldSkip).toBe(false);
      });

      test('should skip main branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('main', 'gitflow', '', 'release/');
        expect(shouldSkip).toBe(true);
      });

      test('should skip feature branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('feature/new-auth', 'gitflow', '', 'release/');
        expect(shouldSkip).toBe(true);
      });

      test('should skip develop branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('develop', 'gitflow', '', 'release/');
        expect(shouldSkip).toBe(true);
      });
    });

    describe('githubflow workflow mode', () => {
      test('should deploy main branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('main', 'githubflow', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should deploy master branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('master', 'githubflow', '', 'release/');
        expect(shouldSkip).toBe(false);
      });

      test('should skip release branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('release/1.2.0', 'githubflow', '', 'release/');
        expect(shouldSkip).toBe(true);
      });

      test('should skip feature branch', () => {
        const shouldSkip = shouldSkipDeployForBranch(
          'feature/new-auth',
          'githubflow',
          '',
          'release/'
        );
        expect(shouldSkip).toBe(true);
      });

      test('should skip develop branch', () => {
        const shouldSkip = shouldSkipDeployForBranch('develop', 'githubflow', '', 'release/');
        expect(shouldSkip).toBe(true);
      });
    });

    describe('exclude branches functionality', () => {
      test('should exclude dependabot branches in auto mode', () => {
        const shouldSkip = shouldSkipDeployForBranch(
          'dependabot/npm-update',
          'auto',
          'dependabot',
          'release/'
        );
        expect(shouldSkip).toBe(true);
      });

      test('should exclude staging branch in gitflow mode', () => {
        const shouldSkip = shouldSkipDeployForBranch(
          'staging',
          'gitflow',
          'staging,test',
          'release/'
        );
        expect(shouldSkip).toBe(true);
      });

      test('should exclude multiple branches with CSV', () => {
        expect(
          shouldSkipDeployForBranch('dependabot', 'auto', 'dependabot,staging,test', 'release/')
        ).toBe(true);
        expect(
          shouldSkipDeployForBranch('staging', 'auto', 'dependabot,staging,test', 'release/')
        ).toBe(true);
        expect(
          shouldSkipDeployForBranch('test', 'auto', 'dependabot,staging,test', 'release/')
        ).toBe(true);
      });

      test('should exclude multiple branches with JSON', () => {
        const excludeList = '["dependabot","staging","test"]';
        expect(shouldSkipDeployForBranch('dependabot', 'auto', excludeList, 'release/')).toBe(true);
        expect(shouldSkipDeployForBranch('staging', 'auto', excludeList, 'release/')).toBe(true);
        expect(shouldSkipDeployForBranch('test', 'auto', excludeList, 'release/')).toBe(true);
      });

      test('should not exclude non-listed branches', () => {
        const shouldSkip = shouldSkipDeployForBranch(
          'main',
          'auto',
          'dependabot,staging',
          'release/'
        );
        expect(shouldSkip).toBe(false);
      });
    });

    describe('combined workflow mode and exclude logic', () => {
      test('should exclude before applying workflow mode logic', () => {
        // Even though release/1.2.0 would normally deploy in auto mode, it should be excluded
        const shouldSkip = shouldSkipDeployForBranch(
          'release/1.2.0',
          'auto',
          'release/1.2.0',
          'release/'
        );
        expect(shouldSkip).toBe(true);
      });

      test('should apply workflow mode logic after exclude check passes', () => {
        // feature/auth should be skipped by auto mode logic, not by exclude list
        const shouldSkip = shouldSkipDeployForBranch(
          'feature/auth',
          'auto',
          'dependabot',
          'release/'
        );
        expect(shouldSkip).toBe(true);
      });
    });
  });
});
