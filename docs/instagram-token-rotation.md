# Instagram token maintenance (Macca)

Macca publishes with the existing **INSTAGRAM_ACCESS_TOKEN**. The change does not modify Reels, queues, publishing scripts, or analytics.

## Supported token types

- **Instagram Login long-lived token (~60 days):** refresh via graph.instagram.com/refresh_access_token, validate the same account and update INSTAGRAM_ACCESS_TOKEN in Macca-the-Gator/lab Actions Secrets on the 1st and 15th each month. The token must be eligible and over 24 hours old.
- **Facebook Page access token (often without expiry):** validate it belongs to the configured Macca Page and preserve it. The Instagram Login refresh endpoint cannot refresh Facebook Page tokens. A revoked token requires attention.
- **Facebook User token:** not a valid substitute for the configured Page token in this automation; no replacement is attempted.

## One-time setup after merge

Only for Instagram Login tokens: create a fine-grained GitHub PAT with Secrets **Read and write** on **Macca-the-Gator/lab**, and store it as Actions Secret **INSTAGRAM_TOKEN_ROTACION** in that repository. INSTAGRAM_ACCESS_TOKEN must already exist there.

The PAT must have access to the original Macca repository. A PAT restricted to PkLavc/lab does not grant rights to Macca-the-Gator/lab; fork Secrets are not copied to upstream.

Run **Actions → Maintain Instagram publishing token → Run workflow → preflight**. It checks authentication and Secrets read/write permissions using a disposable, non-sensitive temporary secret, then deletes it. Renew is the live option; scheduled runs invoke it as well.

If Meta or GitHub refuses an operation, the workflow fails before overwriting the publishing token. Expired/revoked Instagram Login tokens still require manual Meta reauthorization. Do not place token values in commits, issues, or logs.

This workflow uses Python standard library and the preinstalled GitHub CLI; no extra paid services are required.
