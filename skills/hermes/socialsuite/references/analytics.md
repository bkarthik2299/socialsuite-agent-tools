# Analytics

Use `socialsuite_analytics_bootstrap` to discover workspace clients, connections, active mappings, projects and portal clients. Supported sources are `ga4` (Google Analytics 4), `gsc` (Search Console), `gbp` (Business Profile), and `seo` (Dragon Metrics via Windsor).

Read reports with `socialsuite_analytics_dashboard`, client ID, inclusive `start`/`end` dates in YYYY-MM-DD and optional `compare: true`. Reports may be queued or stale; inspect each report's readiness, errors, timezone, data-through date and warnings. Missing metrics are unavailable, not zero. The dashboard may enqueue missing reports, just as the app does, even for a read key. Avoid claiming live provider access or interpreting incomplete periods as final totals.

For client setup:

1. Create/update with `socialsuite_analytics_save_client`. On update, send the existing website/project/portal-client links unless changing them; omitted links are cleared by the app. Preferences use `socialsuite_analytics_client_preferences` for favorite/archive flags.
2. Start/resume `socialsuite_analytics_connect_source` for the client/source. Present its authorization URL privately to the user to complete provider consent. Never log or persist that URL in content, notes or shared documents. Managed sources can return no URL. Do not restart a consumed link after an account is already shared.
3. Discover accounts/properties with `socialsuite_analytics_resources`, then select the exact returned resource using `socialsuite_analytics_map`. SEO also requires an engine ID from discovery. Do not reuse an unrelated client's provider connection.
4. Poll dashboard with a delay for asynchronous report readiness. Use `socialsuite_analytics_refresh` only when a force refresh is needed; avoid repeated provider jobs.

Unmap deactivates a mapping. Disconnect removes provider access and deactivates the connection's mappings. Follow the user's requested scope when making these changes.

Bootstrap/dashboard accept read keys. Source discovery and all setup/refresh operations require write keys and editor/admin access. Provider credentials stay server-side; generic row tools do not expose Analytics connection credentials. Metric selection and chart display preferences remain client UI settings, not MCP data workflows.
