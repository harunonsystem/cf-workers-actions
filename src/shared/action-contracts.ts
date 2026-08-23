export interface ActionInputContract {
  description: string;
  required: boolean;
  default?: string;
}

export interface ActionOutputContract {
  description: string;
}

export interface ActionContract {
  name: string;
  description: string;
  author: string;
  branding: {
    icon: string;
    color: string;
  };
  inputs: Record<string, ActionInputContract>;
  outputs: Record<string, ActionOutputContract>;
  runs: {
    using: 'node24';
    main: string;
  };
}

const GITHUB_TOKEN_DEFAULT = `\${{ github.token }}`;

export const ACTION_NAMES = [
  'cleanup',
  'pr-comment',
  'prepare-preview-deploy',
  'preview-deploy'
] as const;

export type ActionName = (typeof ACTION_NAMES)[number];

export const actionContracts = {
  cleanup: {
    name: 'Cloudflare Workers Cleanup',
    description: 'Clean up and delete Cloudflare Workers based on patterns',
    author: 'harunonsystem',
    branding: {
      icon: 'trash-2',
      color: 'red'
    },
    inputs: {
      'worker-prefix': {
        description: 'Worker prefix (e.g., "myapp-pr-" or "example-")',
        required: false
      },
      'worker-numbers': {
        description:
          'Numbers to delete (e.g., "1,2,3"). Used with worker-prefix to generate full worker names',
        required: false
      },
      'worker-names': {
        description: 'Full names (optional, overrides prefix+numbers) (comma-separated)',
        required: false
      },
      'cloudflare-api-token': {
        description: 'Cloudflare API Token',
        required: true
      },
      'cloudflare-account-id': {
        description: 'Cloudflare Account ID',
        required: true
      },
      'dry-run': {
        description: 'List workers to delete without actually deleting them',
        required: false,
        default: 'true'
      },
      exclude: {
        description:
          'Comma-separated list of worker names or patterns to exclude from deletion. Supports exact names (e.g., "myapp-dev,myapp-stg") and glob patterns (e.g., "*-develop,*-staging,*-production"). Excluded workers will never be deleted when they match a requested worker name.',
        required: false,
        default: ''
      }
    },
    outputs: {
      'deleted-workers': {
        description: 'List of deleted worker names (JSON array)'
      },
      'deleted-count': {
        description: 'Number of workers deleted'
      },
      'skipped-workers': {
        description: 'List of workers that were skipped (JSON array)'
      },
      'dry-run-results': {
        description: 'Workers that would be deleted in dry run mode (JSON array)'
      }
    },
    runs: {
      using: 'node24',
      main: '../dist/cleanup/index.js'
    }
  },
  'pr-comment': {
    name: 'PR Comment',
    description: 'Create or update PR comment with Cloudflare Workers deployment status',
    author: 'harunonsystem',
    branding: {
      icon: 'message-square',
      color: 'green'
    },
    inputs: {
      'deployment-url': {
        description: 'Deployment URL to display in the comment',
        required: true
      },
      'deployment-success': {
        description: 'Whether the deployment was successful (true/false)',
        required: true
      },
      'deployment-name': {
        description: 'Name of the deployed worker',
        required: true
      },
      'github-token': {
        description: 'GitHub token for commenting on PRs',
        required: false,
        default: GITHUB_TOKEN_DEFAULT
      }
    },
    outputs: {
      'comment-id': {
        description: 'ID of the created or updated comment'
      }
    },
    runs: {
      using: 'node24',
      main: '../dist/pr-comment/index.js'
    }
  },
  'prepare-preview-deploy': {
    name: 'Prepare Preview Deploy',
    description:
      'Prepare Cloudflare Workers deployment by generating worker names from templates and updating wrangler.toml configuration',
    author: 'harunonsystem',
    branding: {
      icon: 'git-pull-request',
      color: 'blue'
    },
    inputs: {
      'worker-name': {
        description:
          'Worker name template. Supports: {branch-name}, {commit-hash}. Example: myapp-{branch-name}',
        required: true
      },
      environment: {
        description: 'Deployment environment for wrangler.toml [env.xxx] section',
        required: true
      },
      domain: {
        description:
          'Custom domain for deployment URL (e.g., "username.workers.dev" or "example.com")',
        required: true
      },
      'wrangler-toml-path': {
        description: 'Path to wrangler.toml file',
        required: false,
        default: './wrangler.toml'
      }
    },
    outputs: {
      'deployment-url': {
        description: 'Generated deployment URL'
      },
      'deployment-name': {
        description: 'Generated worker name'
      }
    },
    runs: {
      using: 'node24',
      main: '../dist/prepare-preview-deploy/index.js'
    }
  },
  'preview-deploy': {
    name: 'Deploy Preview',
    description: 'Deploy Cloudflare Workers with automatic PR commenting',
    author: 'harunonsystem',
    branding: {
      icon: 'upload-cloud',
      color: 'purple'
    },
    inputs: {
      'cloudflare-api-token': {
        description: 'Cloudflare API Token',
        required: true
      },
      'cloudflare-account-id': {
        description: 'Cloudflare Account ID',
        required: true
      },
      'worker-name': {
        description:
          'Worker name template. Supports: {branch-name}, {commit-hash}. Example: myapp-{branch-name}',
        required: true
      },
      environment: {
        description: 'Environment to use in wrangler.toml (e.g., "preview")',
        required: false,
        default: 'preview'
      },
      domain: {
        description:
          'Custom domain for deployment URL (e.g., "username.workers.dev" or "example.com")',
        required: true
      },
      'wrangler-toml-path': {
        description: 'Path to wrangler.toml file',
        required: false,
        default: './wrangler.toml'
      },
      'github-token': {
        description: 'GitHub token for commenting on PRs',
        required: false,
        default: GITHUB_TOKEN_DEFAULT
      }
    },
    outputs: {
      'deployment-url': {
        description: 'Generated deployment URL'
      },
      'deployment-name': {
        description: 'Generated worker name'
      },
      'deployment-success': {
        description: 'Whether the deployment was successful'
      }
    },
    runs: {
      using: 'node24',
      main: '../dist/preview-deploy/index.js'
    }
  }
} as const satisfies Record<ActionName, ActionContract>;
