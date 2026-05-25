import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL, isWriteToolsEnabled } from "../constants.js";
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

  // Write/lifecycle tools are gated behind META_ADS_ENABLE_WRITE_TOOLS so
  // dangerous mutations (create/update/delete/pause/resume) don't ship by default.
  if (!isWriteToolsEnabled()) return;

  server.registerTool(
    "meta_ads_create_campaign",
    {
      title: "Create Meta Campaign",
      description: `Create a new Meta ad campaign in the given ad account.

Args:
  - act_id (string): Ad account ID prefixed with 'act_'
  - name (string): Campaign name
  - objective (string): ODAX outcome-based objective. One of OUTCOME_AWARENESS, OUTCOME_TRAFFIC, OUTCOME_ENGAGEMENT, OUTCOME_LEADS, OUTCOME_SALES, OUTCOME_APP_PROMOTION. Legacy objectives (e.g., BRAND_AWARENESS, LINK_CLICKS) are not accepted for new campaigns.
  - status (string): Initial status, default PAUSED
  - special_ad_categories (string[]): Required by Meta — defaults to []. Set when targeting regulated verticals (EMPLOYMENT, HOUSING, CREDIT, ISSUES_ELECTIONS_POLITICS).
  - daily_budget / lifetime_budget (number): Campaign-level budget in account currency cents. Omit both when use_adset_level_budgets=true.
  - buying_type (string): e.g., 'AUCTION'
  - bid_strategy (string): LOWEST_COST_WITHOUT_CAP (default), LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS. Bid-cap strategies require bid_amount on every child ad set.
  - bid_cap / spend_cap (number): In account currency cents.
  - campaign_budget_optimization (boolean): Enable/disable CBO.
  - use_adset_level_budgets (boolean): If true, omit campaign budget and set is_adset_budget_sharing_enabled=false.
  - ab_test_control_setups (object[]): A/B test config.

Returns:
  { id: string } of the new campaign.`,
      inputSchema: z.object({
        act_id: z.string().describe("Ad account ID prefixed with 'act_'"),
        name: z.string().describe("Campaign name"),
        objective: z
          .enum([
            "OUTCOME_AWARENESS",
            "OUTCOME_TRAFFIC",
            "OUTCOME_ENGAGEMENT",
            "OUTCOME_LEADS",
            "OUTCOME_SALES",
            "OUTCOME_APP_PROMOTION",
          ])
          .describe("ODAX outcome-based campaign objective"),
        status: z
          .enum(["ACTIVE", "PAUSED"])
          .optional()
          .describe("Initial campaign status (default PAUSED)"),
        special_ad_categories: z
          .array(z.enum(["EMPLOYMENT", "HOUSING", "CREDIT", "ISSUES_ELECTIONS_POLITICS", "NONE"]))
          .optional()
          .describe("Special ad categories. Required by Meta — defaults to []"),
        daily_budget: z.number().int().positive().optional().describe("Daily budget in cents"),
        lifetime_budget: z.number().int().positive().optional().describe("Lifetime budget in cents"),
        buying_type: z.string().optional().describe("Buying type, e.g., 'AUCTION'"),
        bid_strategy: z
          .enum([
            "LOWEST_COST_WITHOUT_CAP",
            "LOWEST_COST_WITH_BID_CAP",
            "COST_CAP",
            "LOWEST_COST_WITH_MIN_ROAS",
          ])
          .optional()
          .describe("Bid strategy"),
        bid_cap: z.number().int().positive().optional().describe("Bid cap in cents"),
        spend_cap: z.number().int().positive().optional().describe("Spend cap in cents"),
        campaign_budget_optimization: z
          .boolean()
          .optional()
          .describe("Enable campaign budget optimization (CBO)"),
        use_adset_level_budgets: z
          .boolean()
          .optional()
          .describe("If true, set budgets at ad set level instead of campaign level"),
        ab_test_control_setups: z
          .array(z.record(z.string(), z.unknown()))
          .optional()
          .describe("A/B test control setups"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      act_id,
      name,
      objective,
      status,
      special_ad_categories,
      daily_budget,
      lifetime_budget,
      buying_type,
      bid_strategy,
      bid_cap,
      spend_cap,
      campaign_budget_optimization,
      use_adset_level_budgets,
      ab_test_control_setups,
    }) => {
      try {
        const params: Record<string, unknown> = {
          name,
          objective,
          status: status ?? "PAUSED",
          special_ad_categories: JSON.stringify(special_ad_categories ?? []),
        };

        if (use_adset_level_budgets) {
          params.is_adset_budget_sharing_enabled = "false";
        } else {
          if (daily_budget !== undefined) params.daily_budget = String(daily_budget);
          if (lifetime_budget !== undefined) params.lifetime_budget = String(lifetime_budget);
          if (campaign_budget_optimization !== undefined) {
            params.campaign_budget_optimization = campaign_budget_optimization ? "true" : "false";
          }
          if (bid_strategy) params.bid_strategy = bid_strategy;
        }

        if (buying_type) params.buying_type = buying_type;
        if (bid_cap !== undefined) params.bid_cap = String(bid_cap);
        if (spend_cap !== undefined) params.spend_cap = String(spend_cap);
        if (ab_test_control_setups) {
          params.ab_test_control_setups = JSON.stringify(ab_test_control_setups);
        }

        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/campaigns`;
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
    "meta_ads_update_campaign",
    {
      title: "Update Meta Campaign",
      description: `Update an existing Meta ad campaign. Pass only the fields you want to change.

Args:
  - campaign_id (string)
  - name, status (ACTIVE|PAUSED|ARCHIVED|DELETED), objective
  - special_ad_categories (string[])
  - daily_budget / lifetime_budget (number, cents). Pass 0 to keep, omit to leave unchanged.
  - bid_strategy, bid_cap, spend_cap
  - campaign_budget_optimization (boolean)
  - adset_budgets (object[]): CBO → ABO migration. Pass [{adset_id, daily_budget}] entries; Meta atomically clears the campaign budget and assigns budgets at the ad set level.

Returns:
  { success: true } or the updated campaign object.`,
      inputSchema: z.object({
        campaign_id: z.string(),
        name: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]).optional(),
        objective: z.string().optional(),
        special_ad_categories: z.array(z.string()).optional(),
        daily_budget: z.number().int().positive().optional(),
        lifetime_budget: z.number().int().positive().optional(),
        bid_strategy: z
          .enum([
            "LOWEST_COST_WITHOUT_CAP",
            "LOWEST_COST_WITH_BID_CAP",
            "COST_CAP",
            "LOWEST_COST_WITH_MIN_ROAS",
          ])
          .optional(),
        bid_cap: z.number().int().positive().optional(),
        spend_cap: z.number().int().positive().optional(),
        campaign_budget_optimization: z.boolean().optional(),
        adset_budgets: z
          .array(
            z.object({
              adset_id: z.string(),
              daily_budget: z.number().int().positive().optional(),
              lifetime_budget: z.number().int().positive().optional(),
            })
          )
          .optional()
          .describe("CBO → ABO migration: per-adset budgets in cents"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({
      campaign_id,
      name,
      status,
      objective,
      special_ad_categories,
      daily_budget,
      lifetime_budget,
      bid_strategy,
      bid_cap,
      spend_cap,
      campaign_budget_optimization,
      adset_budgets,
    }) => {
      try {
        const params: Record<string, unknown> = {};
        if (name !== undefined) params.name = name;
        if (status !== undefined) params.status = status;
        if (objective !== undefined) params.objective = objective;
        if (special_ad_categories !== undefined) {
          params.special_ad_categories = JSON.stringify(special_ad_categories);
        }
        if (daily_budget !== undefined) params.daily_budget = String(daily_budget);
        if (lifetime_budget !== undefined) params.lifetime_budget = String(lifetime_budget);
        if (bid_strategy !== undefined) params.bid_strategy = bid_strategy;
        if (bid_cap !== undefined) params.bid_cap = String(bid_cap);
        if (spend_cap !== undefined) params.spend_cap = String(spend_cap);
        if (campaign_budget_optimization !== undefined) {
          params.campaign_budget_optimization = campaign_budget_optimization ? "true" : "false";
        }
        if (adset_budgets !== undefined) {
          params.adset_budgets = JSON.stringify(
            adset_budgets.map((b) => ({
              adset_id: b.adset_id,
              ...(b.daily_budget !== undefined ? { daily_budget: String(b.daily_budget) } : {}),
              ...(b.lifetime_budget !== undefined
                ? { lifetime_budget: String(b.lifetime_budget) }
                : {}),
            }))
          );
        }

        const data = await postNode(campaign_id, params);
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
    "meta_ads_delete_campaign",
    {
      title: "Delete Meta Campaign",
      description: `Permanently delete a Meta ad campaign. This also stops delivery on all of its
ad sets and ads. The operation is irreversible — prefer meta_ads_pause_campaign if you may want
to resume delivery later.`,
      inputSchema: z.object({
        campaign_id: z.string().describe("Campaign ID"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ campaign_id }) => {
      try {
        const data = await deleteNode(campaign_id);
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
    "meta_ads_pause_campaign",
    {
      title: "Pause Meta Campaign",
      description: "Pause a campaign (sets status to PAUSED).",
      inputSchema: z.object({
        campaign_id: z.string().describe("Campaign ID"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ campaign_id }) => {
      try {
        const data = await postNode(campaign_id, { status: "PAUSED" });
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
    "meta_ads_resume_campaign",
    {
      title: "Resume Meta Campaign",
      description: "Resume a paused campaign (sets status to ACTIVE).",
      inputSchema: z.object({
        campaign_id: z.string().describe("Campaign ID"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ campaign_id }) => {
      try {
        const data = await postNode(campaign_id, { status: "ACTIVE" });
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
