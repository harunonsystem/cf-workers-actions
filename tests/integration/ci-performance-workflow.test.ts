import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

interface WorkflowStep {
  if?: string;
  name?: string;
  run?: string;
  uses?: string;
  with?: Record<string, string>;
}

interface ActionDefinition {
  inputs: Record<string, { default?: string; required?: boolean }>;
  runs: { steps: WorkflowStep[] };
}

interface CiWorkflow {
  jobs: Record<string, { steps: WorkflowStep[] }>;
}

const repoRoot = process.cwd();
const setupAction = parse(
  readFileSync(join(repoRoot, '.github', 'actions', 'setup', 'action.yml'), 'utf8')
) as ActionDefinition;
const ciChecksAction = parse(
  readFileSync(join(repoRoot, '.github', 'actions', 'ci-checks', 'action.yml'), 'utf8')
) as ActionDefinition;
const ciWorkflow = parse(
  readFileSync(join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8')
) as CiWorkflow;
const expectedQualityExpression = '$' + "{{ matrix.node-version == '24.x' }}";

describe('CI performance workflow', () => {
  test('does not rebuild during install and runs quality checks only on Node 24', () => {
    const installStep = setupAction.runs.steps.find((step) => step.name === 'Install dependencies');
    const ciChecksStep = ciWorkflow.jobs.test.steps.find(
      (step) => step.uses === './.github/actions/ci-checks'
    );
    const qualityStepNames = ['Build TypeScript', 'Run type checking', 'Run linter (Biome)'];
    const qualitySteps = ciChecksAction.runs.steps.filter((step) =>
      qualityStepNames.includes(step.name ?? '')
    );

    expect(installStep?.run).toBe('pnpm install --frozen-lockfile --ignore-scripts');
    expect(ciChecksAction.inputs['run-quality']).toMatchObject({
      default: 'true',
      required: false
    });
    expect(ciChecksStep?.with?.['run-quality']).toBe(expectedQualityExpression);
    expect(qualitySteps).toHaveLength(3);
    expect(qualitySteps.every((step) => step.if === "inputs.run-quality == 'true'")).toBe(true);
  });
});
