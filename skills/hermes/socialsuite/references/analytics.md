# Analytics

Use `socialsuite_analytics_bootstrap` to discover workspace clients, connections, active mappings, projects and portal clients. New connections support `ga4` (Google Analytics 4), `gsc` (Search Console), `gbp` (Business Profile), `google_ads` (Google Ads), and `meta_ads` (Facebook/Instagram Ads), all via Windsor. `seo` remains readable for legacy reports but cannot start a new connection. Resource discovery/mapping still accepts `seo` for an existing legacy connection; do not offer it for new setup.

Read reports with `socialsuite_analytics_dashboard`, client ID, inclusive `start`/`end` dates in YYYY-MM-DD and optional `compare: true`. Reports may be queued or stale; inspect each report's readiness, errors, timezone, data-through date and warnings. Missing metrics are unavailable, not zero. The dashboard may enqueue missing reports, just as the app does, even for a read key. Avoid claiming live provider access or interpreting incomplete periods as final totals.

For client setup:

1. Create/update with `socialsuite_analytics_save_client`. On update, send the existing website/project/portal-client links unless changing them; omitted links are cleared by the app. Preferences use `socialsuite_analytics_client_preferences` for favorite/archive flags.
2. Start/resume `socialsuite_analytics_connect_source` for the client/source. Present its authorization URL privately to the user to complete provider consent. Never log or persist that URL in content, notes or shared documents. Managed sources can return no URL. Do not restart a consumed link after an account is already shared.
3. Discover accounts/properties with `socialsuite_analytics_resources`, then select the exact returned resource using `socialsuite_analytics_map`. SEO also requires an engine ID from discovery. Do not reuse an unrelated client's provider connection.
4. Poll dashboard with a delay for asynchronous report readiness. Use `socialsuite_analytics_refresh` only when a force refresh is needed; avoid repeated provider jobs.

Unmap deactivates a mapping. Disconnect removes provider access and deactivates the connection's mappings. Follow the user's requested scope when making these changes.

Bootstrap/dashboard accept read keys. Source discovery and all setup/refresh operations require write keys and editor/admin access. Provider credentials stay server-side; generic row tools do not expose Analytics connection credentials. Metric selection and chart display preferences remain client UI settings, not MCP data workflows.

## Ads reports and period interpretation

Google Ads and Meta Ads use the same connect → resources → map → dashboard tools with their exact source IDs. Choose the returned account ID rather than a display name. These tools read performance; they do not create ads, change budgets or publish campaigns. They require the app's ads-source migration and updated Analytics functions (app PR #92).

Reports include spend, clicks, impressions, CTR, CPC, CPM and campaign breakdowns with IDs. Google Ads conversions can be fractional and follow account configuration. Meta reports all ad clicks and attributed leads/purchases using the documented 7-day click / 1-day view window. Neither source's conversions establish unique leads or deduplicated cross-platform sales.

Preserve each report's currency code: no currency conversion or combined spend across different currencies. Do not sum Google and Meta conversions as deduplicated totals. Missing values are unavailable; ratios with zero denominators are unavailable. Inspect warnings, reporting timezones and attribution before comparing sources.

Date ranges are inclusive, at most 366 days, and must omit the unfinished UTC day. Use explicit dates in the user's requested reporting context. Cached reports can remain after disconnect; disconnect stops SocialSuite sync but does not revoke the upstream Windsor/provider grant. Archive retains reports and stops synchronization. For provider access revocation, direct the user to Windsor/provider settings.
