# Analytics

Use `socialsuite_analytics_bootstrap` to discover workspace clients, connections, active mappings, projects and portal clients. New connections support `ga4` (Google Analytics 4), `gsc` (Search Console), `gbp` (Business Profile), `google_ads` (Google Ads), and `meta_ads` (Facebook/Instagram Ads), all via Windsor. Organic social sources also use Windsor; see the exact IDs below. New `seo` connections use each client's own SE Ranking API key and Project API subscription, independently of Windsor. Legacy SEO reports remain readable. Before new setup, check `analytics-social-organic` or `analytics-seranking` in `socialsuite_whoami`; `analytics` alone is insufficient. Check `bootstrap.configuration.windsor` or `.seranking` before offering provider setup.

Read reports with `socialsuite_analytics_dashboard`, client ID, inclusive `start`/`end` dates in YYYY-MM-DD and optional `compare: true`. Reports may be queued or stale; inspect each report's readiness, errors, timezone, data-through date and warnings. Missing metrics are unavailable, not zero. The dashboard may enqueue missing reports, just as the app does, even for a read key. Avoid claiming live provider access or interpreting incomplete periods as final totals.

For client setup:

1. Create/update with `socialsuite_analytics_save_client`. On update, send the existing website/project/portal-client links unless changing them; omitted links are cleared by the app. Preferences use `socialsuite_analytics_client_preferences` for favorite/archive flags.
2. For Windsor sources, start/resume `socialsuite_analytics_connect_source` for the client/source. For `seo`, follow the SE Ranking setup below. Present its authorization URL privately to the user to complete provider consent. Never log or persist that URL in content, notes or shared documents. Managed sources can return no URL. Do not restart a consumed link after an account is already shared.
3. Discover accounts/properties with `socialsuite_analytics_resources`, then select the exact returned resource using `socialsuite_analytics_map`. SEO also requires an engine ID from discovery. Do not reuse an unrelated client's provider connection.
4. Poll dashboard with a delay for asynchronous report readiness. Use `socialsuite_analytics_refresh` only when a force refresh is needed; avoid repeated provider jobs.

Unmap deactivates a mapping. Disconnect removes provider access and deactivates the connection's mappings. Follow the user's requested scope when making these changes.

Bootstrap/dashboard and SEO credit reads accept read keys. Source discovery and all setup/refresh operations require write keys and editor/admin access. Provider credentials stay server-side; generic row tools do not expose Analytics connection credentials. Metric selection and chart display preferences remain client UI settings, not MCP data workflows.

## Ads reports and period interpretation

Google Ads and Meta Ads use the same connect → resources → map → dashboard tools with their exact source IDs. Choose the returned account ID rather than a display name. These tools read performance; they do not create ads, change budgets or publish campaigns. They require the app's ads-source migration and updated Analytics functions (app PR #92).

Reports include spend, clicks, impressions, CTR, CPC, CPM and campaign breakdowns with IDs. Google Ads conversions can be fractional and follow account configuration. Meta reports all ad clicks and attributed leads/purchases using the documented 7-day click / 1-day view window. Neither source's conversions establish unique leads or deduplicated cross-platform sales.

Preserve each report's currency code: no currency conversion or combined spend across different currencies. Do not sum Google and Meta conversions as deduplicated totals. Missing values are unavailable; ratios with zero denominators are unavailable. Inspect warnings, reporting timezones and attribution before comparing sources.

Date ranges are inclusive, at most 366 days, and must omit the unfinished UTC day. Use explicit dates in the user's requested reporting context. Cached reports can remain after disconnect; disconnect stops SocialSuite sync but does not revoke the upstream Windsor/provider grant. Archive retains reports and stops synchronization. For provider access revocation, direct the user to Windsor/provider settings.

## Organic social analytics

Use the existing connect → resources → map → dashboard workflow with these exact source IDs:

| Platform | Source ID |
| --- | --- |
| Instagram | `instagram` |
| Facebook | `facebook_organic` |
| LinkedIn | `linkedin_organic` |
| TikTok | `tiktok_organic` |
| YouTube | `youtube` |
| Pinterest | `pinterest_organic` |
| Threads | `threads` |
| X | `x_organic` |

Use authorized account discovery, not public handles or invented resource IDs. Account type, provider permissions and available fields determine coverage. Treat account snapshots such as followers/lifetime posts separately from period activity and individual post rows. Read `metricMetadata` (including `snapshot`, `asOf`, `note`), warnings and data-through dates; never sum snapshots across days or post rows, or present current followers as historical growth. Missing provider metrics stay unavailable. Preserve platform-specific definitions of views, reach and engagement; do not claim deduplicated cross-platform audiences. These tools report organic performance and do not publish or change social accounts.

## SE Ranking setup and API credits

1. Confirm `analytics-seranking` and `bootstrap.configuration.seranking`. Obtain the client's authorized SE Ranking API key from their SE Ranking API dashboard privately. The subscription must include Project API access. Do not put keys into content, notes, logs, shared documents, skill files or MCP configuration.
2. Call `socialsuite_analytics_connect_source` with `clientId`, `source: "seo"`, and `apiKey`. The key is required for SEO only; Windsor sources reject `apiKey`. The backend validates project access before storing the encrypted key. No Windsor authorization URL is needed.
3. Call `socialsuite_analytics_resources` with `clientId`, returned `connectionId`, and `source: "seo"` to select the intended project. Discover that project's engines with the same tool and `resourceId`, then map with `resourceId` and an exact discovered `engineId`. Preserve engine/location identity; never average unrelated configurations.
4. Poll `socialsuite_analytics_dashboard` for the requested completed-day range. Quota/temporary failures use the existing report queue. An invalid key requires reconnecting; do not retry indefinitely or invent another provider grant.
5. When asked about provider quota, require `analytics-seo-credits`, then call `socialsuite_analytics_seo_credits` with this client's `clientId` and `connectionId`. Report `remaining`, `limit`, `used`, `status`, `expiresOn` and `checkedAt` as returned; null means unavailable. These are SE Ranking subscription API credits, separate from SocialSuite AI credits. A read key can inspect an existing connection's quota without receiving its key. Do not poll quota repeatedly.

If capabilities are absent, explain that the matching app backend must be deployed. Do not send a customer's key to an older backend that may ignore unknown fields. Disconnect uses the existing Analytics tool and does not revoke the client's key at SE Ranking.

## SEO report interpretation

Existing dashboard reports include rankings/movement, visibility, maps/SERP data, keyword attributes, project summaries, website audit checks, monitored backlinks, configured competitors and AI visibility when the connected account supports those modules. Read available definitions (`extraMetricDefinitions`), metric metadata, breakdowns and warnings rather than inventing fields. Optional-module failures can leave the core rankings report usable; unavailable/restricted data is not zero.

Historical rankings use checks inside the selected period and one engine/location. Ranked-only averages exclude unranked keywords. Movement requires first/last ranked checks; do not fill missing checks or substitute current project summaries for historical totals. Audit/project/keyword/backlink snapshots retain retrieval/audit dates and should not be compared as previous-period measurements. AI visibility requires a confirmed check date inside the period and separate engine/location results.

The app's expanded SEO default groups 23 metrics across rankings, local/maps, on-page, technical, off-page and competitors, with audit issue, competitor and backlink tables. This is a display preset, not a separate MCP action. Map top-three counts are tracked keywords, not geographic grid coverage; monitored backlinks are project links, not the whole-web paid research database. Individual audit issue counts are not unique affected-page counts. The integration uses read-only Project API reports, not the credit-billed Data API or provider management writes.

For discovery/enquiry reporting, retain GSC and GBP definitions; GA4 organic sessions/key events require an explicitly returned `Organic Search` channel row. Do not relabel all-channel totals as organic, or equate clicks, direction requests, key events or ranking scores with confirmed appointments.
