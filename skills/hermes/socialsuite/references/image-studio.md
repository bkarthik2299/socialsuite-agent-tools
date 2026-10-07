# Image Studio

Discover generation models with `socialsuite_get_agent_catalog` and pass the selected ID as `settings.model` to `socialsuite_start_studio_job`. Current choices include GPT Image 2, GPT Image 2.5 Flare and GPT Image 2.5 Sunburst. Omitting the model uses the app default. Keep the selected model and all settings identical when retrying the same request ID.

Use Studio for standalone images, reference-image generation, background removal, upscaling, expansion, image-to-prompt, and prompt enhancement. For generating directly on an existing social post/ad, use `socialsuite_generate_content_image` instead.

## Generate or edit

1. Read `socialsuite_list_studio_library` for guides and destinations. Pass `nextCursor` as `before` for older assets. Use `socialsuite_list_ai_credits` when credit availability matters.
2. For local source/reference images call `socialsuite_upload_studio_image` with an absolute `filePath` on the MCP server machine. For other clients, `socialsuite_prepare_studio_upload` reserves a signed upload: upload the bytes before using its path. PNG/JPEG/WebP only, nonempty, at most 10 MB. Sources must be below 20 megapixels and 8192 pixels per side. Do not substitute a public URL for a storage path.
3. Call `socialsuite_start_studio_job` with a fresh UUID `requestId`, a `tool`, and `settings`. Preserve that ID and settings after an uncertain response; a new ID may create another billable job. Credits and provider availability are enforced by the app.
4. Poll `socialsuite_get_studio_job` with several seconds between reads and a bounded deadline. A job is settled when `used_credits` is not null, including zero. Inspect `error`, `assets`, and `result_text`; partial results can coexist with an error. On timeout, retain the job ID and report it as pending. Do not start a replacement job automatically.
5. Return images or prompt text. Signed image URLs expire after one hour; reread the job or library to refresh them.

| Tool | Required settings | Options |
| --- | --- | --- |
| `generate` | `prompt` | `negativePrompt`, `ratio`, `format`, `count` (1–3), `referencePaths` (up to 5), `guideId` |
| `remove` | `sourcePath` | Transparent PNG output |
| `upscale` | `sourcePath` | `scale` 2 or 4, `faceEnhance`; output below 16 megapixels |
| `expand` | `sourcePath` | `ratio`, `prompt`, `negativePrompt` |
| `prompt` | `sourcePath` | Recreation prompt in `result_text`, not the original prompt |
| `enhance` | `prompt` | Improved text in `result_text`; does not generate an image |

Generation ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`. Generation rejects `4:5`; explain the available `3:4` option instead of silently changing an exact size request. Expansion also accepts `4:5`. Formats: `png`, `jpeg`, `webp`. Only generation uses `count`; other tools produce one result.

Brand guidance is opt-in through `settings.guideId`. Choose the user's named guide or the guide for the intended project. Do not use another project's guide accidentally. This differs from `generate_content_image` and its `useBrandGuide` default.

## Organize and save

- `socialsuite_favorite_studio_asset`: set `favorite` explicitly for the current user.
- `socialsuite_create_studio_collection`: name of 1–60 characters; `Likes` is reserved.
- `socialsuite_organize_studio_asset`: provide either `collectionId`, or `projectId` plus `folderId` and optionally `campaignId`. Do not combine collection and campaign destinations: the app takes the collection branch.
- With `campaignId`, organizing saves a campaign content draft and returns `contentId`. Supported campaign types are `socials` and `meta-ad`. It does not publish to social networks. Verify the draft through content tools. The app prevents duplicate drafts for the same asset/campaign.
- `socialsuite_delete_studio_asset` removes the asset and stored output. `socialsuite_delete_studio_collection` uses the app's collection deletion workflow. Use these for user-requested deletion.

Studio tables are intentionally unavailable through generic row tools: dedicated tools preserve authorization, credit settlement, and media-copy behavior.
