import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import * as yaml from 'yaml';

/**
 * Integration tests for action I/O consistency
 * Validates that action.yml definitions match schema definitions
 */

const REPO_ROOT = path.resolve(__dirname, '../..');

interface ActionInput {
  description: string;
  required: boolean;
  default?: string;
}

interface ActionOutput {
  description: string;
}

interface ActionDefinition {
  name: string;
  inputs: Record<string, ActionInput>;
  outputs: Record<string, ActionOutput>;
}

/**
 * Load action.yml and parse it
 */
function loadActionDefinition(actionPath: string): ActionDefinition {
  const actionYmlPath = path.join(REPO_ROOT, actionPath, 'action.yml');
  const content = fs.readFileSync(actionYmlPath, 'utf8');
  const parsed = yaml.parse(content);

  return {
    name: parsed.name,
    inputs: parsed.inputs || {},
    outputs: parsed.outputs || {}
  };
}

describe('Action I/O Consistency Tests', () => {
  describe('prepare-preview-deploy', () => {
    const actionDef = loadActionDefinition('prepare-preview-deploy');

    test('action.yml inputs should match expected schema', () => {
      // Expected inputs based on current implementation
      const expectedInputs = ['worker-name', 'environment', 'domain', 'wrangler-toml-path'];
      const actualInputs = Object.keys(actionDef.inputs);

      expect(actualInputs.sort()).toEqual(expectedInputs.sort());
    });

    test('should not have deprecated pr-number input', () => {
      expect(actionDef.inputs['pr-number']).toBeUndefined();
    });

    test('action.yml outputs should be defined', () => {
      const expectedOutputs = ['deployment-name', 'deployment-url'];
      const actualOutputs = Object.keys(actionDef.outputs);

      expect(actualOutputs.sort()).toEqual(expectedOutputs.sort());
    });

    test('should not have deprecated environment output', () => {
      expect(actionDef.outputs.environment).toBeUndefined();
    });

    test('required inputs should be marked as required', () => {
      expect(actionDef.inputs['worker-name'].required).toBe(true);
      expect(actionDef.inputs.environment.required).toBe(true);
      expect(actionDef.inputs.domain.required).toBe(true);
    });

    test('optional inputs should have defaults or be optional', () => {
      expect(actionDef.inputs['wrangler-toml-path'].required).toBe(false);
      expect(actionDef.inputs['wrangler-toml-path'].default).toBe('./wrangler.toml');
    });
  });

  describe('preview-deploy', () => {
    const actionDef = loadActionDefinition('preview-deploy');

    test('action.yml inputs should match expected schema', () => {
      const expectedInputs = [
        'cloudflare-api-token',
        'cloudflare-account-id',
        'worker-name',
        'environment',
        'domain',
        'wrangler-toml-path'
      ];
      const actualInputs = Object.keys(actionDef.inputs);

      expect(actualInputs.sort()).toEqual(expectedInputs.sort());
    });

    test('should use environment instead of deprecated default-env', () => {
      expect(actionDef.inputs['default-env']).toBeUndefined();
      expect(actionDef.inputs.environment).toBeDefined();
      expect(actionDef.inputs.environment.default).toBe('preview');
    });

    test('action.yml outputs should be defined', () => {
      const expectedOutputs = ['deployment-url', 'deployment-name', 'deployment-success'];
      const actualOutputs = Object.keys(actionDef.outputs);

      expect(actualOutputs.sort()).toEqual(expectedOutputs.sort());
    });

    test('required inputs should be marked as required', () => {
      expect(actionDef.inputs['cloudflare-api-token'].required).toBe(true);
      expect(actionDef.inputs['cloudflare-account-id'].required).toBe(true);
      expect(actionDef.inputs['worker-name'].required).toBe(true);
      expect(actionDef.inputs.domain.required).toBe(true);
    });
  });

  describe('pr-comment', () => {
    const actionDef = loadActionDefinition('pr-comment');

    test('action.yml inputs should be defined', () => {
      const requiredInputs = ['deployment-url', 'deployment-success'];

      for (const input of requiredInputs) {
        expect(actionDef.inputs[input]).toBeDefined();
      }
    });

    test('action.yml outputs should be defined', () => {
      expect(actionDef.outputs).toBeDefined();
      expect(Object.keys(actionDef.outputs).length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    const actionDef = loadActionDefinition('cleanup');

    test('action.yml inputs should be defined', () => {
      const requiredInputs = ['cloudflare-api-token', 'cloudflare-account-id'];

      for (const input of requiredInputs) {
        expect(actionDef.inputs[input]).toBeDefined();
        expect(actionDef.inputs[input].required).toBe(true);
      }
    });

    test('action.yml outputs should be defined', () => {
      expect(actionDef.outputs).toBeDefined();
    });
  });

  describe('Cross-action consistency', () => {
    test('all actions with cloudflare credentials should use same input names', () => {
      const actionsWithCreds = ['preview-deploy', 'cleanup'];
      const expectedCredInputs = ['cloudflare-api-token', 'cloudflare-account-id'];

      for (const actionName of actionsWithCreds) {
        const actionDef = loadActionDefinition(actionName);

        for (const credInput of expectedCredInputs) {
          expect(actionDef.inputs[credInput]).toBeDefined();
          expect(actionDef.inputs[credInput].required).toBe(true);
        }
      }
    });

    test('all actions should have descriptions for inputs and outputs', () => {
      const actions = ['prepare-preview-deploy', 'preview-deploy', 'pr-comment', 'cleanup'];

      for (const actionName of actions) {
        const actionDef = loadActionDefinition(actionName);

        // Check all inputs have descriptions
        for (const [_inputName, inputDef] of Object.entries(actionDef.inputs)) {
          expect(inputDef.description).toBeDefined();
          expect(inputDef.description.length).toBeGreaterThan(0);
        }

        // Check all outputs have descriptions
        for (const [_outputName, outputDef] of Object.entries(actionDef.outputs)) {
          expect(outputDef.description).toBeDefined();
          expect(outputDef.description.length).toBeGreaterThan(0);
        }
      }
    });

    test('environment/default-env naming should be consistent', () => {
      const prepareAction = loadActionDefinition('prepare-preview-deploy');
      const deployAction = loadActionDefinition('preview-deploy');

      // Both should use 'environment', not 'default-env'
      expect(prepareAction.inputs.environment).toBeDefined();
      expect(prepareAction.inputs['default-env']).toBeUndefined();

      expect(deployAction.inputs.environment).toBeDefined();
      expect(deployAction.inputs['default-env']).toBeUndefined();
    });
  });
});
