# Super AI

Use the current chat workflow for brand-aware research, strategy, writing, Google Ads, social and website work. The older campaign mission tools remain available for existing runs.

1. Read `socialsuite_super_ai_bootstrap` for accessible chats, brands, projects, credits and personal state. Read `socialsuite_get_agent_catalog` for models by instant/deep mode. `socialsuite_super_ai_health` is an optional admin provider-health check.
2. Read an existing chat with `socialsuite_super_ai_thread`, or create one with `socialsuite_super_ai_create`. Use project/brand IDs from discovery. `socialsuite_super_ai_configure` changes context/title, subject to the app's in-flight restrictions.
3. Request `socialsuite_super_ai_quote` with the chat ID, prompt, discovered model ID and optional specialist, `deep`, research, `researchProvider` (`tavily` or `sonar`) and page URL. `artifactId` targets an existing draft for AI revision. Do not silently substitute another brand, provider or model. Quotes expire after two minutes; inspect `estimated_credits`, `max_credits` and `expires_at`. If spending has not already been authorized, present this estimate for approval.
4. Send the authorized quote with `socialsuite_super_ai_send`, a client-generated UUID `requestId`, and `quoteId`. Reuse both IDs after an uncertain response. Poll `socialsuite_super_ai_request` with a delay (for example 2–5 seconds) until `succeeded`, `failed` or `canceled`. Inspect errors and credit settlement. Do not repeatedly start new paid requests to recover a timeout.
5. Read the thread for artifacts and sources. Summarize the output. Save only when the user asked to save or already authorized it. Saving creates campaign drafts; it does not publish to social networks.
6. Discover destinations with `socialsuite_super_ai_destinations`. Commit with `socialsuite_super_ai_commit`, artifact ID and a stable `saveId` UUID. Destination accepts project/folder/campaign IDs or names to create. To replace a placeholder, also pass `itemId` and its current `expectedUpdatedAt`. Preserve the destination hierarchy; do not overwrite a changed item. Google Ads need a final URL and social ads need a destination URL before saving.

Use `socialsuite_super_ai_revise` for manual name/field edits with a new `revisionId` UUID; it creates a validated revision without model charges. Read `socialsuite_super_ai_artifact_saves` for saves across draft ancestry. Undo uses the original `saveId` with `socialsuite_super_ai_undo`; changed content can prevent undo.

`socialsuite_super_ai_branch` copies history before the selected message into a new chat. `socialsuite_super_ai_state` sets both personal flags: preserve the existing pinned/archive flag not being changed. Sharing uses workspace user IDs and view/contribute/remove roles; only the owner can share or delete. Cancel stops active chat work, but work already performed may still cost credits. The app enforces chat membership and owner/contributor access on every forwarded request.

A read API key can inspect accessible chats and requests. Quote creation, personal state changes and all other mutations require a write API key and workspace editor/admin access. Generic table tools do not expose Super AI private tables or worker/stream endpoints.

## Images and documents

Pass prepared files in `socialsuite_super_ai_quote.attachments`, each with `{name, size, text, images}`. `size` is the original file size in bytes; `text` contains extracted document content; `images` contains JPEG/PNG/WebP base64 data URLs. The connector validates and forwards these contents. It does not open local paths or parse raw PDF/Office files. Use the harness's document/image readers to prepare the contents; never substitute a file path, public URL or filename for readable content. Browser-only GIF/BMP support works by converting images to an accepted format.

Limits per message: five files, 10 MB total original bytes, 60,000 text characters per file, 100,000 total text characters, 20 image pages, 4 MB per image data URL and 16 MB total encoded image data. Each attachment must have readable text or at least one image. Extract text from text/Office documents; scanned PDFs need image pages. Split larger inputs and disclose any omitted pages/content.

Include attachments before requesting the quote, then send that quote ID; do not try to add or change attachments on `super_ai_send`. File changes require a new quote. Inspect the returned `model` as well as credits: image inputs or earlier image history can cause the backend to select a vision-capable Anthropic model. Tell the user when that differs from their selection, and obtain any needed spending/model approval before sending. Thread and branch responses preserve attachment history under the app's conversation permissions.

Attachment support requires the additive `super_ai_attachments` migration and updated `super-ai` function (app PR #91). On an older backend, a quote can ignore unknown attachments. Confirm that rollout with the operator before quoting attachments; do not assume Agent API 0.4.0 implies support or send a paid request when support is uncertain.
