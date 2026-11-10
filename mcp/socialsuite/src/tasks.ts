import { z } from 'zod/v4';

const link = z.string().trim().nullable().optional();
const date = z.union([z.iso.date(), z.literal(''), z.null()]).optional();
const assignee = link.describe('Workspace member userId from socialsuite_list_tasks (membership id is also accepted). Null clears the assignment.');

export const taskUpdateFields = {
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.string().trim().min(1).optional().describe('Stage id from socialsuite_list_tasks, including custom stages.'),
  dueDate: date.describe('YYYY-MM-DD calendar date. Null or empty string clears the date.'),
  projectId: link.describe('Project id. Moving projects clears folder/campaign unless supplied together.'),
  folderId: link.describe('Folder id. Infers the project and clears the previous campaign.'),
  campaignId: link.describe('Campaign id. Infers its folder and project.'),
  assigneeId: assignee,
  sortOrder: z.number().int().optional(),
  due_date: date,
  project_id: link,
  folder_id: link,
  campaign_id: link,
  assignee_id: assignee,
  sort_order: z.number().int().optional(),
};

export const taskUpdatesSchema = z.object(taskUpdateFields).strict()
  .refine(value => Object.keys(value).length > 0, 'Provide at least one editable task field');
