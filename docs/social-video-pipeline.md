# Macca social video pipeline

## Rendering

`src/youtube/shorts.py` renders one shared vertical MP4 from article data already stored in `blog/posts.json`; it does not call an AI service at render time. Kokoro is the primary local narrator and eSpeak NG remains the fallback. The first spoken line is the story hook/title rather than generic channel branding. Output is H.264/AAC at 1080x1920/30 FPS and is constrained to 15–20 seconds. The same module also generates an original 1280x720 YouTube thumbnail. The CTA points viewers to Macca Blog through the profile/channel links.

The GitHub Actions workflow renders each queued article once into `$RUNNER_TEMP/macca-social-videos`. YouTube reuses that file. Instagram gets a separate MP4 without narration, hosted temporarily by GitHub Releases, and a compatible Facebook Login user token supplies catalog MUSIC. If music or staging fails, the item remains queued. No MP4 is committed or stored in Cloudflare.

To roll back YouTube rendering while validating, set the GitHub repository variable `SHORTS_RENDERER` to `legacy`. Unset it (or set it to `narrated`) to use the new renderer. In legacy mode the YouTube renderer changes, but Instagram still uses temporary GitHub MP4 hosting (no image fallback).

## Optional licensed music

Put only licensed tracks in `assets/audio/shorts/`. The renderer works with an empty folder. If licensed tracks are present, it selects one and normalizes it to approximately 16 dB below the narration. Set `SHORTS_MUSIC_PATH` for a deterministic local choice.

## Instagram Reels: temporary GitHub Releases, no R2

The hourly article lane renders the Macca format with 1080×1920, H.264/AAC, and normal YouTube narration. A separate Instagram video has no spoken audio: Meta is asked to attach a relevant licensed **MUSIC** track using a Facebook Login user token (not `original_sound`). The Rockstar-media lane follows the same transport and music policy, without changing its separate publishing schedule or YouTube output.

The GitHub Actions `GITHUB_TOKEN` (job permission `contents: write`) creates a short-lived public Release in **Macca-the-Gator/lab** using a `macca-ig-reel-` prefix. The Meta `video_url` container can download the MP4, after which the workflow publishes the Reel and immediately deletes the Release and tag. An independent hourly/scheduled cleanup removes prefixed releases older than three hours after interrupted runs. Other releases are not touched. No Cloudflare R2 tokens, paid object storage or MEGA are used.

The publisher uses the original, previously functioning Instagram credential, not the music-catalog token, for creating and publishing Reel containers. The API's response must confirm `media_audio_type=MUSIC` after publishing. If Meta reports `ORIGINAL_SOUND` or the music catalog is unavailable, the workflow flags an error. A successfully published media ID is still recorded to avoid duplicates, even when metadata is incorrect. Search uses several pages and excludes unrelated generic/holiday music instead of blindly using the first item.

**Existing publishing secret:** `INSTAGRAM_ACCESS_TOKEN`; this remains the credential used for actually posting Reels. **Optional music-catalog secret:** `INSTAGRAM_AUDIO_ACCESS_TOKEN`; if its music catalog access is rejected, the code tries the existing publishing token instead. `INSTAGRAM_APP_SECRET` is needed only for Facebook token expiry inspection/exchange, **not** for publishing. `INSTAGRAM_TOKEN_ROTACION` is used only when a token is eligible for safe GitHub Secret rotation. `GITHUB_TOKEN` is automatic and must have `contents: write` for the publishing jobs. Optionally define `INSTAGRAM_AUDIO_APP_ID` as an Actions variable if `/app` does not resolve the issuing Meta app.

Facebook user tokens cannot be guaranteed to renew indefinitely. The rotation workflow checks expiry on the 1st and 15th each month, tries Meta's long-lived exchange only when 30 or fewer days remain, verifies the new expiry **and** music access, and overwrites the secret only when expiration really increased. When Meta demands reauthentication, the workflow fails explicitly; manual Facebook Login authorization is needed. The separate Instagram token rotation is unchanged.

**Before approval:** this branch contains offline tests and workflow configuration only; real token, video-URL hosting, music assignment and published-Reel verification should be tested after the PR is approved and merged.
## Optional YouTube Analytics

Upload credentials remain in `src/youtube/auth.py` with the existing `youtube.upload` scope. Analytics uses a separate module and the additional GitHub secret `YOUTUBE_ANALYTICS_REFRESH_TOKEN`; no code replaces or modifies `YOUTUBE_REFRESH_TOKEN`.

Authorize a separate long-lived OAuth refresh token for the same Google user with `https://www.googleapis.com/auth/yt-analytics.readonly`, using the existing client ID and client secret. Add it as `YOUTUBE_ANALYTICS_REFRESH_TOKEN`. The hourly `youtube-metrics.yml` workflow stores dated cumulative samples, per-day rows, and audience-retention snapshots under `blog/youtube-metrics.json`. After at least 20 usable social-performance observations exist, the blog's topic ranking applies a bounded historical-performance bonus so tiny early samples cannot dominate editorial selection.

YouTube Analytics reports the main content metrics by calendar date, so the collector no longer labels them as exact rolling 6h/24h/72h measurements. Audience retention is collected separately at roughly 24 and 72 hours with `elapsedVideoTimeRatio`, `audienceWatchRatio`, and relative retention when the API has data. Extreme rewatch/reporting outliers are flagged and excluded from automatic learning.

## Safe local render test

Run `python -m unittest discover -s tests -p 'test_shorts.py' -v`. The test uses Windows speech locally when available, or a non-publishing test audio stub elsewhere, writes its MP4 under a temporary directory, and checks codec, resolution, frame rate, audio, and duration. It does not invoke Instagram or YouTube APIs.


## Instagram performance feedback

`.github/workflows/instagram-metrics.yml` collects aggregate Reel insights every six hours when the existing professional-account token permits the requested metrics. Samples are written to `blog/instagram-metrics.json`. The blog topic scorer can combine those aggregate results with YouTube performance only after the minimum sample threshold is met.

## Weekly long-form recap

`.github/workflows/youtube-weekly.yml` publishes one horizontal weekly recap from recent Macca Blog stories. It uses the existing local narration stack and original Macca artwork. The description contains direct article URLs, which gives the channel a clickable path back to Macca Blog that Shorts descriptions cannot reliably provide.
