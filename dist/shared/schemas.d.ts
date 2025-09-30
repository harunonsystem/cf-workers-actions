import { z } from 'zod';
export declare const CommentInputSchema: z.ZodObject<{
    deploymentUrl: z.ZodString;
    deploymentStatus: z.ZodDefault<z.ZodEnum<{
        success: "success";
        failure: "failure";
        pending: "pending";
    }>>;
    workerName: z.ZodOptional<z.ZodString>;
    githubToken: z.ZodString;
    customMessage: z.ZodOptional<z.ZodString>;
    commentTemplate: z.ZodOptional<z.ZodString>;
    updateExisting: z.ZodDefault<z.ZodBoolean>;
    commentTag: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const CommentOutputSchema: z.ZodObject<{
    commentId: z.ZodOptional<z.ZodString>;
    commentUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CommentInputs = z.infer<typeof CommentInputSchema>;
export type CommentOutputs = z.infer<typeof CommentOutputSchema>;
export declare const DeployInputSchema: z.ZodObject<{
    environment: z.ZodDefault<z.ZodString>;
    workerName: z.ZodOptional<z.ZodString>;
    workerNamePattern: z.ZodOptional<z.ZodString>;
    subdomain: z.ZodOptional<z.ZodString>;
    forcePreview: z.ZodDefault<z.ZodBoolean>;
    cloudflareApiToken: z.ZodString;
    cloudflareAccountId: z.ZodOptional<z.ZodString>;
    secrets: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    deployCommand: z.ZodDefault<z.ZodString>;
    wranglerFile: z.ZodDefault<z.ZodString>;
    workflowMode: z.ZodDefault<z.ZodEnum<{
        auto: "auto";
        gitflow: "gitflow";
        githubflow: "githubflow";
    }>>;
    excludeBranches: z.ZodDefault<z.ZodString>;
    releaseBranchPattern: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const DeployOutputSchema: z.ZodObject<{
    workerUrl: z.ZodOptional<z.ZodString>;
    workerName: z.ZodOptional<z.ZodString>;
    success: z.ZodOptional<z.ZodBoolean>;
    errorMessage: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DeployInputs = z.infer<typeof DeployInputSchema>;
export type DeployOutputs = z.infer<typeof DeployOutputSchema>;
export declare const CleanupInputSchema: z.ZodObject<{
    workerPattern: z.ZodOptional<z.ZodString>;
    workerNames: z.ZodOptional<z.ZodArray<z.ZodString>>;
    cloudflareApiToken: z.ZodString;
    cloudflareAccountId: z.ZodString;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    confirmDeletion: z.ZodDefault<z.ZodString>;
    exclude: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const CleanupOutputSchema: z.ZodObject<{
    deletedWorkers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    deletedCount: z.ZodOptional<z.ZodNumber>;
    skippedWorkers: z.ZodOptional<z.ZodArray<z.ZodString>>;
    dryRunResults: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type CleanupInputs = z.infer<typeof CleanupInputSchema>;
export type CleanupOutputs = z.infer<typeof CleanupOutputSchema>;
