# Meta Ads MCP Server

<p align="center">
  <img src="https://img.shields.io/npm/v/meta-ads-mcp-server?style=flat-square&color=blue&label=npm" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/meta-ads-mcp-server?style=flat-square&color=green" alt="npm downloads" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-brightgreen?style=flat-square&logo=node.js" alt="Node.js version" />
  <img src="https://img.shields.io/badge/Meta%20Graph%20API-v22.0-blue?style=flat-square&logo=meta" alt="Meta Graph API" />
  <img src="https://img.shields.io/badge/MCP-compatible-purple?style=flat-square" alt="MCP compatible" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="license" />
  <img src="https://img.shields.io/github/actions/workflow/status/hashcott/meta-ads-mcp/ci.yml?style=flat-square&label=CI" alt="CI status" />
</p>

<p align="center">
  MCP (Model Context Protocol) server for the <strong>Meta (Facebook) Ads API</strong>, written in TypeScript.<br/>
  Provides <strong>24 tools</strong> to manage and analyze ad accounts, campaigns, ad sets, ads, creatives, insights, and activity logs via the Meta Graph API v22.0.
</p>

<p align="center">
  Supports <strong>local stdio</strong> (Cursor / Claude Desktop) and <strong>remote HTTP</strong> (Claude.ai custom connectors).
</p>

---

## Features

| Category | Tools |
|----------|-------|
| **Accounts** | List ad accounts, get account details |
| **Insights** | Performance analytics at account, campaign, ad set, and ad level |
| **Campaigns** | Get by ID, list by ad account (with filtering/pagination) |
| **Ad Sets** | Get by ID, batch lookup, list by ad account/campaign |
| **Ads** | Get by ID, list by ad account/campaign/ad set |
| **Creatives** | Get creative details, list creatives by ad or by ad account |
| **Media** | List ad images, generate ad previews across placements |
| **Activities** | Change history for ad accounts and ad sets |
| **Pagination** | Utility to fetch paginated result pages |

---

## Requirements

- **Node.js** >= 18
- A Meta (Facebook) Access Token with `ads_read` permission

---

## Transport Modes

| Mode | Use case | How to enable |
|------|----------|---------------|
| `stdio` *(default)* | Cursor, Claude Desktop, local tools | Default — no config needed |
| `http` | Claude.ai remote connectors, multi-client | `TRANSPORT=http` env var |

---

## Installation

```bash
npm install
npm run build
```

---

## Authentication

Generate a Meta User Access Token from the [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/) with at minimum the `ads_read` permission.

**CLI argument:**
```bash
node dist/index.js --access-token YOUR_META_ACCESS_TOKEN
```

**Environment variable:**
```bash
export META_ADS_ACCESS_TOKEN=YOUR_META_ACCESS_TOKEN
node dist/index.js
```

---

## Quick Start with npx

```bash
npx meta-ads-mcp-server --access-token YOUR_META_ACCESS_TOKEN
```

---

## Remote HTTP Server

```bash
# Default port 3000
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN node dist/index.js

# Custom port
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN PORT=8080 node dist/index.js
```

**Endpoints:**
- `POST /mcp` — MCP protocol endpoint
- `GET /health` — Health check (`{"status":"ok"}`)

### Claude.ai Custom Connector

1. Go to **Settings → Connectors → Add custom connector**
2. Set URL to: `https://your-domain.com/mcp`
3. Click **Add**

### Local testing with ngrok

```bash
# Terminal 1 — start the server
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN PORT=8080 node dist/index.js

# Terminal 2 — expose via ngrok
ngrok http 8080
```

Use the ngrok HTTPS URL (e.g. `https://xxxx.ngrok-free.app/mcp`) as your connector URL.

### Deploy to cloud

| Variable | Value |
|----------|-------|
| `TRANSPORT` | `http` |
| `META_ADS_ACCESS_TOKEN` | Your Meta access token |
| `PORT` | Assigned by platform (auto) |

---

## Cursor / Claude Desktop Configuration

**Via npx (recommended):**
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

**Via environment variable:**
```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["-y", "meta-ads-mcp-server"],
      "env": {
        "META_ADS_ACCESS_TOKEN": "YOUR_META_ACCESS_TOKEN"
      }
    }
  }
}
```

---

## Available Tools (24)

| Tool | Description |
|------|-------------|
| `meta_ads_list_ad_accounts` | List all ad accounts linked to your token |
| `meta_ads_get_ad_account_details` | Get details for a specific ad account |
| `meta_ads_get_adaccount_insights` | Performance insights for an ad account |
| `meta_ads_get_campaign_insights` | Performance insights for a campaign |
| `meta_ads_get_adset_insights` | Performance insights for an ad set |
| `meta_ads_get_ad_insights` | Performance insights for an individual ad |
| `meta_ads_get_campaign_by_id` | Get a specific campaign by ID |
| `meta_ads_get_campaigns_by_adaccount` | List campaigns in an ad account |
| `meta_ads_get_adset_by_id` | Get a specific ad set by ID |
| `meta_ads_get_adsets_by_ids` | Batch lookup multiple ad sets |
| `meta_ads_get_adsets_by_adaccount` | List ad sets in an ad account |
| `meta_ads_get_adsets_by_campaign` | List ad sets in a campaign |
| `meta_ads_get_ad_by_id` | Get a specific ad by ID |
| `meta_ads_get_ads_by_adaccount` | List ads in an ad account |
| `meta_ads_get_ads_by_campaign` | List ads in a campaign |
| `meta_ads_get_ads_by_adset` | List ads in an ad set |
| `meta_ads_get_ad_creative_by_id` | Get a specific ad creative by ID |
| `meta_ads_get_ad_creatives_by_ad_id` | List creatives for an ad |
| `meta_ads_get_adcreatives_by_adaccount` | List all creatives in an ad account |
| `meta_ads_get_ad_images` | List image assets in an ad account |
| `meta_ads_get_ad_previews` | Generate ad previews across placements |
| `meta_ads_get_activities_by_adaccount` | Change log for an ad account |
| `meta_ads_get_activities_by_adset` | Change log for an ad set |
| `meta_ads_fetch_pagination_url` | Fetch next/previous page of results |

---

## Pagination

Many list tools return paginated results. Use `meta_ads_fetch_pagination_url` to iterate pages:

```
1. meta_ads_get_campaigns_by_adaccount  →  first page
2. response.paging.next exists?  →  meta_ads_fetch_pagination_url(url=response.paging.next)
3. Repeat until no paging.next
```

---

## Development

```bash
npm run dev        # Watch mode — auto-recompile on change
npm run build      # Compile TypeScript
npm run clean      # Remove dist/
npm run clean && npm run build  # Full rebuild
```

---

## Project Structure

```
meta-ads-mcp/
├── src/
│   ├── index.ts              # Entry point
│   ├── constants.ts          # API version, URLs, defaults
│   ├── types.ts              # TypeScript interfaces
│   ├── services/
│   │   └── graph-api.ts      # API client, error handling, param builders
│   ├── schemas/
│   │   ├── common.ts         # Shared Zod schemas (pagination, filtering)
│   │   └── insights.ts       # Insights-specific Zod schemas
│   └── tools/
│       ├── accounts.ts
│       ├── insights.ts
│       ├── campaigns.ts
│       ├── adsets.ts
│       ├── ads.ts
│       ├── creatives.ts
│       ├── media.ts
│       ├── activities.ts
│       └── pagination.ts
├── dist/                     # Compiled JavaScript (after build)
├── package.json
└── tsconfig.json
```

---

## License

[MIT](LICENSE)
