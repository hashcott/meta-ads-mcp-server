import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL } from "../constants.js";
import {
  getAccessToken,
  makeGraphApiCall,
  makeGraphApiPostCall,
  fetchNode,
  postNode,
  deleteNode,
  prepareParams,
  handleApiError,
} from "../services/graph-api.js";
import {
  FieldsSchema,
  FilteringSchema,
  PaginationSchema,
  TimeRangeSchema,
  DatePresetSchema,
  DateFormatSchema,
  EffectiveStatusSchema,
} from "../schemas/common.js";

const AD_FIELDS_DESC =
  "Fields per ad. Common: id, name, account_id, adset_id, campaign_id, status, effective_status, configured_status, creative, bid_amount, bid_type, created_time, updated_time, targeting, conversion_specs, recommendations, preview_shareable_link";

export function registerAdTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_get_ad_by_id",
    {
      title: "Get Meta Ad by ID",
      description: `Retrieve detailed information about a specific Meta ad.

Args:
  - ad_id (string): Ad ID, e.g., '23843211234567'
  - fields (string[]): ${AD_FIELDS_DESC}

Returns:
  Object with the requested ad fields.

Examples:
  - Use when: "Get details for ad 23843211234567"
  - Use when: "What creative and status does this ad have?"`,
      inputSchema: z.object({
        ad_id: z.string().describe("Ad ID, e.g., '23843211234567'"),
        fields: FieldsSchema,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ad_id, fields }) => {
      try {
        const data = await fetchNode(ad_id, { fields });
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
    "meta_ads_get_ads_by_adaccount",
    {
      title: "Get Meta Ads by Ad Account",
      description: `Retrieve all ads from a specific Meta ad account with filtering and pagination.

Args:
  - act_id (string): Ad account ID prefixed with 'act_', e.g., 'act_1234567890'
  - fields (string[]): ${AD_FIELDS_DESC}
  - effective_status (string[]): Filter by status: ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, CAMPAIGN_PAUSED, ARCHIVED, ADSET_PAUSED, IN_PROCESS, WITH_ISSUES
  - filtering (object[]): Additional filter objects with field, operator, value
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors
  - date_preset / time_range: Date filter
  - updated_since (number): Unix timestamp — return ads updated since this time

Returns:
  Object with data (ad array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.`,
      inputSchema: z
        .object({
          act_id: z
            .string()
            .describe("Ad account ID prefixed with 'act_', e.g., 'act_1234567890'"),
          fields: FieldsSchema,
          filtering: FilteringSchema,
          date_preset: DatePresetSchema,
          time_range: TimeRangeSchema.optional(),
          updated_since: z
            .number()
            .int()
            .optional()
            .describe("Return ads updated since this Unix timestamp"),
          effective_status: EffectiveStatusSchema,
        })
        .merge(PaginationSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({
      act_id,
      fields,
      filtering,
      date_preset,
      time_range,
      updated_since,
      effective_status,
      limit,
      after,
      before,
    }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/ads`;
        const params = prepareParams(
          { access_token: token },
          {
            fields,
            filtering,
            date_preset,
            time_range,
            updated_since,
            effective_status,
            limit,
            after,
            before,
          }
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
    "meta_ads_get_ads_by_campaign",
    {
      title: "Get Meta Ads by Campaign",
      description: `Retrieve all ads belonging to a specific Meta campaign with filtering and pagination.

Args:
  - campaign_id (string): Campaign ID, e.g., '23843xxxxx'
  - fields (string[]): ${AD_FIELDS_DESC}
  - effective_status (string[]): Filter by status: ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, ADSET_PAUSED, ARCHIVED, IN_PROCESS, WITH_ISSUES
  - filtering (object[]): Additional filter objects with field, operator, value
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors

Returns:
  Object with data (ad array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.`,
      inputSchema: z
        .object({
          campaign_id: z.string().describe("Campaign ID, e.g., '23843xxxxx'"),
          fields: FieldsSchema,
          filtering: FilteringSchema,
          effective_status: EffectiveStatusSchema,
        })
        .merge(PaginationSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ campaign_id, fields, filtering, effective_status, limit, after, before }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${campaign_id}/ads`;
        const params = prepareParams(
          { access_token: token },
          { fields, filtering, effective_status, limit, after, before }
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
    "meta_ads_get_ads_by_adset",
    {
      title: "Get Meta Ads by Ad Set",
      description: `Retrieve all ads belonging to a specific Meta ad set with filtering and pagination.

Args:
  - adset_id (string): Ad set ID, e.g., '23843211234567'
  - fields (string[]): ${AD_FIELDS_DESC}
  - effective_status (string[]): Filter by status: ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, CAMPAIGN_PAUSED, ARCHIVED, IN_PROCESS, WITH_ISSUES
  - filtering (object[]): Filter objects. Operators: EQUAL, NOT_EQUAL, GREATER_THAN, GREATER_THAN_OR_EQUAL, LESS_THAN, LESS_THAN_OR_EQUAL, IN_RANGE, NOT_IN_RANGE, CONTAIN, NOT_CONTAIN, IN, NOT_IN, EMPTY, NOT_EMPTY
  - limit (number): Results per page (1-100, default: 25, max: 100)
  - after / before (string): Pagination cursors
  - date_format (string): Date format for response

Returns:
  Object with data (ad array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.`,
      inputSchema: z
        .object({
          adset_id: z.string().describe("Ad set ID, e.g., '23843211234567'"),
          fields: FieldsSchema,
          filtering: FilteringSchema,
          effective_status: EffectiveStatusSchema,
          date_format: DateFormatSchema,
        })
        .merge(PaginationSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ adset_id, fields, filtering, effective_status, date_format, limit, after, before }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${adset_id}/ads`;
        const params = prepareParams(
          { access_token: token },
          { fields, filtering, effective_status, date_format, limit, after, before }
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
    "meta_ads_create_ad",
    {
      title: "Create Meta Ad",
      description: `Create a new ad under an existing ad set, using an existing creative.

Args:
  - act_id (string): Ad account ID prefixed with 'act_'
  - name (string)
  - adset_id (string): Parent ad set ID
  - creative_id (string): Existing ad creative ID
  - status (string): Default PAUSED
  - bid_amount (number, cents)
  - tracking_specs (object[]): e.g., pixel tracking — [{"action.type":"offsite_conversion","fb_pixel":["PIXEL_ID"]}]

Note: Dynamic Creative creatives require the parent ad set to have is_dynamic_creative=true.`,
      inputSchema: z.object({
        act_id: z.string(),
        name: z.string(),
        adset_id: z.string(),
        creative_id: z.string(),
        status: z.enum(["ACTIVE", "PAUSED"]).optional(),
        bid_amount: z.number().int().positive().optional(),
        tracking_specs: z.array(z.record(z.unknown())).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ act_id, name, adset_id, creative_id, status, bid_amount, tracking_specs }) => {
      try {
        const params: Record<string, unknown> = {
          name,
          adset_id,
          creative: JSON.stringify({ creative_id }),
          status: status ?? "PAUSED",
        };
        if (bid_amount !== undefined) params.bid_amount = String(bid_amount);
        if (tracking_specs !== undefined) params.tracking_specs = JSON.stringify(tracking_specs);

        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/ads`;
        const data = await makeGraphApiPostCall(url, { access_token: token, ...params });
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
    "meta_ads_update_ad",
    {
      title: "Update Meta Ad",
      description: `Update an existing ad. Pass only the fields you want to change.

Note: Swapping creative_id on a FLEX ad can fail with error_subcode 3858355 if the new
creative's asset_feed_spec images don't match its object_story_spec. In that case, create
a new ad with the new creative and pause the old one.`,
      inputSchema: z.object({
        ad_id: z.string(),
        name: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]).optional(),
        bid_amount: z.number().int().positive().optional(),
        tracking_specs: z.array(z.record(z.unknown())).optional(),
        creative_id: z.string().optional().describe("Replace the ad's creative"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ ad_id, name, status, bid_amount, tracking_specs, creative_id }) => {
      try {
        const params: Record<string, unknown> = {};
        if (name !== undefined) params.name = name;
        if (status !== undefined) params.status = status;
        if (bid_amount !== undefined) params.bid_amount = String(bid_amount);
        if (tracking_specs !== undefined) params.tracking_specs = JSON.stringify(tracking_specs);
        if (creative_id !== undefined) params.creative = JSON.stringify({ creative_id });

        if (Object.keys(params).length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    error:
                      "No update parameters provided (name, status, bid_amount, tracking_specs, or creative_id)",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const data = await postNode(ad_id, params);
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
    "meta_ads_delete_ad",
    {
      title: "Delete Meta Ad",
      description: `Permanently delete an ad. Irreversible — prefer meta_ads_pause_ad if you may
want to resume the ad later.`,
      inputSchema: z.object({ ad_id: z.string() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ad_id }) => {
      try {
        const data = await deleteNode(ad_id);
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
    "meta_ads_pause_ad",
    {
      title: "Pause Meta Ad",
      description: "Pause an ad (sets status to PAUSED).",
      inputSchema: z.object({ ad_id: z.string() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ad_id }) => {
      try {
        const data = await postNode(ad_id, { status: "PAUSED" });
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
    "meta_ads_resume_ad",
    {
      title: "Resume Meta Ad",
      description: "Resume a paused ad (sets status to ACTIVE).",
      inputSchema: z.object({ ad_id: z.string() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ad_id }) => {
      try {
        const data = await postNode(ad_id, { status: "ACTIVE" });
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
