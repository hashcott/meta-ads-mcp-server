# Meta Ads MCP Server

<p align="center">
  <a href="https://www.npmjs.com/package/meta-ads-mcp-server"><img src="https://img.shields.io/npm/v/meta-ads-mcp-server?style=flat-square&color=blue&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/meta-ads-mcp-server"><img src="https://img.shields.io/npm/dm/meta-ads-mcp-server?style=flat-square&color=green" alt="npm downloads" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square&logo=node.js&logoColor=white" alt="Node.js version" /></a>
  <a href="https://developers.facebook.com/docs/graph-api"><img src="https://img.shields.io/badge/Meta%20Graph%20API-v22.0-0866FF?style=flat-square&logo=meta&logoColor=white" alt="Meta Graph API" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-7C3AED?style=flat-square" alt="MCP compatible" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License" /></a>
  <a href="https://github.com/hashcott/meta-ads-mcp/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/hashcott/meta-ads-mcp/ci.yml?style=flat-square&label=CI" alt="CI status" /></a>
</p>

<p align="center">
  A <a href="https://modelcontextprotocol.io">Model Context Protocol</a> server for the <strong>Meta (Facebook) Ads API</strong>, written in TypeScript.<br/>
  <strong>54 tools</strong> — 35 read tools (always on) plus 19 opt-in write/lifecycle tools — covering ad accounts, campaigns, ad sets, ads, creatives, media, insights, targeting catalog, Facebook Pages, budget schedules, and activity logs via the <strong>Meta Graph API v22.0</strong>.
</p>

<p align="center">
  Works with <strong>Cursor</strong>, <strong>Claude Desktop</strong> (stdio) and <strong>Claude.ai</strong> custom connectors (HTTP).
</p>

> **Disclaimer:** This is an unofficial third-party tool and is not associated with, endorsed by, or affiliated with Meta in any way. This project is maintained independently and uses Meta's public APIs in accordance with their [Terms of Service](https://developers.facebook.com/terms/). Meta, Facebook, Instagram, and other Meta brand names are trademarks of their respective owners.

---

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Obtaining a Meta Access Token](#obtaining-a-meta-access-token)
- [Authentication](#authentication)
- [Enabling Write Tools](#enabling-write-tools)
- [Transport Modes](#transport-modes)
- [Cursor / Claude Desktop Setup](#cursor--claude-desktop-setup)
- [Remote HTTP Server](#remote-http-server)
- [Available Tools](#available-tools)
  - [Accounts](#accounts)
  - [Campaigns](#campaigns)
  - [Ad Sets](#ad-sets)
  - [Ads](#ads)
  - [Creatives](#creatives)
  - [Media](#media)
  - [Insights](#insights)
  - [Targeting Catalog](#targeting-catalog)
  - [Pages](#pages)
  - [Budget Schedules](#budget-schedules)
  - [Activities](#activities)
  - [Pagination](#pagination-tool)
- [End-to-End: Create an Ad from Scratch](#end-to-end-create-an-ad-from-scratch)
- [Pagination](#pagination)
- [Development](#development)
- [Project Structure](#project-structure)
- [License](#license)

---

## Features

| Category | What it does |
|----------|--------------|
| **Accounts** | List ad accounts, get account details |
| **Campaigns** | Get / list / create / update / pause / resume / delete |
| **Ad Sets** | Get / list / batch-fetch / create / update / pause / resume / delete |
| **Ads** | Get / list / create / update / pause / resume / delete |
| **Creatives** | Get / list, create + update, compute image crops |
| **Media** | List ad images, upload images, lookup by hash, get ad previews and videos |
| **Insights** | Performance analytics at account, campaign, ad set, and ad level |
| **Targeting** | Search interests / behaviors / demographics / geo, audience size estimation |
| **Pages** | List Facebook Pages reachable from the token, search by name |
| **Budget Schedules** | Schedule temporary budget bumps over a time window |
| **Activities** | Change history log for ad accounts and ad sets |
| **Pagination** | Utility tool to fetch subsequent pages of results |

All mutation tools (create / update / delete / pause / resume / upload / budget schedule) are **off by default** and only register when you opt in — see [Enabling Write Tools](#enabling-write-tools).

---

## Requirements

- **Node.js** >= 18
- A **Meta User Access Token** with the right permissions for what you plan to do — see below.

---

## Installation

```bash
# From npm
npx meta-ads-mcp-server --access-token YOUR_META_ACCESS_TOKEN

# From source
git clone https://github.com/hashcott/meta-ads-mcp.git
cd meta-ads-mcp
npm install
npm run build
node dist/index.js --access-token YOUR_META_ACCESS_TOKEN
```

---

## Obtaining a Meta Access Token

This server uses the **Meta Marketing API**. You need an access token attached to a Meta App that has the right permissions.

### Quick option — Graph API Explorer (read-only experiments)

1. Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Pick your Meta App from the top-right dropdown (create one at [developers.facebook.com/apps](https://developers.facebook.com/apps) if you don't have any — choose type "Business").
3. Click **Generate Access Token**, then under **Permissions** add at minimum:
   - `ads_read` — for all the read tools.
   - `ads_management` — required for any write tool (create / update / delete / pause / resume / upload / budget schedule).
   - `business_management` — recommended if you operate via Business Manager.
   - `pages_show_list`, `pages_read_engagement` — required for the Pages tools.
4. Copy the generated token. **This is a short-lived token (~1 hour)** — fine for testing.
<img width="2070" height="1380" alt="image" src="https://github.com/user-attachments/assets/1bf50e6d-6fa3-44b3-92b3-5f5b296772a7" />

### Production option — long-lived User token

Short-lived tokens from the Explorer expire in about an hour. Exchange yours for a 60-day token:

```bash
curl -G "https://graph.facebook.com/v22.0/oauth/access_token" \
  --data-urlencode "grant_type=fb_exchange_token" \
  --data-urlencode "client_id=YOUR_APP_ID" \
  --data-urlencode "client_secret=YOUR_APP_SECRET" \
  --data-urlencode "fb_exchange_token=YOUR_SHORT_LIVED_TOKEN"
```

Response contains `"access_token": "..."` — that token is valid for ~60 days. Refresh it the same way before it expires, or build a full OAuth flow if you need permanent access.

### Production option — System User token (recommended for servers)

For unattended production use (no expiry), generate a **System User** token in Business Manager:

1. Go to [Business Manager → Business Settings → Users → System Users](https://business.facebook.com/settings/system-users).
2. Create a system user (or use an existing one), assign the relevant ad account, and grant `ads_read` / `ads_management`.
3. Click **Generate New Token** → pick your Meta App → select the same permissions → **Never** for expiration.

System User tokens don't expire and are ideal for backend deployments.

### Verifying your token

```bash
curl "https://graph.facebook.com/v22.0/me?access_token=YOUR_TOKEN"
```

Should return your user/system-user object. If it returns an error, double-check the permissions and that the token isn't expired.

---

## Authentication

Pass your Meta access token using either method:

**CLI argument (recommended for Cursor / Claude Desktop):**
```bash
node dist/index.js --access-token YOUR_META_ACCESS_TOKEN
```

**Environment variable:**
```bash
export META_ADS_ACCESS_TOKEN=YOUR_META_ACCESS_TOKEN
node dist/index.js
```

The token is held only in memory of the running process — it is never written to disk by this server.

---

## Enabling Write Tools

By default the server registers **only the 35 read tools** — create / update / delete / pause / resume / upload / budget-schedule tools are **not exposed**. This is intentional: a mistakenly-issued `meta_ads_delete_campaign` can permanently remove campaigns and their ads.

To opt in, set:

```bash
META_ADS_ENABLE_WRITE_TOOLS=true
```

Accepted truthy values: `true`, `1`, `yes`, `on` (case-insensitive). Anything else (or unset) keeps writes off.

When enabled, the server logs a one-line warning to stderr at startup:

```
[meta-ads-mcp] WARNING: META_ADS_ENABLE_WRITE_TOOLS is on — create/update/delete/pause/resume tools are EXPOSED. These can permanently delete campaigns/ad sets/ads or change live delivery.
```

Your access token also needs the `ads_management` permission for the writes to succeed.

Example Cursor / Claude Desktop configuration with writes enabled:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["-y", "meta-ads-mcp-server"],
      "env": {
        "META_ADS_ACCESS_TOKEN": "YOUR_META_ACCESS_TOKEN",
        "META_ADS_ENABLE_WRITE_TOOLS": "true"
      }
    }
  }
}
```

---

## Transport Modes

| Mode | Use case | How to enable |
|------|----------|---------------|
| `stdio` *(default)* | Cursor, Claude Desktop, local tools | No configuration needed |
| `http` | Claude.ai remote connectors, multi-client setups | Set `TRANSPORT=http` |

---

## Cursor / Claude Desktop Setup

Add one of the following to your MCP client configuration file:

**Via npx (recommended — no local install required):**
```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["-y", "meta-ads-mcp-server", "--access-token", "YOUR_META_ACCESS_TOKEN"]
    }
  }
}
```

**Via local build:**
```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "node",
      "args": ["/path/to/meta-ads-mcp/dist/index.js", "--access-token", "YOUR_META_ACCESS_TOKEN"]
    }
  }
}
```

**Via environment variable (and opt-in writes):**
```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["-y", "meta-ads-mcp-server"],
      "env": {
        "META_ADS_ACCESS_TOKEN": "YOUR_META_ACCESS_TOKEN",
        "META_ADS_ENABLE_WRITE_TOOLS": "true"
      }
    }
  }
}
```

---

## Remote HTTP Server

Run as a persistent HTTP server for use with Claude.ai custom connectors or any remote MCP client.

```bash
# Start on default port 3000
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN node dist/index.js

# Start on a custom port, writes enabled
TRANSPORT=http \
  META_ADS_ACCESS_TOKEN=YOUR_TOKEN \
  META_ADS_ENABLE_WRITE_TOOLS=true \
  PORT=8080 \
  node dist/index.js
```

**Endpoints:**
- `POST /mcp` — MCP protocol endpoint
- `GET /health` — Health check (`{"status":"ok"}`)

### Adding to Claude.ai

1. Go to **Settings → Connectors → Add custom connector**
2. Enter your server URL: `https://your-domain.com/mcp`
3. Click **Add**

### Local testing with ngrok

```bash
# Terminal 1 — start the server
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN PORT=8080 node dist/index.js

# Terminal 2 — expose publicly
ngrok http 8080
```

Use the generated HTTPS URL (e.g. `https://xxxx.ngrok-free.app/mcp`) as your connector URL.

### Deploying to cloud platforms

Set the following environment variables on your hosting provider (Railway, Render, Fly.io, etc.):

| Variable | Value |
|----------|-------|
| `TRANSPORT` | `http` |
| `META_ADS_ACCESS_TOKEN` | Your Meta access token |
| `META_ADS_ENABLE_WRITE_TOOLS` | `true` to also expose mutating tools (off by default) |
| `PORT` | Assigned automatically by the platform |

---

## Available Tools

Legend: 🔍 read • ✏️ write (gated by `META_ADS_ENABLE_WRITE_TOOLS`) • 🛠️ pure utility (no API call).

### Accounts

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_list_ad_accounts` | 🔍 | List all ad accounts accessible with your token |
| `meta_ads_get_ad_account_details` | 🔍 | Get detailed information for a specific ad account |

### Campaigns

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_campaign_by_id` | 🔍 | Fetch a specific campaign by its ID |
| `meta_ads_get_campaigns_by_adaccount` | 🔍 | List campaigns within an ad account, with filters and pagination |
| `meta_ads_create_campaign` | ✏️ | Create a new ODAX campaign (CBO or ABO) |
| `meta_ads_update_campaign` | ✏️ | Update name/status/budget/bid; supports CBO → ABO migration via `adset_budgets` |
| `meta_ads_delete_campaign` | ✏️ | Permanently delete a campaign and its ad sets/ads |
| `meta_ads_pause_campaign` | ✏️ | Convenience: set status to `PAUSED` |
| `meta_ads_resume_campaign` | ✏️ | Convenience: set status to `ACTIVE` |

**`meta_ads_create_campaign` inputs:**

- `act_id` *(string)* — Ad account ID, format `act_XXXXXXXXX`.
- `name` *(string)* — Campaign name.
- `objective` *(enum)* — ODAX outcome-based objective:
  - `OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_APP_PROMOTION`.
  - Legacy objectives (`BRAND_AWARENESS`, `LINK_CLICKS`, `CONVERSIONS`, `APP_INSTALLS`, …) are **not** accepted by Meta v22+ and will return HTTP 400.
- `status` *(default `PAUSED`)*, `special_ad_categories` *(default `[]`)*
- `daily_budget` / `lifetime_budget` *(cents)* — omit both when `use_adset_level_budgets=true`.
- `bid_strategy` — `LOWEST_COST_WITHOUT_CAP` (default), `LOWEST_COST_WITH_BID_CAP`, `COST_CAP`, `LOWEST_COST_WITH_MIN_ROAS`. Bid-cap strategies require `bid_amount` on every child ad set.
- `bid_cap`, `spend_cap`, `campaign_budget_optimization`, `use_adset_level_budgets`, `ab_test_control_setups`, `buying_type`.

```json
{
  "act_id": "act_123456789012345",
  "name": "2026 - Spring Sale - Awareness",
  "objective": "OUTCOME_AWARENESS",
  "special_ad_categories": [],
  "status": "PAUSED",
  "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
  "daily_budget": 10000
}
```

### Ad Sets

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_adset_by_id` | 🔍 | Fetch a single ad set by its ID |
| `meta_ads_get_adsets_by_ids` | 🔍 | Batch fetch multiple ad sets |
| `meta_ads_get_adsets_by_adaccount` | 🔍 | List ad sets in an ad account |
| `meta_ads_get_adsets_by_campaign` | 🔍 | List ad sets within a campaign |
| `meta_ads_create_adset` | ✏️ | Create a new ad set under a campaign |
| `meta_ads_update_adset` | ✏️ | Update an ad set's fields (note: `frequency_control_specs` is immutable after creation) |
| `meta_ads_delete_adset` | ✏️ | Permanently delete an ad set |
| `meta_ads_pause_adset` | ✏️ | Set status to `PAUSED` |
| `meta_ads_resume_adset` | ✏️ | Set status to `ACTIVE` |

**`meta_ads_create_adset` highlights:**

- Required: `act_id`, `campaign_id`, `name`, `optimization_goal`, `billing_event`.
- `targeting` *(object)* — full targeting spec; remember `targeting_automation.advantage_audience` defaults to `0` on Meta v24+ — set it explicitly if you want Advantage+ Audience.
- `bid_amount` — required for `LOWEST_COST_WITH_BID_CAP` / `COST_CAP`.
- `bid_constraints` — required for `LOWEST_COST_WITH_MIN_ROAS`, e.g., `{"roas_average_floor": 20000}` for a 2.0× ROAS floor.
- `dsa_beneficiary` / `dsa_payor` — required for EU-targeted ad sets.
- `promoted_object` — required for `APP_INSTALLS`.
- `frequency_control_specs` — MUST be set at creation; Meta makes it immutable afterward.
- `regional_regulated_categories` / `regional_regulation_identities` — Taiwan / Australia / Singapore / India regulated verticals.

### Ads

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_ad_by_id` | 🔍 | Fetch a single ad by ID |
| `meta_ads_get_ads_by_adaccount` | 🔍 | List ads in an ad account |
| `meta_ads_get_ads_by_campaign` | 🔍 | List ads within a campaign |
| `meta_ads_get_ads_by_adset` | 🔍 | List ads within an ad set |
| `meta_ads_create_ad` | ✏️ | Create a new ad referencing an existing creative |
| `meta_ads_update_ad` | ✏️ | Update name / status / bid / tracking specs / creative reference |
| `meta_ads_delete_ad` | ✏️ | Permanently delete an ad |
| `meta_ads_pause_ad` | ✏️ | Set status to `PAUSED` |
| `meta_ads_resume_ad` | ✏️ | Set status to `ACTIVE` |

> ℹ️ Swapping `creative_id` on a FLEX ad can fail with `error_subcode 3858355` if the new creative's `asset_feed_spec` images don't match its `object_story_spec`. In that case, create a new ad with the new creative and pause the old one (you lose social proof but the ad runs).

### Creatives

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_ad_creative_by_id` | 🔍 | Fetch one creative |
| `meta_ads_get_ad_creatives_by_ad_id` | 🔍 | List creatives attached to an ad |
| `meta_ads_get_adcreatives_by_adaccount` | 🔍 | List creatives in an ad account |
| `meta_ads_compute_image_crops` | 🛠️ | Compute centered crop boxes for the 6 Meta-accepted aspect ratios (no API call) |
| `meta_ads_create_ad_creative` | ✏️ | Create a creative — 3 simple modes plus full `object_story_spec` escape hatch |
| `meta_ads_update_ad_creative` | ✏️ | Update `name` / `asset_feed_spec` (Meta restricts most other content updates) |

**`meta_ads_create_ad_creative` — three common modes:**

1. **Promote an existing post**: pass only `object_story_id` in the form `{page_id}_{post_id}`.
2. **Single-image link ad**: `page_id` + `image_hash` + `link_url` + `message` + optional `headline`, `description`, `call_to_action_type`.
3. **Single-video ad**: `page_id` + `video_id` + `link_url` + `message` + optional `headline`, `call_to_action_type`, `thumbnail_url`.

For advanced layouts (FLEX/DOF, Placement Asset Customization, Dynamic Creative, multi-headline, lead-gen forms, branded content, image crops), pass a fully composed `object_story_spec` and/or `asset_feed_spec` — those take precedence over the simple-mode auto-construction.

### Media

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_ad_images` | 🔍 | List image assets in an ad account |
| `meta_ads_get_image_by_hash` | 🔍 | Single-image lookup by hash (URL + dimensions) |
| `meta_ads_get_ad_previews` | 🔍 | Generate rendered previews of an ad across placements |
| `meta_ads_get_ad_video` | 🔍 | Video details (source URL, thumbnails, length) by `ad_id` or `video_id` |
| `meta_ads_upload_ad_image` | ✏️ | Upload an image to an account's ad images library and get back its `image_hash` |

**`meta_ads_upload_ad_image`** accepts **exactly one** of:

- `file` — a data URL (`data:image/png;base64,iVBORw0KG...`) or a raw base64 string.
- `image_url` — a public URL; the server downloads the bytes and uploads them.

Returns the `image_hash` you then pass to `meta_ads_create_ad_creative`.

### Insights

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_adaccount_insights` | 🔍 | Performance metrics at the account level |
| `meta_ads_get_campaign_insights` | 🔍 | Performance metrics for a specific campaign |
| `meta_ads_get_adset_insights` | 🔍 | Performance metrics for a specific ad set |
| `meta_ads_get_ad_insights` | 🔍 | Performance metrics for a specific ad |

All four accept the same option surface: `fields`, `date_preset`, `time_range`, `time_ranges`, `time_increment`, `level`, `action_attribution_windows`, `action_breakdowns`, `breakdowns`, `filtering`, `sort`, pagination, and locale.

Time-range precedence: `time_ranges` > `time_range` > `since`/`until` > `date_preset`.

### Targeting Catalog

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_search_interests` | 🔍 | Search Meta's interest catalog by keyword |
| `meta_ads_get_interest_suggestions` | 🔍 | Get related interests from a seed list |
| `meta_ads_search_behaviors` | 🔍 | List available behavior targeting options |
| `meta_ads_search_demographics` | 🔍 | List demographic options (demographics / life_events / industries / income / family_statuses / user_device / user_os) |
| `meta_ads_search_geo_locations` | 🔍 | Search countries / regions / cities / zips / geo_markets / electoral_districts |
| `meta_ads_estimate_audience_size` | 🔍 | Estimate reach for a targeting spec via `/act_X/delivery_estimate` |

### Pages

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_account_pages` | 🔍 | List Facebook Pages reachable from the access token (`/me/accounts`) |
| `meta_ads_search_pages_by_name` | 🔍 | Substring filter over the token's pages (client-side — Meta does not expose a server-side name filter) |

The returned `page_id` values are the ones you pass to `meta_ads_create_ad_creative`.

### Budget Schedules

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_create_budget_schedule` | ✏️ | Schedule a temporary budget bump for a campaign over a Unix-timestamp window |

Inputs:

- `campaign_id` *(string)*
- `budget_value` *(int, positive)*
- `budget_value_type` — `ABSOLUTE` (cents in account currency) or `MULTIPLIER` (e.g., `2` doubles the budget)
- `time_start`, `time_end` *(Unix timestamps in seconds)* — `time_end > time_start`

### Activities

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_get_activities_by_adaccount` | 🔍 | Retrieve the change history log for an ad account |
| `meta_ads_get_activities_by_adset` | 🔍 | Retrieve the change history log for an ad set |

### Pagination tool

| Tool | Type | Description |
|------|------|-------------|
| `meta_ads_fetch_pagination_url` | 🛠️ | Follow `paging.next` / `paging.previous` URLs from any other tool's response |

---

## End-to-End: Create an Ad from Scratch

A typical "build a new ad" workflow uses tools across several categories. With `META_ADS_ENABLE_WRITE_TOOLS=true`:

```
1. meta_ads_list_ad_accounts                       → pick an act_id
2. meta_ads_get_account_pages                      → pick a page_id
3. meta_ads_search_geo_locations(q="Vietnam")      → grab the country/region keys
4. meta_ads_search_interests(q="cooking")          → grab interest IDs
5. meta_ads_estimate_audience_size(act_id, targeting)  → sanity-check reach
6. meta_ads_upload_ad_image(act_id, image_url)     → returns image_hash
7. meta_ads_create_campaign(act_id, ...)           → returns campaign_id
8. meta_ads_create_adset(act_id, campaign_id, targeting, ...)  → returns adset_id
9. meta_ads_create_ad_creative(act_id, page_id, image_hash, link_url, message, ...)  → returns creative_id
10. meta_ads_create_ad(act_id, name, adset_id, creative_id, status="PAUSED")  → returns ad_id
11. (Optional) meta_ads_get_ad_previews(ad_id, ...)  → render placements before going live
12. meta_ads_resume_ad(ad_id)                       → flip to ACTIVE when ready
```

All steps that mutate state default to `status: "PAUSED"` so nothing goes live until you explicitly call a resume tool.

---

## Pagination

Many list tools return paginated results. When a response contains a `paging.next` URL, use `meta_ads_fetch_pagination_url` to retrieve subsequent pages:

```
1. Call meta_ads_get_campaigns_by_adaccount  →  receive first page
2. Check if response.paging.next exists
3. Call meta_ads_fetch_pagination_url(url=response.paging.next)  →  receive next page
4. Repeat until paging.next is absent
```

---

## Development

```bash
npm run dev              # Watch mode — auto-recompile on change
npm run build            # Compile TypeScript to dist/
npm run clean            # Remove dist/
npm run clean && npm run build   # Full rebuild from scratch
```

Quick smoke test:

```bash
# Default (read-only)
META_ADS_ACCESS_TOKEN=dummy node dist/index.js
# → "Meta Ads MCP server running via stdio"

# With writes enabled
META_ADS_ACCESS_TOKEN=dummy META_ADS_ENABLE_WRITE_TOOLS=true node dist/index.js
# → WARNING line + "Meta Ads MCP server running via stdio"
```

---

## Project Structure

```
meta-ads-mcp/
├── src/
│   ├── index.ts                  # Entry point, server setup, transport selection, write-tools warning
│   ├── constants.ts              # API version, base URLs, isWriteToolsEnabled() flag
│   ├── types.ts                  # Shared TypeScript interfaces
│   ├── services/
│   │   └── graph-api.ts          # HTTP client (GET/POST/DELETE), auth, error handling, param builders
│   ├── schemas/
│   │   ├── common.ts             # Shared Zod schemas (pagination, date ranges, filters)
│   │   └── insights.ts           # Insights-specific Zod schemas
│   └── tools/
│       ├── accounts.ts           # Account tools
│       ├── insights.ts           # Insights tools (account/campaign/adset/ad level)
│       ├── campaigns.ts          # Campaign read + write/lifecycle tools
│       ├── adsets.ts             # Ad set read + write/lifecycle tools
│       ├── ads.ts                # Ad read + write/lifecycle tools
│       ├── creatives.ts          # Creative read tools, image crops utility, create/update creative
│       ├── media.ts              # Image list / upload / hash lookup / video / preview
│       ├── activities.ts         # Activity log tools
│       ├── pagination.ts         # Pagination utility tool
│       ├── targeting.ts          # Interest/behavior/demographic/geo search + audience-size estimate
│       ├── pages.ts              # Facebook Pages list and name search
│       └── budget-schedules.ts   # Campaign budget schedule create
├── dist/                         # Compiled JavaScript output (generated)
├── package.json
└── tsconfig.json
```

---

## License

[MIT](LICENSE) © [hashcott](https://github.com/hashcott)
