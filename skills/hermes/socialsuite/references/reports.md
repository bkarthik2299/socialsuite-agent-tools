# DIY Reports

Use these tools for the Reports workspace: manual report construction, connected Analytics metrics, business inputs, formulas, KPI targets, charts, branding and shareable snapshots. They are separate from reading a source dashboard with `socialsuite_analytics_dashboard`.

Require `diy-reports` in `socialsuite_whoami.capabilities` and Reports actions in `socialsuite_get_agent_catalog` (Agent API 0.6.0 or compatible newer). Read keys can inspect. Saving, duplicating, refreshing, uploading, creating or updating share links, revoking and deleting require a write key and workspace editor/admin access. The backend binds each request to the key's workspace and checks the report and client.

## Complete a report from one request

A request to create or update a report authorizes the requested draft work. Complete discovery, construction, saving, provider-job polling and verification in the same task. Do not stop at a proposed layout or ask the user to choose IDs, metrics, sources or routine formatting that the tools can discover. One user request can involve multiple MCP calls. Preserve the user's scope; creating a draft does not authorize public sharing or sending it to anyone.

Use any metric returned by the client's Reports catalog, including provider-specific keys and extra metric definitions. Do not restrict reports to an SEO/ads shortlist. Copy the catalog's `mappingId`, `key`, `field`, `aggregation`, `currency` and compatible `grains`; do not guess a metric from its label or infer that a connected source exposes every upstream field. Use separate datasets when metrics require different dimensions, sources, currencies or snapshot treatment. A metric can be supported but temporarily unavailable while a job runs.

Honor explicit dates. Without dates, use a reasonable completed reporting period and state it; for a latest-ranking request, inspect the SEO dashboard's check/data-through dates. Do not silently move an explicit historical period to newer checks. Ask only when ambiguity materially changes the client, metric meaning or requested outcome. Missing source data stays unavailable, never zero, fabricated or silently copied into manual fields.

## Discover and construct

1. Read `socialsuite_analytics_bootstrap` for the actual Analytics client ID and project links, then `socialsuite_reports_list`. A project ID is not a client ID. For an existing report read `socialsuite_reports_get` before editing.
2. Read `socialsuite_reports_catalog` with `clientId`. Categories contain metrics grouped by source/account. Copy each metric's key, field, aggregation, currency and owning `mappingId`, and verify that its `grains` includes the dataset grain. If an active source has no cached metrics yet, read analytics_dashboard for the intended dates, wait for its existing sync, and query the catalog again before declaring a binding unsupported. Missing values stay unavailable. A disconnected account needs the existing Analytics connection workflow.
3. For a new report read `socialsuite_reports_defaults`, generate fresh UUIDs for the report, datasets, columns and blocks, and save with revision `-1`. For an existing report use the exact `report.revision` from `socialsuite_reports_get` and retain its existing IDs, datasets and manual values. `socialsuite_reports_save` replaces the saved draft atomically. On a revision conflict, read the latest draft and reapply only the requested edits.
4. Read `socialsuite_reports_data` to inspect cached metrics, jobs, warnings and the server-resolved `presentation` when `reports-preview` is advertised. Explicitly requested refresh uses `socialsuite_reports_refresh`; poll `reports_data` with a delay while jobs are queued/running. This uses the existing Analytics sync/cooldown; it does not spend SocialSuite AI generation credits. Cache refresh does not change manual inputs. Poll with a delay while requested jobs are queued/running (for example 5, 10, then 20 seconds between reads, up to about three minutes). Stop polling on completion, a terminal provider error, or that bound. Do not repeatedly force-refresh pending work.
5. Verify the saved draft against `reports_data.presentation` and `reportRevision`: requested blocks exist, available KPI values resolve, connected tables have the intended dimension and rows, and comparison/snapshot dates and missing-data messages are correct. A successful `reports_save` alone is not completion. If the revision changed while verifying, read the latest report before interpreting or modifying it. Return the authenticated draft URL at `/reports/REPORT_ID`; call `reports_share` only when sharing is requested. If provider work remains pending, return the saved draft and exact pending items without claiming the report is fully verified. With older backends lacking `reports-preview`, inspect `reports_get` and exact-period cache rather than claiming a server-verified presentation.

## SEO metrics and tables

Check the Reports catalog for a live binding first. The Reports catalog is authoritative for live bindings. Connected totals and compatible monthly metrics work across supported sources; campaign rows require a supported ad account. Connector 0.8.0 adds `keyword` datasets for backend capability `reports-keyword-rows`. `reports-preview` adds resolved draft verification. Both capabilities are advertised by Agent API 0.7.1 or compatible newer; exact version equality is not required. Dashboard-only dimensions such as GA4 channel breakdowns still require a separate supported binding or an explicitly requested dated snapshot.

| Requested item | Read from Analytics | Use in Reports |
| --- | --- | --- |
| GA4 organic traffic | Call `socialsuite_analytics_dashboard` with `detail: "ga4_organic_search"`. Use `metrics.sessions` from the `Organic Search` row for the intended GA4 property and dates. | With the user's agreement, populate a dated manual KPI from the returned row. Leave the value unavailable when the row or metric is missing. |
| Individual keyword rankings | Discover `currentPosition`, `previousPosition`, `rankingCheckDate`, and `previousRankingCheckDate` in `reports_catalog`, under the intended SE Ranking mapping. The dashboard detail remains useful for inspecting source coverage. | Use a connected `keyword` dataset from that one mapping, with `rows: []`, `values: {}`, and `totals: false`. The generated first column is the keyword name. Bind position/check-date columns using catalog fields. Rows join by provider keyword ID, including when labels repeat. Never manually enumerate or copy positions. `previousPosition` uses the latest check in the comparison period (or previous equivalent period when comparison is `none`); absent history is “No earlier check”, while provider position zero is “Unranked”. Search Console query average position is a separate metric. |
| Organic website leads | Identify the saved website lead source and definition, along with lead-specific attribution or matching paid website leads. Scope to the same client, dates, conversion actions, counting rules and attribution. | Prefer a directly attributed organic website lead count. Subtract paid leads only for a documented residual metric with matching coverage and deduplication. Other channels may contribute to that residual. Keep the KPI pending when the required inputs are unverified. Generic GA4 key events and Google Ads conversions are insufficient on their own. |

Wait for queued dashboard data and inspect provider warnings and coverage before importing. Label any agreed snapshot with its source, reporting period and data-through or check date. Manual snapshot values only change when explicitly updated. Prefer connected fields whenever the catalog supports the requested item. For connected content score and Domain Trust, use total grain: the latest available score has its own date and no false previous-period comparison, even when the selected period has no rank checks. Average tracked rank excludes unranked keywords; top-10 share includes checked unranked keywords in its denominator. Keep those definitions in client-friendly descriptions. If a binding is unavailable, preserve unrelated existing blocks/manual values and report the exact gap; ask before a material substitution that changes the requested metric or refresh behaviour. For a new draft, leave unsupported items pending and continue with the data that can be verified.

## Draft schema

`reports_save` accepts `{reportId, clientId, revision, document, datasets}`. `document` contains `name`, `description`, `period: {start,end}`, `comparison` (`none`, `previous`, `year`), `branding` and `blocks`. Dates are inclusive `YYYY-MM-DD`, up to 366 days. `branding` has `agencyLogo`, `clientLogo`, six-digit `accent` hex, `font` (`Inter`, `Georgia`, `Arial`) and `footer`. Use empty strings for absent logos. The report title uses a standard sans-serif face; the selected font controls report content.

Each dataset has a stable UUID `id`, `grain` (`total`, `month`, `campaign`, `keyword`, `custom`), `columns`, `rows`, `values` and boolean `totals`. Columns have UUID `id`, `label`, `kind` (`manual`, `connected`, `calculated`) and `field` (`text`, `number`, `currency`, `percentage`, `date`, `status`). Connected columns additionally use `mappingId`, `metric`, and the catalog's `aggregation` (`sum` or `period`); preserve currency metadata. Calculated columns use `formula`. Manual status columns may define `options`. Optional table display settings are `layout` (`horizontal` or `transposed`), `filter`, `sort` (column UUID), `descending`, `hiddenKeys` and column `width` (80–600).

Blocks have UUID `id`, `type` (`table`, `kpi`, `chart`, `text`, `heading`, `divider`), `title`, `description` and boolean `internal`. Table/KPI/chart blocks reference `tableId`; KPI/chart blocks also reference `columnId`. Charts use `chart: line|bar|donut`; a KPI may have numeric `target`. Commentary uses `text`. Internal blocks are excluded from published presentations and exports but can feed calculations. Preserve internal data during editing.

## Table layouts and snapshots

The table's top-right icon controls are **Horizontal** and **Vertical**, with accessible labels/tooltips. Vertical is stored as `dataset.layout: "transposed"`; never send `"vertical"` as the API value. Horizontal uses `"horizontal"`. Use connector 0.7.6 or newer to preserve or edit layout, with a Reports backend that supports the layout field (app PR #147 or later). Retain an existing layout when changing other fields; older datasets may omit it.

The saved choice controls the table in the editor, normal shared report, PDF, CSV and XLSX. Vertical places metrics in rows, groups recognized channels and puts reporting records/periods in columns. Numeric values are right-aligned with number and currency formatting. Image snapshots always use the compact vertical layout, independently of the saved choice (app PR #149 or later). Keep this behavior when a user requests a horizontal report table. A snapshot of a one-period report uses a compact two-column metric/value table; additional periods become additional columns.

## Manual values and formulas

Never join sources by account or campaign display name. Stable value keys include exact covered dates:

| Grain | Value key |
| --- | --- |
| Period total | `START:END|total` |
| Monthly | `COVERED_START:COVERED_END|month` for each full or partial month |
| Custom row | `START:END|ROW_UUID`; row has `{id,label,period:"START:END"}` |
| Campaign | `START:END|MAPPING_UUID/CAMPAIGN_PROVIDER_ID` |
| Keyword | Generated `START:END|MAPPING_UUID/KEYWORD_PROVIDER_ID`; keep connected `values` empty |

`values[key]` maps column UUIDs to strings, finite numbers or null. Missing values are unavailable. Manual values for another date range must be retained: changing dates and coming back restores them. Filtering, sorting and hiding affect display, not totals. Table totals include all records in the period.

Use `recordHeading` to label the first column. Rename custom records through `rows[].label`. For generated rows, edit `rowLabels` using `total`, `month:YYYY-MM`, or `campaign:MAPPING_UUID/CAMPAIGN_ID` / `keyword:MAPPING_UUID/KEYWORD_ID` as the key. The underlying cell keys stay unchanged. Use connector 0.7.2 or newer to edit these settings.

Preserve text cell strings with the `socialsuite-rich-text:v1:` prefix unless the user asks to change their content. They carry the formatting and links produced by the report editor. Plain text remains a normal string.

Stored formulas reference UUIDs in brackets, such as `[ADS_CONVERSIONS_COLUMN_UUID] + [MANUAL_LEADS_COLUMN_UUID]`. Supported operations are numbers, parentheses, `+ - * /`, and `SUM`, `COUNT`, `AVG` of a numeric column reference. UUIDs must match real columns in the same dataset. The UI accepts labels and converts them to IDs; MCP callers should send IDs. Cycles, missing/nonnumeric references, division by zero and incompatible currencies remain unavailable. Do not add GA4 key events to Ads conversions without establishing they are distinct leads. Label dummy/manual assumptions explicitly.

Distinct users, rates and other nonadditive metrics require exact reporting-period totals instead of adding monthly values. Snapshot-only metrics require total grain. Line charts require a time dimension; donuts require additive nonnegative values. Campaign tables use stable campaign IDs from one supported ad account; keyword tables use stable keyword IDs from one SEO mapping. Arbitrary provider dimensions and cross-account entity joins are not supported; do not turn a missing dimension into a total or a manual snapshot without agreement.

Limits: 100 blocks, 50 datasets, 50 columns/table, 5,000 custom rows/table and 4 MB of dataset content per save. Use `reports_get` to preserve stored datasets even when their visible block was removed.

## Small manual example

The following is a complete new draft payload with two manual lead sources and a total KPI. Generate new UUIDs for a real report and replace `clientId` with discovery results. It saves a draft; no public link is created.

```json
{
  "reportId": "10000000-0000-4000-8000-000000000001",
  "clientId": "10000000-0000-4000-8000-000000000002",
  "revision": -1,
  "document": {
    "name": "Lead report", "description": "Illustrative manual inputs",
    "period": {"start": "2026-11-01", "end": "2026-11-30"},
    "comparison": "none",
    "branding": {"agencyLogo": "", "clientLogo": "", "accent": "#6B7A36", "font": "Inter", "footer": ""},
    "blocks": [
      {"id": "10000000-0000-4000-8000-000000000007", "type": "table", "title": "Manual leads", "description": "Dummy example", "internal": false, "tableId": "10000000-0000-4000-8000-000000000003"},
      {"id": "10000000-0000-4000-8000-000000000008", "type": "kpi", "title": "Total leads", "description": "Dummy example", "internal": false, "tableId": "10000000-0000-4000-8000-000000000003", "columnId": "10000000-0000-4000-8000-000000000006", "target": 20}
    ]
  },
  "datasets": [{
    "id": "10000000-0000-4000-8000-000000000003", "grain": "total", "rows": [], "totals": false, "layout": "transposed",
    "columns": [
      {"id": "10000000-0000-4000-8000-000000000004", "label": "Referrals (dummy)", "kind": "manual", "field": "number"},
      {"id": "10000000-0000-4000-8000-000000000005", "label": "Walk-ins (dummy)", "kind": "manual", "field": "number"},
      {"id": "10000000-0000-4000-8000-000000000006", "label": "Total leads", "kind": "calculated", "field": "number", "formula": "[10000000-0000-4000-8000-000000000004] + [10000000-0000-4000-8000-000000000005]"}
    ],
    "values": {"2026-11-01:2026-11-30|total": {"10000000-0000-4000-8000-000000000004": 10, "10000000-0000-4000-8000-000000000005": 5}}
  }]
}
```

The KPI should resolve to 15 and 75% of target. To mix in connected metrics, add columns using catalog IDs and reference those column UUIDs in the total. Read fresh cache and warnings before interpreting the result.

## Direct KPI formulas

For a KPI that calculates its own value, set `type: "kpi"`, keep the source `tableId`, and give it a `calculation` object with `expression` and `format` (`number`, `currency`, or `percentage`). Omit `columnId` for this mode. Use stable column IDs from the selected table, for example `[spend-column-id] / [total-leads-column-id]`. A plain column reference uses the period total. For currency, use the source currency or set a three-letter fallback code in `calculation.currency`.

Use connector 0.7.1 or newer to edit reports containing direct KPI formulas. Preserve the `calculation` object when editing other parts of the report.

## Branding, sharing and copies

`socialsuite_reports_branding_assets` returns selectable logos from the linked project's Brand Guide. For a manual file use `socialsuite_reports_upload_logo` with `reportId` and an absolute `filePath` on the MCP server machine (PNG/JPG/WebP, up to 2 MB). Upload only a file the user authorized. It returns a stored asset URL; assign it to `clientLogo` or `agencyLogo` in the next complete `reports_save`. Do not ask the user to provide a logo URL. Removing a logo clears the field, retaining old assets for snapshots.

Set `branding.accent` to the user's six-digit hex. It themes report content such as table headers/rows, KPI shadows, charts and targets. Report headings stay neutral and the title stays sans serif. Shared app controls such as Share, Close, settings and action buttons use Social Suite blue. WhatsApp uses a soft green treatment. Logos, font and report accent are preserved in shared reports and exports.

1. Use `socialsuite_reports_share` after the user authorizes sharing. It returns `url` (the sign-in-free report), `snapshotUrl` (the server-rendered vertical JPEG), `message` (starter text with the report link) and `status` (`created`, `existing` or `updated`). Both URLs grant access to the client-facing snapshot; send them only to the intended audience. Internal blocks are excluded. The image endpoint can take time to generate and may be temporarily unavailable; a returned URL alone does not confirm that its image has loaded.
2. MCP returns an active link as-is by default. Set `updatePreview: true` when asked to share the latest saved report at that same link; omit it or use `false` when asked only to copy the existing link/snapshot. Review missing data before setting `acknowledgeMissing: true`. Saving or refreshing alone leaves the shared preview at its previous version. MCP does not open WhatsApp, send messages or write a browser clipboard. Return the requested assets to the user; sending to a recipient requires authorization and an appropriate messaging tool.
3. `socialsuite_reports_revoke` turns off the link. Sharing again creates a fresh URL. `socialsuite_reports_version` reads a historical snapshot. `reports_get` may return the active token, so omit it from routine summaries. The legacy `reports_publish` tool remains available for existing automations.

`socialsuite_reports_duplicate` takes an existing `reportId`, destination `clientId` and new `period`. It preserves structure and formulas with fresh report/dataset/block IDs, clearing manual values, defaults and commentary. Another-client copies also clear connected mappings and client branding. Discover the destination catalog and remap before sharing. Keep each client's business numbers in their own report.

Use **Report options → Download PDF** in the editor for a landscape report with charts, branding and page numbers. Wide tables continue in groups with row labels and column headings repeated. The table title appears once. Vertical PDF tables retain every channel. The app also supports CSV per client-facing table and XLSX across client-facing tables; these respect the saved table orientation.

In the browser, opening **Share** as an editor saves pending edits and prepares the latest public snapshot automatically, keeping the active report URL. There is no **Update preview** button. If the link was turned off, opening Share keeps it off; **Create link** explicitly creates a fresh URL. A failed preparation offers **Try again**. Browser autosave alone does not continuously republish the report.

The Share dialog shows **Generating report snapshot…**, a clickable **View snapshot** thumbnail when ready, or **Snapshot unavailable** if image preparation fails or times out. The thumbnail opens a larger, scrollable image preview. **Copy link** and **Open report** remain available, and **WhatsApp link only** can open the message/link while the image prepares.

**Copy image & text** copies the PNG and caption/link together in one clipboard operation without opening a chat. The **WhatsApp** action uses the same payload and opens WhatsApp Web on desktop with the message and sign-in-free link filled in; paste into the chosen chat. On supported touch devices, choose WhatsApp in the share sheet to hand off the file and message. If copying is blocked, use **Download image** and attach it. Clipboard access and how pasted image/text are accepted depend on the browser and receiving app; do not claim the image or caption was sent automatically.

`reports_version` returns structured presentation data for generating a separate artifact. `reports_share.snapshotUrl` serves the server-rendered JPEG; the browser's clipboard/native attachment is a PNG of the same vertical presentation. The server image route requires the frontend/server deployment from app PR #144 or later. PDF, CSV and XLSX downloads remain editor actions. Permanent `socialsuite_reports_delete` requires confirmation at action time.
