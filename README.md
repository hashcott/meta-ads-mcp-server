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
  Provides <strong>24 tools</strong> to manage and analyze ad accounts, campaigns, ad sets, ads, creatives, insights, and activity logs via the <strong>Meta Graph API v22.0</strong>.
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
- [Authentication](#authentication)
- [Transport Modes](#transport-modes)
- [Cursor / Claude Desktop Setup](#cursor--claude-desktop-setup)
- [Remote HTTP Server](#remote-http-server)
- [Available Tools](#available-tools)
- [Pagination](#pagination)
- [Development](#development)
- [Project Structure](#project-structure)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Features

| Category | Description |
|----------|-------------|
| **Accounts** | List ad accounts, get account details |
| **Insights** | Performance analytics at account, campaign, ad set, and ad level |
| **Campaigns** | Get by ID, list by ad account with filtering and pagination |
| **Ad Sets** | Get by ID, batch lookup, list by ad account or campaign |
| **Ads** | Get by ID, list by ad account, campaign, or ad set |
| **Creatives** | Get creative details, list by ad or by ad account |
| **Media** | List ad images, generate ad previews across placements |
| **Activities** | Change history log for ad accounts and ad sets |
| **Pagination** | Utility tool to fetch subsequent pages of results |

---

## Requirements

- **Node.js** >= 18
- A **Meta User Access Token** with at minimum the `ads_read` permission — generate one from the [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)

---

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

Or run directly without installing via **npx**:

```bash
npx meta-ads-mcp-server --access-token YOUR_META_ACCESS_TOKEN
```

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

## Remote HTTP Server

Run as a persistent HTTP server for use with Claude.ai custom connectors or any remote MCP client.

```bash
# Start on default port 3000
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN node dist/index.js

# Start on a custom port
TRANSPORT=http META_ADS_ACCESS_TOKEN=YOUR_TOKEN PORT=8080 node dist/index.js
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
| `PORT` | Assigned automatically by the platform |

---

## Available Tools

<details>
<summary>View all 24 tools</summary>

| Tool | Description |
|------|-------------|
| `meta_ads_list_ad_accounts` | List all ad accounts accessible with your token |
| `meta_ads_get_ad_account_details` | Get detailed information for a specific ad account |
| `meta_ads_get_adaccount_insights` | Retrieve performance insights for an ad account |
| `meta_ads_get_campaign_insights` | Retrieve performance insights for a campaign |
| `meta_ads_get_adset_insights` | Retrieve performance insights for an ad set |
| `meta_ads_get_ad_insights` | Retrieve performance insights for an individual ad |
| `meta_ads_get_campaign_by_id` | Fetch a specific campaign by its ID |
| `meta_ads_get_campaigns_by_adaccount` | List all campaigns within an ad account |
| `meta_ads_get_adset_by_id` | Fetch a specific ad set by its ID |
| `meta_ads_get_adsets_by_ids` | Batch fetch multiple ad sets by their IDs |
| `meta_ads_get_adsets_by_adaccount` | List all ad sets within an ad account |
| `meta_ads_get_adsets_by_campaign` | List all ad sets within a campaign |
| `meta_ads_get_ad_by_id` | Fetch a specific ad by its ID |
| `meta_ads_get_ads_by_adaccount` | List all ads within an ad account |
| `meta_ads_get_ads_by_campaign` | List all ads within a campaign |
| `meta_ads_get_ads_by_adset` | List all ads within an ad set |
| `meta_ads_get_ad_creative_by_id` | Fetch a specific ad creative by its ID |
| `meta_ads_get_ad_creatives_by_ad_id` | List all creatives associated with an ad |
| `meta_ads_get_adcreatives_by_adaccount` | List all creatives within an ad account |
| `meta_ads_get_ad_images` | List image assets in an ad account |
| `meta_ads_get_ad_previews` | Generate rendered previews of an ad across placements |
| `meta_ads_get_activities_by_adaccount` | Retrieve the change history log for an ad account |
| `meta_ads_get_activities_by_adset` | Retrieve the change history log for an ad set |
| `meta_ads_fetch_pagination_url` | Fetch the next or previous page of a paginated result |

</details>

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

---

## Project Structure

```
meta-ads-mcp/
├── src/
│   ├── index.ts              # Entry point, server setup, transport selection
│   ├── constants.ts          # API version, base URLs, default values
│   ├── types.ts              # Shared TypeScript interfaces
│   ├── services/
│   │   └── graph-api.ts      # HTTP client, auth, error handling, param builders
│   ├── schemas/
│   │   ├── common.ts         # Shared Zod schemas (pagination, date ranges, filters)
│   │   └── insights.ts       # Insights-specific Zod schemas
│   └── tools/
│       ├── accounts.ts       # Account tools
│       ├── insights.ts       # Insights tools
│       ├── campaigns.ts      # Campaign tools
│       ├── adsets.ts         # Ad set tools
│       ├── ads.ts            # Ad tools
│       ├── creatives.ts      # Creative tools
│       ├── media.ts          # Image and preview tools
│       ├── activities.ts     # Activity log tools
│       └── pagination.ts     # Pagination utility tool
├── dist/                     # Compiled JavaScript output (generated)
├── package.json
└── tsconfig.json
```

---

## License

[MIT](LICENSE) © [hashcott](https://github.com/hashcott)
