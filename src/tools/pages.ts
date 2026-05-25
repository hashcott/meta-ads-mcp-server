import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL } from "../constants.js";
import { getAccessToken, makeGraphApiCall, handleApiError } from "../services/graph-api.js";

const READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const PAGE_FIELDS = "id,name,username,category,fan_count,link,verification_status,picture";

interface PageRecord {
  id?: string;
  name?: string;
  username?: string;
  category?: string;
  fan_count?: number;
  link?: string;
  verification_status?: string;
  picture?: unknown;
}

interface PagedResponse {
  data?: PageRecord[];
}

export function registerPageTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_get_account_pages",
    {
      title: "Get Meta Account Pages",
      description: `List Facebook Pages reachable from the access token's user. These are the
candidate page_id values for create_ad_creative.

Args:
  - act_id (string, optional): Reserved for parity with the Python reference; Meta returns
    pages bound to the user/token, not the ad account, so this is currently unused.

Returns:
  { data: [{ id, name, username, category, fan_count, link, verification_status, picture }] }`,
      inputSchema: z.object({
        act_id: z.string().optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async () => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/me/accounts`;
        const data = await makeGraphApiCall(url, { access_token: token, fields: PAGE_FIELDS });
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );

  server.registerTool(
    "meta_ads_search_pages_by_name",
    {
      title: "Search Meta Pages by Name",
      description: `Search the user's pages by a case-insensitive substring of name or username.

Internally fetches /me/accounts then filters client-side. Meta's Graph API does not
expose a server-side name filter on /me/accounts.

Args:
  - search_term (string): Substring to match against page name or username.`,
      inputSchema: z.object({
        search_term: z.string().min(1),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ search_term }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/me/accounts`;
        const raw = (await makeGraphApiCall(url, {
          access_token: token,
          fields: PAGE_FIELDS,
        })) as PagedResponse;

        const needle = search_term.toLowerCase();
        const matches = (raw.data ?? []).filter((p) => {
          return (
            (p.name && p.name.toLowerCase().includes(needle)) ||
            (p.username && p.username.toLowerCase().includes(needle))
          );
        });

        const data = { data: matches, search_term, total_matches: matches.length };
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as unknown as Record<string, unknown>,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
