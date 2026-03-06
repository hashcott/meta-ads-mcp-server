#!/usr/bin/env node
/**
 * Meta Ads MCP Server
 *
 * MCP server for the Meta (Facebook) Ads API. Provides 24 tools to manage and
 * analyze ad accounts, campaigns, ad sets, ads, creatives, media assets, insights,
 * and activity logs via the Meta Graph API v22.0.
 *
 * Usage (stdio):
 *   node dist/index.js --access-token <YOUR_META_ACCESS_TOKEN>
 *   META_ADS_ACCESS_TOKEN=<token> node dist/index.js
 *
 * Usage (remote HTTP):
 *   TRANSPORT=http META_ADS_ACCESS_TOKEN=<token> node dist/index.js
 *   TRANSPORT=http META_ADS_ACCESS_TOKEN=<token> PORT=3000 node dist/index.js
 */

import { createRequire } from "module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
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
  version,
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

async function runStdio(): Promise<void> {
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

async function runHTTP(): Promise<void> {
  try {
    getAccessToken();
  } catch (err) {
    console.error((err as Error).message);
    console.error(
      "Usage: TRANSPORT=http META_ADS_ACCESS_TOKEN=<token> node dist/index.js"
    );
    process.exit(1);
  }

  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "meta-ads-mcp-server", version });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.error(`Meta Ads MCP server running on http://localhost:${port}/mcp`);
  });
}

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHTTP().catch((error: unknown) => {
    console.error("Server startup error:", error);
    process.exit(1);
  });
} else {
  runStdio().catch((error: unknown) => {
    console.error("Server startup error:", error);
    process.exit(1);
  });
}
