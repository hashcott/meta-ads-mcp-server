import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL } from "../constants.js";
import {
  getAccessToken,
  makeGraphApiCall,
  fetchNode,
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

export function registerCampaignTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_get_campaign_by_id",
    {
      title: "Get Meta Campaign by ID",
      description: `Retrieve detailed information about a specific Meta ad campaign.

Args:
  - campaign_id (string): Campaign ID, e.g., '23843xxxxx'
  - fields (string[]): Fields to retrieve. Available: id, name, account_id, objective, status, effective_status, configured_status, daily_budget, lifetime_budget, budget_remaining, spend_cap, bid_strategy, buying_type, created_time, updated_time, start_time, stop_time, special_ad_categories, pacing_type, promoted_object, issues_info, recommendations
  - date_format (string): Date format: 'U' for Unix timestamp, 'Y-m-d H:i:s' for MySQL datetime, default: ISO 8601

Returns:
  Object with the requested campaign fields.

Examples:
  - Use when: "Get details for campaign 23843xxxxx"
  - Use when: "What is the objective and status of my campaign?"`,
      inputSchema: z.object({
        campaign_id: z.string().describe("Campaign ID, e.g., '23843xxxxx'"),
        fields: FieldsSchema,
        date_format: DateFormatSchema,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ campaign_id, fields, date_format }) => {
      try {
        const data = await fetchNode(campaign_id, {
          fields,
          ...(date_format ? { date_format } : {}),
        });
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
    "meta_ads_get_campaigns_by_adaccount",
    {
      title: "Get Meta Campaigns by Ad Account",
      description: `Retrieve all campaigns from a specific Meta ad account with filtering and pagination.

Args:
  - act_id (string): Ad account ID prefixed with 'act_', e.g., 'act_1234567890'
  - fields (string[]): Fields per campaign. Common: id, name, objective, effective_status, created_time, daily_budget, lifetime_budget, budget_remaining
  - effective_status (string[]): Filter by status: ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, ARCHIVED, WITH_ISSUES
  - objective (string[]): Filter by objective: APP_INSTALLS, BRAND_AWARENESS, CONVERSIONS, EVENT_RESPONSES, LEAD_GENERATION, LINK_CLICKS, MESSAGES, PAGE_LIKES, POST_ENGAGEMENT, PRODUCT_CATALOG_SALES, REACH, VIDEO_VIEWS
  - filtering (object[]): Additional filter objects with field, operator, value
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors
  - date_preset / time_range: Date filter for campaigns
  - updated_since (number): Return campaigns updated since this Unix timestamp
  - is_completed (boolean): True = only completed, False = only active, null = both
  - special_ad_categories (string[]): Filter by: EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS, NONE
  - include_drafts (boolean): Include draft campaigns if true
  - date_format (string): Date format for response

Returns:
  Object with data (campaign array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.`,
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
            .describe("Return campaigns updated since this Unix timestamp"),
          effective_status: EffectiveStatusSchema,
          is_completed: z
            .boolean()
            .optional()
            .describe("True = only completed, False = only active, null = both"),
          special_ad_categories: z
            .array(z.enum(["EMPLOYMENT", "HOUSING", "CREDIT", "ISSUES_ELECTIONS_POLITICS", "NONE"]))
            .optional()
            .describe(
              "Filter by special ad categories: EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS, NONE"
            ),
          objective: z
            .array(z.string())
            .optional()
            .describe(
              "Filter by objective: APP_INSTALLS, BRAND_AWARENESS, CONVERSIONS, EVENT_RESPONSES, LEAD_GENERATION, LINK_CLICKS, MESSAGES, PAGE_LIKES, POST_ENGAGEMENT, PRODUCT_CATALOG_SALES, REACH, VIDEO_VIEWS"
            ),
          buyer_guarantee_agreement_status: z
            .array(z.enum(["APPROVED", "NOT_APPROVED"]))
            .optional()
            .describe("Filter by buyer guarantee agreement status: APPROVED, NOT_APPROVED"),
          date_format: DateFormatSchema,
          include_drafts: z
            .boolean()
            .optional()
            .describe("Include draft campaigns in results if true"),
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
      is_completed,
      special_ad_categories,
      objective,
      buyer_guarantee_agreement_status,
      date_format,
      include_drafts,
      limit,
      after,
      before,
    }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/campaigns`;
        const params = prepareParams(
          { access_token: token },
          {
            fields,
            filtering,
            date_preset,
            time_range,
            updated_since,
            effective_status,
            special_ad_categories,
            objective,
            buyer_guarantee_agreement_status,
            date_format,
            limit,
            after,
            before,
            ...(is_completed !== undefined ? { is_completed } : {}),
            ...(include_drafts !== undefined ? { include_drafts } : {}),
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
}
