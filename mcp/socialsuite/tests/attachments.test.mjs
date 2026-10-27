import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachmentsSchema } from '../dist/attachments.js';

const attachment = { name: 'brief.md', size: 10 * 1024 * 1024, text: 'Brief', images: [] };
test('prepared attachments accept the byte boundary and reject combined payload overflow', () => {
  assert.deepEqual(attachmentsSchema.parse([attachment]), [attachment]);
  assert.equal(attachmentsSchema.safeParse([attachment, { ...attachment, size: 1 }]).success, false);
  assert.equal(attachmentsSchema.safeParse([{ ...attachment, size: Number.MAX_SAFE_INTEGER + 1 }]).success, false);
  assert.equal(attachmentsSchema.safeParse([{ ...attachment, images: ['data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024)] }]).success, false);
  assert.equal(attachmentsSchema.safeParse([{ ...attachment, images: Array(6).fill('data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024)) }]).success, false);
});
