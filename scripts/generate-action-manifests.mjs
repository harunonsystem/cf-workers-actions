import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';

import { ACTION_NAMES, actionContracts } from '../src/shared/action-contracts.ts';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

for (const actionName of ACTION_NAMES) {
  const actionPath = join(repositoryRoot, actionName, 'action.yml');
  const manifest = actionContracts[actionName];

  writeFileSync(actionPath, `---\n${stringify(manifest)}`);
}
