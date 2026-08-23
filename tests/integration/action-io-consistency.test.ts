import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import * as yaml from 'yaml';
import type { z } from 'zod';

import {
  CleanupInputConfig,
  CleanupInputSchema,
  CleanupOutputSchema
} from '../../src/cleanup/schemas';
import { PrCommentInputConfig, PrCommentInputSchema } from '../../src/pr-comment/schemas';
import {
  PreparePreviewDeployInputConfig,
  PreparePreviewDeployInputSchema,
  PreparePreviewDeployOutputSchema
} from '../../src/prepare-preview-deploy/schemas';
import {
  DeployPreviewInputConfig,
  DeployPreviewInputSchema,
  DeployPreviewOutputSchema
} from '../../src/preview-deploy/schemas';
import type { InputConfig } from '../../src/shared/validation';

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

/**
 * Convert camelCase to dash-case
 */
function camelToDash(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Get schema keys and convert to dash-case for comparison with action.yml
 */
function getSchemaInputKeys(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape).map(camelToDash);
}

function getSchemaOutputKeys(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape).map(camelToDash);
}

/**
 * Get InputConfig keys (already dash-case)
 */
function getConfigKeys(config: InputConfig): string[] {
  return Object.keys(config);
}

describe('Action I/O Consistency Tests', () => {
  describe('prepare-preview-deploy', () => {
    const actionDef = loadActionDefinition('prepare-preview-deploy');
    const schemaInputKeys = getSchemaInputKeys(PreparePreviewDeployInputSchema);
    const schemaOutputKeys = getSchemaOutputKeys(PreparePreviewDeployOutputSchema);
    const configKeys = getConfigKeys(PreparePreviewDeployInputConfig);

    test('action.yml inputs should match InputConfig keys', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(configKeys.sort());
    });

    test('action.yml inputs should match Schema keys (dash-case)', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(schemaInputKeys.sort());
    });

    test('action.yml outputs should match OutputSchema keys (dash-case)', () => {
      const actionOutputs = Object.keys(actionDef.outputs).sort();
      expect(actionOutputs).toEqual(schemaOutputKeys.sort());
    });

    test('should not have deprecated pr-number input', () => {
      expect(actionDef.inputs['pr-number']).toBeUndefined();
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
    const schemaInputKeys = getSchemaInputKeys(DeployPreviewInputSchema);
    const schemaOutputKeys = getSchemaOutputKeys(DeployPreviewOutputSchema);
    const configKeys = getConfigKeys(DeployPreviewInputConfig);

    test('action.yml inputs should match InputConfig keys', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(configKeys.sort());
    });

    test('action.yml inputs should match Schema keys (dash-case)', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(schemaInputKeys.sort());
    });

    test('action.yml outputs should match OutputSchema keys (dash-case)', () => {
      const actionOutputs = Object.keys(actionDef.outputs).sort();
      expect(actionOutputs).toEqual(schemaOutputKeys.sort());
    });

    test('should use environment instead of deprecated default-env', () => {
      expect(actionDef.inputs['default-env']).toBeUndefined();
      expect(actionDef.inputs.environment).toBeDefined();
      expect(actionDef.inputs.environment.default).toBe('preview');
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
    const schemaInputKeys = getSchemaInputKeys(PrCommentInputSchema);
    const configKeys = getConfigKeys(PrCommentInputConfig);

    test('action.yml inputs should match InputConfig keys', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(configKeys.sort());
    });

    test('action.yml inputs should match Schema keys (dash-case)', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(schemaInputKeys.sort());
    });

    test('action.yml outputs should be defined', () => {
      expect(actionDef.outputs).toBeDefined();
      expect(Object.keys(actionDef.outputs).length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    const actionDef = loadActionDefinition('cleanup');
    const schemaInputKeys = getSchemaInputKeys(CleanupInputSchema);
    const schemaOutputKeys = getSchemaOutputKeys(CleanupOutputSchema);
    const configKeys = getConfigKeys(CleanupInputConfig);

    test('action.yml inputs should match InputConfig keys', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(configKeys.sort());
    });

    test('action.yml inputs should match Schema keys (dash-case)', () => {
      const actionInputs = Object.keys(actionDef.inputs).sort();
      expect(actionInputs).toEqual(schemaInputKeys.sort());
    });

    test('action.yml outputs should match OutputSchema keys (dash-case)', () => {
      const actionOutputs = Object.keys(actionDef.outputs).sort();
      expect(actionOutputs).toEqual(schemaOutputKeys.sort());
    });

    test('required inputs should be marked as required', () => {
      expect(actionDef.inputs['cloudflare-api-token'].required).toBe(true);
      expect(actionDef.inputs['cloudflare-account-id'].required).toBe(true);
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
