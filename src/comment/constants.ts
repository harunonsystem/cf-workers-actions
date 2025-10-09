import { CommentInputs } from '../shared/schemas';

export type CommentDeploymentStatus = CommentInputs['deploymentStatus'];

export const COMMENT_DEFAULT_TAG = 'cloudflare-workers-deployment';

export const COMMENT_STATUS_METADATA: Record<
  CommentDeploymentStatus,
  { icon: string; label: string; summary: string }
> = {
  success: { icon: '✅', label: 'Success', summary: '✅ Success' },
  failure: { icon: '❌', label: 'Failed', summary: '❌ Failed' },
  pending: { icon: '⏳', label: 'Pending', summary: '⏳ Pending' }
};
