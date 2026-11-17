# DIY Reports

Use these tools for the Reports workspace: manual report construction, connected Analytics metrics, business inputs, formulas, KPI targets, charts, branding and shareable snapshots. They are separate from reading a source dashboard with `socialsuite_analytics_dashboard`.

Require `diy-reports` in `socialsuite_whoami.capabilities` and Reports actions in `socialsuite_get_agent_catalog` (Agent API 0.6.0 or compatible newer). Read keys can inspect; saving, duplicating, refreshing, uploading, publishing, revoking and deleting require a write key and workspace editor/admin access. The backend fixes the workspace to the API key owner and applies the app's report/client checks.

## Discover and construct

1. Read `socialsuite_analytics_bootstrap` for the actual Analytics client ID and project links, then `socialsuite_reports_list`. A project ID is not a client ID. For an existing report read `socialsuite_reports_get` before editing.
2. Read `socialsuite_reports_catalog` with `clientId`. Categories contain metrics grouped by source/account. Copy each metric's key, field, aggregation, currency and owning `mappingId`. Do not guess aliases. Missing/unsupported metrics remain unavailable, never zero. A disconnected account needs the existing Analytics connection workflow.
3. For a new report read `socialsuite_reports_defaults`, generate fresh UUIDs for the report, datasets, columns and blocks, and save with revision `-1`. For an existing report use its exact `report.revision` and retain its existing IDs, datasets and manual values. `reports_save` replaces the full draft payload atomically; a revision conflict requires re-reading and reconciling the user's edits. Never retry against a newer revision with stale content.
4. Read `socialsuite_reports_data` to inspect cached metrics, jobs and warnings. Explicitly requested refresh uses `socialsuite_reports_refresh`; poll `reports_data` with a delay while jobs are queued/running. This uses the existing Analytics sync/cooldown; it does not spend SocialSuite AI generation credits. Cache refresh does not change manual inputs.

`reports_save` accepts `{reportId, clientId, revision, document, datasets}`. `document` contains `name`, `description`, `period: {start,end}`, `comparison` (`none`, `previous`, `year`), `branding` and `blocks`. Dates are inclusive `YYYY-MM-DD`, up to 366 days. `branding` has `agencyLogo`, `clientLogo`, six-digit `accent` hex, `font` (`Inter`, `Georgia`, `Arial`) and `footer`. Use empty strings for absent logos. The report title uses a standard sans-serif face; the selected font controls report content.

Each dataset has a stable UUID `id`, `grain` (`total`, `month`, `campaign`, `custom`), `columns`, `rows`, `values` and boolean `totals`. Columns have UUID `id`, `label`, `kind` (`manual`, `connected`, `calculated`) and `field` (`text`, `number`, `currency`, `percentage`, `date`, `status`). Connected columns additionally use `mappingId`, `metric`, and the catalog's `aggregation` (`sum` or `period`); preserve currency metadata. Calculated columns use `formula`. Manual status columns may define `options`. Optional table display settings are `filter`, `sort` (column UUID), `descending`, `hiddenKeys` and column `width` (80–600).

Blocks have UUID `id`, `type` (`table`, `kpi`, `chart`, `text`, `heading`, `divider`), `title`, `description` and boolean `internal`. Table/KPI/chart blocks reference `tableId`; KPI/chart blocks also reference `columnId`. Charts use `chart: line|bar|donut`; a KPI may have numeric `target`. Commentary uses `text`. Internal blocks are excluded from published presentations and exports but can feed calculations. Preserve internal data during editing.

## Manual values and formulas

Never join sources by account or campaign display name. Stable value keys include exact covered dates:

| Grain | Value key |
| --- | --- |
| Period total | `START:END|total` |
| Monthly | `COVERED_START:COVERED_END|month` for each full or partial month |
| Custom row | `START:END|ROW_UUID`; row has `{id,label,period:"START:END"}` |
| Campaign | `START:END|MAPPING_UUID/CAMPAIGN_PROVIDER_ID` |

`values[key]` maps column UUIDs to strings, finite numbers or null. Missing values are unavailable. Manual values for another date range must be retained: changing dates and coming back restores them. Filtering, sorting and hiding affect display, not totals. Table totals include all records in the period.

Stored formulas reference UUIDs in brackets, such as `[ADS_CONVERSIONS_COLUMN_UUID] + [MANUAL_LEADS_COLUMN_UUID]`. Supported operations are numbers, parentheses, `+ - * /`, and `SUM`, `COUNT`, `AVG` of a numeric column reference. UUIDs must match real columns in the same dataset. The UI accepts labels and converts them to IDs; MCP callers should send IDs. Cycles, missing/nonnumeric references, division by zero and incompatible currencies remain unavailable. Do not add GA4 key events to Ads conversions without establishing they are distinct leads. Label dummy/manual assumptions explicitly.

Distinct users, rates and other nonadditive metrics require exact reporting-period totals instead of adding monthly values. Snapshot-only metrics require total grain. Line charts require a time dimension; donuts require additive nonnegative values. Campaign tables use stable campaign IDs from one supported ad account. Arbitrary provider dimensions or cross-account campaign joins are not supported.

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
    "id": "10000000-0000-4000-8000-000000000003", "grain": "total", "rows": [], "totals": false,
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

## Branding, sharing and copies

`socialsuite_reports_branding_assets` returns selectable logos from the linked project's Brand Guide. For a manual file use `socialsuite_reports_upload_logo` with `reportId` and an absolute `filePath` on the MCP server machine (PNG/JPG/WebP, up to 2 MB). Upload only a file the user authorized. It returns a stored asset URL; assign it to `clientLogo` or `agencyLogo` in the next complete `reports_save`. Do not ask the user to provide a logo URL. Removing a logo clears the field, retaining old assets for snapshots.

Set `branding.accent` to the user's six-digit hex. The app applies it to headings, solid table headers, alternating tinted rows, chart series, targets, soft card shadows and report hover/focus/menu/calendar states. Tables have slightly rounded corners. Controls use the app's shared styles. Logos occupy a dedicated header row without overlapping report controls. Branding persists in preview and PDF/published snapshots.

Publishing creates a publicly accessible bearer link and must be explicitly authorized. `socialsuite_reports_publish` resolves the saved draft on the server and freezes a dated presentation. The returned token belongs at `https://www.socialsuite.app/shared-reports/TOKEN` for the production app (use the configured app origin for self-hosting). Keep it private to intended recipients. Review missing data first; set `acknowledgeMissing: true` only after the user accepts the warnings. Editing or refreshing a draft never updates a published version. `socialsuite_reports_version` reads a historical snapshot. `socialsuite_reports_revoke` disables the active link; republishing creates a new token. `reports_get` may expose the active token, so do not include it in routine summaries.

`socialsuite_reports_duplicate` takes an existing `reportId`, destination `clientId` and new `period`. It preserves structure and formulas with fresh report/dataset/block IDs, clearing manual values, defaults and commentary. Another-client copies also clear connected mappings and client branding. Discover the destination catalog and remap before publishing. Never copy one client's business numbers to another client.

The app supports CSV per visible client-facing table, XLSX across client-facing tables, and browser Print / Save PDF with rendered charts and frozen branding. These are app export actions, not remote MCP download endpoints; do not claim a downloadable file exists after only reading a report. `reports_version` returns structured presentation data if the user wants another artifact generated from a snapshot. Permanent `socialsuite_reports_delete` requires confirmation at action time; it is not a block removal tool.
