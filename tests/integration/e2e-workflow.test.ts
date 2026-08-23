import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';

interface WorkflowStep {
  name?: string;
  with?: Record<string, string>;
}

interface WorkflowJob {
  steps: WorkflowStep[];
}

interface E2eWorkflow {
  jobs: Record<string, WorkflowJob>;
}

const workflowPath = join(process.cwd(), '.github', 'workflows', 'e2e.yml');
const workflow = parse(readFileSync(workflowPath, 'utf8')) as E2eWorkflow;
const expectedWorkerName =
  'cf-actions-e2e-pr-$' + '{{ github.event.pull_request.number || github.run_id }}';

describe('E2E workflow', () => {
  test('uses the pull request number for every preview Worker lifecycle step', () => {
    const workerNameByStep = Object.values(workflow.jobs)
      .flatMap((job) => job.steps)
      .filter((step) => step.name && step.with?.['worker-name'])
      .reduce<Record<string, string>>((workerNames, step) => {
        workerNames[step.name as string] = step.with?.['worker-name'] as string;
        return workerNames;
      }, {});

    expect(workerNameByStep).toEqual({
      'Prepare Preview Deploy': expectedWorkerName,
      'Preview Deploy': expectedWorkerName,
      'Prepare worker name for cleanup': expectedWorkerName
    });
  });
});
