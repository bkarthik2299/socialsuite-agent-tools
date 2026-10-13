import { z } from 'zod/v4';

// Match Super AI's prepared attachment payload, not a file path or upload URL.
export const attachmentsSchema = z.array(z.object({
  name: z.string().min(1).max(255).refine(value => value.trim().length > 0),
  size: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  text: z.string().max(60000),
  images: z.array(z.string().max(4 * 1024 * 1024)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/)),
}).refine(value => value.text.trim().length > 0 || value.images.length > 0,
  'Attachment must contain readable text or images.')).max(5).superRefine((values, ctx) => {
  const totals = values.reduce((sum, value) => ({
    bytes: sum.bytes + value.size,
    text: sum.text + value.text.length,
    images: sum.images + value.images.length,
    encodedBytes: sum.encodedBytes + value.images.reduce((n, image) => n + image.length, 0),
  }), { bytes: 0, text: 0, images: 0, encodedBytes: 0 });
  if (totals.bytes > 10 * 1024 * 1024 || totals.text > 100000 || totals.images > 20 || totals.encodedBytes > 16 * 1024 * 1024) {
    ctx.addIssue({ code: 'custom', message: 'Attachments exceed the message limit: 10 MB, 100,000 text characters, 20 image pages or 16 MB encoded images.' });
  }
});
