import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

/**
 * GitHub Actions YAML validation tests
 */

interface ActionDefinition {
  name: string;
  description: string;
  inputs?: Record<string, ActionInput>;
  outputs?: Record<string, ActionOutput>;
  runs: ActionRuns;
}

interface ActionInput {
  description: string;
  required?: boolean;
  default?: string;
  type?: string;
}

interface ActionOutput {
  description: string;
  value: string;
}

interface ActionRuns {
  using: string;
  steps?: ActionStep[];
}

interface ActionStep {
  name?: string;
  shell?: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
  if?: string;
  id?: string;
}

/**
 * アクションファイルを読み込む
 */
function loadAction(actionName: string): ActionDefinition {
  const actionPath = join(process.cwd(), '.github', 'actions', actionName, 'action.yml');

  if (!existsSync(actionPath)) {
    throw new Error(`Action file not found: ${actionPath}`);
  }

  const content = readFileSync(actionPath, 'utf-8');
  return parse(content) as ActionDefinition;
}

/**
 * 利用可能なアクションを取得
 */
function getAvailableActions(): string[] {
  const actionsDir = join(process.cwd(), '.github', 'actions');
  if (!existsSync(actionsDir)) {
    return [];
  }

  const { readdirSync } = require('node:fs');
  return readdirSync(actionsDir, { withFileTypes: true })
    .filter((dirent: any) => dirent.isDirectory())
    .map((dirent: any) => dirent.name);
}

describe('GitHub Actions Validation', () => {
  const actions = getAvailableActions();

  describe('Action File Structure', () => {
    test.each(actions)('should have valid YAML structure: %s', (actionName) => {
      expect(() => loadAction(actionName)).not.toThrow();
    });

    test.each(actions)('should have required fields: %s', (actionName) => {
      const action = loadAction(actionName);

      expect(action.name).toBeDefined();
      expect(action.name).toBeTruthy();
      expect(action.description).toBeDefined();
      expect(action.description).toBeTruthy();
      expect(action.runs).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    test.each(actions)('should have proper input descriptions: %s', (actionName) => {
      const action = loadAction(actionName);

      if (action.inputs) {
        Object.entries(action.inputs).forEach(([_inputName, input]) => {
          expect(input.description).toBeDefined();
          expect(input.description).toBeTruthy();
          expect(input.description.length).toBeGreaterThan(10); // 適切な説明長
        });
      }
    });
  });

  describe('Runs Configuration', () => {
    test.each(actions)('should use composite runs: %s', (actionName) => {
      const action = loadAction(actionName);

      expect(action.runs.using).toBe('composite');
      expect(action.runs.steps).toBeDefined();
      expect(Array.isArray(action.runs.steps)).toBe(true);
      expect(action.runs.steps?.length).toBeGreaterThan(0);
    });

    test.each(actions)('should have valid step structure: %s', (actionName) => {
      const action = loadAction(actionName);

      action.runs.steps?.forEach((step, _index) => {
        // ステップは名前を持つべき
        expect(step.name).toBeDefined();
        expect(step.name).toBeTruthy();

        // ステップはrunかusesのいずれかを持つべき
        const hasRun = !!step.run;
        const hasUses = !!step.uses;
        expect(hasRun || hasUses).toBe(true);

        // runを使う場合はshellも指定すべき
        if (hasRun) {
          expect(step.shell).toBeDefined();
        }
      });
    });
  });

  describe('Security Validation', () => {
    test.each(actions)('should use pinned action versions: %s', (actionName) => {
      const action = loadAction(actionName);

      action.runs.steps?.forEach((step) => {
        if (step.uses?.includes('@')) {
          // GitHub Actions should be pinned to specific commit SHAs or versions
          const [actionRef, version] = step.uses.split('@');

          if (actionRef.startsWith('actions/') || actionRef.includes('/')) {
            // 外部アクションはバージョン指定が必要
            expect(version).toBeDefined();
            expect(version).toBeTruthy();
          }
        }
      });
    });

    test.each(actions)('should not expose secrets in run commands: %s', (actionName) => {
      const action = loadAction(actionName);

      action.runs.steps?.forEach((step) => {
        if (step.run) {
          // 実行コマンドにトークンやシークレットが直接埋め込まれていないことを確認
          expect(step.run).not.toMatch(/token.*=.*[a-zA-Z0-9]{20,}/);
          expect(step.run).not.toMatch(/secret.*=.*[a-zA-Z0-9]{20,}/);
          expect(step.run).not.toMatch(/key.*=.*[a-zA-Z0-9]{20,}/);
        }
      });
    });
  });

  describe('Best Practices', () => {
    test.each(actions)('should have meaningful step names: %s', (actionName) => {
      const action = loadAction(actionName);

      action.runs.steps?.forEach((step) => {
        expect(step.name?.length).toBeGreaterThan(5); // 意味のある名前
        expect(step.name).not.toMatch(/^step\s*\d*$/i); // 単純な "Step N" は避ける
      });
    });

    test('actions should follow consistent naming', () => {
      actions.forEach((actionName) => {
        // アクション名は小文字とハイフンのみ
        expect(actionName).toMatch(/^[a-z-]+$/);

        const action = loadAction(actionName);

        // アクション名は適切な形式
        expect(action.name).toMatch(/^[A-Z][a-zA-Z\s]+$/);
      });
    });

    test('input and output names should be consistent', () => {
      actions.forEach((actionName) => {
        const action = loadAction(actionName);

        if (action.inputs) {
          Object.keys(action.inputs).forEach((inputName) => {
            // kebab-case for inputs
            expect(inputName).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/);
          });
        }

        if (action.outputs) {
          Object.keys(action.outputs).forEach((outputName) => {
            // kebab-case for outputs
            expect(outputName).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/);
          });
        }
      });
    });
  });
});
