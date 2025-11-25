// Cloudflare API Types - shared across actions
export interface CloudflareApiResponse<T = any> {
  success: boolean;
  result?: T;
  errors?: Array<{
    code: number;
    message: string;
  }>;
}

export interface CloudflareWorker {
  id: string;
  created_on: string;
  modified_on: string;
  usage_model: string;
  environment: string;
}
