import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL } from "../constants.js";
import {
  getAccessToken,
  makeGraphApiCall,
  prepareParams,
  handleApiError,
} from "../services/graph-api.js";

const READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export function registerTargetingTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_search_interests",
    {
      title: "Search Meta Ad Interests",
      description: `Search Meta's interest targeting catalog by keyword. Returns interest IDs
suitable for use in an ad set's targeting.flexible_spec.

Args:
  - q (string): Search term (e.g., "baseball", "cooking", "travel")
  - limit (number, optional): Max results (default 25)

Returns:
  { data: [{ id, name, audience_size_lower_bound, audience_size_upper_bound, path, topic }] }`,
      inputSchema: z.object({
        q: z.string().describe("Search keyword for interests"),
        limit: z.number().int().min(1).max(500).optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ q, limit }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/search`;
        const params = prepareParams(
          { access_token: token, type: "adinterest", q },
          { limit }
        );
        const data = await makeGraphApiCall(url, params);
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
    "meta_ads_get_interest_suggestions",
    {
      title: "Get Meta Ad Interest Suggestions",
      description: `Given a seed list of interest names, return related/suggested interests.

Args:
  - interest_list (string[]): Seed interest names, e.g., ["Basketball", "Soccer"]
  - limit (number, optional): Max suggestions (default 25)`,
      inputSchema: z.object({
        interest_list: z.array(z.string()).min(1),
        limit: z.number().int().min(1).max(500).optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ interest_list, limit }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/search`;
        const params: Record<string, unknown> = {
          access_token: token,
          type: "adinterestsuggestion",
          interest_list: JSON.stringify(interest_list),
        };
        if (limit !== undefined) params.limit = limit;
        const data = await makeGraphApiCall(url, params);
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
    "meta_ads_search_behaviors",
    {
      title: "Search Meta Ad Behaviors",
      description: `List available behavior targeting options.

Args:
  - limit (number, optional): Max results (default 50)`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(500).optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ limit }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/search`;
        const params: Record<string, unknown> = {
          access_token: token,
          type: "adTargetingCategory",
          class: "behaviors",
        };
        if (limit !== undefined) params.limit = limit;
        const data = await makeGraphApiCall(url, params);
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
    "meta_ads_search_demographics",
    {
      title: "Search Meta Ad Demographics",
      description: `List demographic targeting options. Pass demographic_class to scope the
results (default: 'demographics'). Other valid classes: 'life_events', 'industries',
'income', 'family_statuses', 'user_device', 'user_os'.`,
      inputSchema: z.object({
        demographic_class: z
          .enum([
            "demographics",
            "life_events",
            "industries",
            "income",
            "family_statuses",
            "user_device",
            "user_os",
          ])
          .optional()
          .describe("Targeting category class (default: demographics)"),
        limit: z.number().int().min(1).max(500).optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ demographic_class, limit }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/search`;
        const params: Record<string, unknown> = {
          access_token: token,
          type: "adTargetingCategory",
          class: demographic_class ?? "demographics",
        };
        if (limit !== undefined) params.limit = limit;
        const data = await makeGraphApiCall(url, params);
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
    "meta_ads_search_geo_locations",
    {
      title: "Search Meta Ad Geo Locations",
      description: `Search Meta's geographic targeting catalog by query string. Returns location
keys to use in targeting.geo_locations.

Args:
  - q (string): Search term (e.g., "New York", "Japan")
  - location_types (string[], optional): Filter by types: 'country', 'region', 'city',
    'zip', 'geo_market', 'electoral_district'.
  - limit (number, optional): Max results (default 25)`,
      inputSchema: z.object({
        q: z.string(),
        location_types: z
          .array(z.enum(["country", "region", "city", "zip", "geo_market", "electoral_district"]))
          .optional(),
        limit: z.number().int().min(1).max(500).optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ q, location_types, limit }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/search`;
        const params: Record<string, unknown> = {
          access_token: token,
          type: "adgeolocation",
          q,
        };
        if (location_types) params.location_types = JSON.stringify(location_types);
        if (limit !== undefined) params.limit = limit;
        const data = await makeGraphApiCall(url, params);
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
    "meta_ads_estimate_audience_size",
    {
      title: "Estimate Meta Ad Audience Size",
      description: `Estimate audience size for a targeting spec using Meta's delivery_estimate /
reachestimate endpoints.

Args:
  - act_id (string): Ad account ID prefixed with 'act_'.
  - targeting (object): Full targeting spec (geo_locations, age_min, age_max, interests, flexible_spec, etc.).
  - optimization_goal (string, optional): Default 'REACH'. Other common values: LINK_CLICKS,
    LANDING_PAGE_VIEWS, OFFSITE_CONVERSIONS, IMPRESSIONS.

Returns:
  Estimated audience size bounds plus the raw API response.`,
      inputSchema: z.object({
        act_id: z.string(),
        targeting: z.record(z.string(), z.unknown()),
        optimization_goal: z.string().optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async ({ act_id, targeting, optimization_goal }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/delivery_estimate`;
        const params: Record<string, unknown> = {
          access_token: token,
          targeting_spec: JSON.stringify(targeting),
          optimization_goal: optimization_goal ?? "REACH",
        };
        const data = await makeGraphApiCall(url, params);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
          structuredContent: data as Record<string, unknown>,
        };
      } catch (error) {
        return { content: [{ type: "text", text: handleApiError(error) }] };
      }
    }
  );
}
