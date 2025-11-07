import { WranglerDeployConfig, WranglerExecResult, WranglerDeployResult } from '../types';
/**
 * Wrangler CLI wrapper for deployment operations
 */
export declare class WranglerClient {
  private readonly apiToken;
  private readonly accountId;
  private readonly env;
  constructor(apiToken: string, accountId: string);
  /**
   * Execute wrangler command
   */
  execWrangler(
    args: string[],
    options?: {
      cwd?: string;
      input?: Buffer;
    }
  ): Promise<WranglerExecResult>;
  /**
   * Deploy worker using wrangler
   */
  deployWorker(config: WranglerDeployConfig): Promise<WranglerDeployResult>;
  /**
   * Set worker secret
   */
  setSecret(key: string, value: string, environment?: string): Promise<void>;
  /**
   * Check if wrangler is available
   */
  checkWranglerAvailable(): Promise<boolean>;
}
