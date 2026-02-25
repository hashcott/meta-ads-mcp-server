#!/usr/bin/env node
/**
 * Meta Ads MCP Server
 *
 * MCP server for the Meta (Facebook) Ads API. Provides 24 tools to manage and
 * analyze ad accounts, campaigns, ad sets, ads, creatives, media assets, insights,
 * and activity logs via the Meta Graph API v22.0.
 *
 * Usage:
 *   node dist/index.js --access-token <YOUR_META_ACCESS_TOKEN>
 *   META_ADS_ACCESS_TOKEN=<token> node dist/index.js
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAccountTools } from "./tools/accounts.js";
import { registerInsightsTools } from "./tools/insights.js";
import { registerCampaignTools } from "./tools/campaigns.js";
import { registerAdSetTools } from "./tools/adsets.js";
import { registerAdTools } from "./tools/ads.js";
import { registerCreativeTools } from "./tools/creatives.js";
import { registerMediaTools } from "./tools/media.js";
import { registerActivityTools } from "./tools/activities.js";
import { registerPaginationTools } from "./tools/pagination.js";
import { getAccessToken } from "./services/graph-api.js";

const server = new McpServer({
  name: "meta-ads-mcp-server",
  version: "1.0.0",
});

registerAccountTools(server);
registerInsightsTools(server);
registerCampaignTools(server);
registerAdSetTools(server);
registerAdTools(server);
registerCreativeTools(server);
registerMediaTools(server);
registerActivityTools(server);
registerPaginationTools(server);

async function main(): Promise<void> {
  try {
    getAccessToken();
  } catch (err) {
    console.error((err as Error).message);
    console.error(
      "Usage: node dist/index.js --access-token <YOUR_META_ACCESS_TOKEN>"
    );
    console.error(
      "   or: META_ADS_ACCESS_TOKEN=<token> node dist/index.js"
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Meta Ads MCP server running via stdio");
}

main().catch((error: unknown) => {
  console.error("Server startup error:", error);
  process.exit(1);
});
