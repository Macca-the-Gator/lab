# Instagram token maintenance (Macca)

Macca keeps **INSTAGRAM_ACCESS_TOKEN** for its existing Instagram Login/Page-token access and uses an independent **INSTAGRAM_AUDIO_ACCESS_TOKEN** (Facebook Login user token) for Reels with Instagram catalog MUSIC.

## Supported token types

- **Instagram Login long-lived token (~60 days):** refresh via graph.instagram.com/refresh_access_token, validate the same account and update INSTAGRAM_ACCESS_TOKEN in Macca-the-Gator/lab Actions Secrets on the 1st and 15th each month. The token must be eligible and over 24 hours old.
- **Facebook Page access token (often without expiry):** validate it belongs to the configured Macca Page and preserve it. The Instagram Login refresh endpoint cannot refresh Facebook Page tokens. A revoked token requires attention.
- **Facebook Login user token for music:** the separate `INSTAGRAM_AUDIO_ACCESS_TOKEN` is checked twice monthly. An eligible short-lived token can be exchanged for a roughly 60-day token. An existing long-lived Facebook user token may **not** be renewable indefinitely; when Meta refuses to increase expiration, the script fails without overwriting the current secret and requires a new authorization.

## One-time setup after merge

Create a fine-grained GitHub PAT with Secrets **Read and write** on **Macca-the-Gator/lab** and store it as Actions Secret **INSTAGRAM_TOKEN_ROTACION**. The workflow uses this only when replacing a token after verified rotation. Keep `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_AUDIO_ACCESS_TOKEN` separate. `INSTAGRAM_APP_SECRET` is **optional for publishing**; it is needed only if you want Meta to attempt expiry inspection/automatic exchange of the separate Facebook user token. Without it, the workflow preserves the current token and logs a warning instead of blocking the established publisher. Optionally define Actions variable `INSTAGRAM_AUDIO_APP_ID` if Meta `/app` cannot determine its issuing app.

The PAT must have access to the original Macca repository. A PAT restricted to PkLavc/lab does not grant rights to Macca-the-Gator/lab; fork Secrets are not copied to upstream.

After the PR is merged, use **Actions → Maintain Instagram publishing token → Run workflow → preflight** to validate both tokens without renewing. The Instagram Login preflight checks GitHub Secrets read/write using a disposable secret. `renew` and scheduled runs attempt both rotations independently. When `INSTAGRAM_APP_SECRET` is available and the catalog token is verified, the Facebook script checks expiry with Meta and attempts an exchange at 30 or fewer days remaining; it updates Secrets only when the new expiry genuinely increased. A blocked catalog query or missing App Secret leaves the secret unchanged and does **not** disable the already working Instagram publishing token. The Instagram token maintenance recognizes `/me` as possibly returning a Facebook *user* ID rather than the Page ID.

If Meta or GitHub refuses a renewal, the workflow reports failure before replacing the token. Facebook Login user tokens may require new interactive authorization; these are **not** guaranteed perpetual refresh tokens. Do not place tokens in commits, PRs, issues, or logs.

This workflow uses Python standard library and the preinstalled GitHub CLI; no extra paid services are required.
