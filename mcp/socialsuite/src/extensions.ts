import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { readFile, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute } from 'node:path';
import { callAgentApi, textResult } from './gateway.js';

const id = z.string().uuid();
const attachment = z.object({
  id: z.string().min(1), name: z.string().min(1).max(255),
  storagePath: z.string().min(1), mimeType: z.string().optional(),
  size: z.number().int().positive().max(10 * 1024 * 1024).optional(),
});

export function registerExtensions(server: McpServer) {
  const tool = (action: string, description: string, schema: Record<string, z.ZodType>, readOnly = false) =>
    server.registerTool(`socialsuite_${action}`, {
      description, inputSchema: schema,
      annotations: { readOnlyHint: readOnly },
    }, async (input) => textResult(await callAgentApi(action, input)));

  tool('list_studio_library', 'Read Image Studio assets, collections, projects, guides, recent jobs and pagination. Signed image URLs expire after one hour.', {
    before: z.string().optional(), campaignId: id.optional(),
  }, true);
  tool('get_studio_job', 'Read one Studio job and its output assets by ID, including older jobs. used_credits !== null means settled; inspect error and assets for partial success.', { jobId: id }, true);
  tool('start_studio_job', 'Start Image Studio generation, background removal, upscaling, expansion, image-to-prompt or prompt enhancement. Spends credits. Reuse the same requestId and settings after an uncertain response to avoid duplicate charges.', {
    requestId: id,
    tool: z.enum(['generate', 'remove', 'upscale', 'expand', 'prompt', 'enhance']),
    settings: z.object({
      model: z.string().min(1).optional().describe('Generation model ID from get_agent_catalog studioModels; supports GPT Image 2, 2.5 Flare and 2.5 Sunburst.'),
      prompt: z.string().max(5000).optional(), negativePrompt: z.string().max(1000).optional(),
      ratio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4', '4:5']).optional().describe('Generation supports 3:4, not 4:5. 4:5 is available for expansion.'),
      format: z.enum(['png', 'jpeg', 'webp']).optional(), count: z.number().int().min(1).max(3).optional(),
      sourcePath: z.string().optional(), referencePaths: z.array(z.string()).max(5).optional(),
      guideId: id.optional(), scale: z.union([z.literal(2), z.literal(4)]).optional(), faceEnhance: z.boolean().optional(),
    }),
  });
  tool('prepare_studio_upload', 'Reserve a signed upload for a PNG/JPEG/WebP image. Upload bytes before passing the returned path as sourcePath or referencePaths. Prefer upload_studio_image for a local file.', {
    mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']), size: z.number().int().positive().max(10 * 1024 * 1024),
  });
  tool('create_studio_collection', 'Create an Image Studio collection. The name Likes is reserved.', { name: z.string().trim().min(1).max(60) });
  tool('delete_studio_collection', 'Delete a Studio collection using the app collection workflow.', { collectionId: id });
  tool('favorite_studio_asset', 'Set the current user’s favorite state for a Studio image.', { assetId: id, favorite: z.boolean() });
  tool('delete_studio_asset', 'Delete a Studio image and its stored output file.', { assetId: id });
  tool('organize_studio_asset', 'Move a Studio image into a collection OR a project/folder, optionally saving a campaign draft. Campaign placement creates a draft and returns contentId; it does not publish.', {
    assetId: id, collectionId: id.optional(), projectId: id.optional(), folderId: id.optional(), campaignId: id.optional(),
  });
  tool('update_team_member_role', 'Admin only: change another member’s role. memberId is the membership ID from list_team, not the user ID. Self changes are blocked.', {
    memberId: id, role: z.enum(['admin', 'editor', 'viewer']),
  });
  tool('remove_team_member', 'Admin only: remove another member from the workspace. Self removal is blocked.', { memberId: id });
  tool('list_task_attachments', 'Read task references with temporary signed URLs and updatedAt for concurrency-safe edits.', { taskId: id }, true);
  tool('prepare_task_attachment_upload', 'Prepare a signed upload for a task reference (max 10 MB). After uploading, append the returned attachment with set_task_attachments. Prefer upload_task_attachment for local files.', {
    taskId: id, name: z.string().min(1).max(255), mimeType: z.string().optional(), size: z.number().int().positive().max(10 * 1024 * 1024),
  });
  tool('set_task_attachments', 'Replace task reference metadata (max 12), preserving references the user did not ask to remove. Use updatedAt from list_task_attachments. Removing a reference does not delete its stored file.', {
    taskId: id, expectedUpdatedAt: z.string().min(1), attachments: z.array(attachment).max(12),
  });

  for (const studio of [true, false]) {
    server.registerTool(studio ? 'socialsuite_upload_studio_image' : 'socialsuite_upload_task_attachment', {
      description: studio
        ? 'Upload a local PNG/JPEG/WebP (max 10 MB) to private Studio storage; returns path for generation/editing. Does not start a job.'
        : 'Upload a local task reference (max 10 MB). Returns attachment metadata; call set_task_attachments to attach it to the task.',
      inputSchema: studio
        ? { filePath: z.string().min(1) }
        : { filePath: z.string().min(1), taskId: id },
    }, async (input: { filePath: string; taskId?: string }) => {
      const filePath = String(input.filePath);
      if (!isAbsolute(filePath)) throw new Error('filePath must be absolute on the MCP server machine.');
      const info = await stat(filePath);
      if (!info.isFile() || info.size <= 0 || info.size > 10 * 1024 * 1024) throw new Error('Choose a nonempty file under 10 MB.');
      const mimeType = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' } as Record<string, string>)[extname(filePath).toLowerCase()];
      if (studio && !mimeType) throw new Error('Choose a PNG, JPG, or WebP image.');
      const bytes = await readFile(filePath);
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('File size changed; choose a file under 10 MB.');
      const prepared = await callAgentApi<{ signedUrl: string; path: string; attachment?: unknown }>(
        studio ? 'prepare_studio_upload' : 'prepare_task_attachment_upload',
        { size: bytes.length, mimeType: mimeType || 'application/octet-stream', ...(studio ? {} : { taskId: input.taskId, name: basename(filePath) }) },
      );
      if (!prepared.signedUrl) throw new Error('Agent API must be updated to support signed uploads.');
      const response = await fetch(prepared.signedUrl, {
        method: 'PUT', headers: { 'Content-Type': mimeType || 'application/octet-stream', 'x-upsert': 'false' }, body: bytes,
      });
      if (!response.ok) throw new Error(`Storage upload failed (${response.status}); no reference was attached.`);
      return textResult(studio ? { path: prepared.path } : { attachment: prepared.attachment });
    });
  }
}
