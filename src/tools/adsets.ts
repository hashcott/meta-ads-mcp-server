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

const ADSET_FIELDS_DESC =
  "Fields per ad set. Common: id, name, account_id, campaign_id, status, effective_status, daily_budget, lifetime_budget, budget_remaining, bid_amount, bid_strategy, billing_event, optimization_goal, targeting, start_time, end_time, created_time, updated_time, pacing_type, destination_type";

export function registerAdSetTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_get_adset_by_id",
    {
      title: "Get Meta Ad Set by ID",
      description: `Retrieve detailed information about a specific Meta ad set.

Args:
  - adset_id (string): Ad set ID, e.g., '23843211234567'
  - fields (string[]): ${ADSET_FIELDS_DESC}

Returns:
  Object with the requested ad set fields.

Examples:
  - Use when: "Get the targeting and budget for ad set 23843211234567"
  - Use when: "What is the optimization goal and status of this ad set?"`,
      inputSchema: z.object({
        adset_id: z.string().describe("Ad set ID, e.g., '23843211234567'"),
        fields: FieldsSchema,
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ adset_id, fields }) => {
      try {
        const data = await fetchNode(adset_id, { fields });
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
    "meta_ads_get_adsets_by_ids",
    {
      title: "Get Multiple Meta Ad Sets by IDs",
      description: `Retrieve information for multiple Meta ad sets in a single API call (batch lookup).

Efficient when you need data for several ad sets at once.

Args:
  - adset_ids (string[]): List of ad set IDs to retrieve, e.g., ['23843211234567', '23843211234568']
  - fields (string[]): ${ADSET_FIELDS_DESC}
  - date_format (string): Date format: 'U' for Unix timestamp, 'Y-m-d H:i:s' for MySQL datetime

Returns:
  Object where keys are ad set IDs and values are the corresponding ad set details.

Examples:
  - Use when: "Get details for ad sets 23843211234567, 23843211234568, and 23843211234569"`,
      inputSchema: z.object({
        adset_ids: z
          .array(z.string())
          .min(1)
          .describe("List of ad set IDs, e.g., ['23843211234567', '23843211234568']"),
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
    async ({ adset_ids, fields, date_format }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/`;
        const params = prepareParams(
          { access_token: token, ids: adset_ids.join(",") },
          { fields, ...(date_format ? { date_format } : {}) }
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
    "meta_ads_get_adsets_by_adaccount",
    {
      title: "Get Meta Ad Sets by Ad Account",
      description: `Retrieve all ad sets from a specific Meta ad account with filtering and pagination.

Args:
  - act_id (string): Ad account ID prefixed with 'act_', e.g., 'act_1234567890'
  - fields (string[]): ${ADSET_FIELDS_DESC}
  - effective_status (string[]): Filter by status: ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, CAMPAIGN_PAUSED, ARCHIVED, WITH_ISSUES
  - filtering (object[]): Additional filter objects, e.g., [{field: 'daily_budget', operator: 'GREATER_THAN', value: 1000}]
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors
  - date_preset / time_range: Date filter
  - updated_since (number): Unix timestamp — return ad sets updated since this time
  - date_format (string): Date format for response

Returns:
  Object with data (ad set array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.`,
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
            .describe("Return ad sets updated since this Unix timestamp"),
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
    async ({
      act_id,
      fields,
      filtering,
      date_preset,
      time_range,
      updated_since,
      effective_status,
      date_format,
      limit,
      after,
      before,
    }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/adsets`;
        const params = prepareParams(
          { access_token: token },
          {
            fields,
            filtering,
            date_preset,
            time_range,
            updated_since,
            effective_status,
            date_format,
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
    "meta_ads_get_adsets_by_campaign",
    {
      title: "Get Meta Ad Sets by Campaign",
      description: `Retrieve all ad sets belonging to a specific Meta campaign with filtering and pagination.

Args:
  - campaign_id (string): Campaign ID, e.g., '23843xxxxx'
  - fields (string[]): ${ADSET_FIELDS_DESC}
  - effective_status (string[]): Filter by status: ACTIVE, PAUSED, DELETED, PENDING_REVIEW, DISAPPROVED, PREAPPROVED, PENDING_BILLING_INFO, ARCHIVED, WITH_ISSUES
  - filtering (object[]): Additional filter objects, e.g., [{field: 'optimization_goal', operator: 'IN', value: ['OFFSITE_CONVERSIONS', 'VALUE']}]
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors
  - date_format (string): Date format for response

Returns:
  Object with data (ad set array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.`,
      inputSchema: z
        .object({
          campaign_id: z.string().describe("Campaign ID, e.g., '23843xxxxx'"),
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
    async ({
      campaign_id,
      fields,
      filtering,
      effective_status,
      date_format,
      limit,
      after,
      before,
    }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${campaign_id}/adsets`;
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

  // Write/lifecycle tools are gated behind META_ADS_ENABLE_WRITE_TOOLS so
  // dangerous mutations (create/update/delete/pause/resume) don't ship by default.
  if (!isWriteToolsEnabled()) return;

  server.registerTool(
    "meta_ads_create_adset",
    {
      title: "Create Meta Ad Set",
      description: `Create a new ad set under a campaign.

Args:
  - act_id (string): Ad account ID prefixed with 'act_'
  - campaign_id (string): Parent campaign ID
  - name (string)
  - optimization_goal (string): Depends on campaign objective + destination_type (e.g., OFFSITE_CONVERSIONS, LANDING_PAGE_VIEWS, LINK_CLICKS, IMPRESSIONS, REACH, LEAD_GENERATION, APP_INSTALLS).
  - billing_event (string): e.g., IMPRESSIONS, LINK_CLICKS.
  - status (string): Default PAUSED.
  - daily_budget / lifetime_budget (number, cents). Omit when the parent campaign uses CBO.
  - targeting (object): Targeting spec. Set targeting_automation.advantage_audience explicitly (Meta v24+ defaults to 0).
  - bid_amount (number, cents): Required for LOWEST_COST_WITH_BID_CAP / COST_CAP.
  - bid_strategy (string)
  - bid_constraints (object): Required for LOWEST_COST_WITH_MIN_ROAS, e.g., {roas_average_floor: 20000}.
  - start_time / end_time (string, ISO 8601). end_time required when lifetime_budget is set.
  - dsa_beneficiary / dsa_payor: Required for EU-targeted ad sets.
  - promoted_object (object): Required for APP_INSTALLS (application_id, object_store_url).
  - destination_type (string), is_dynamic_creative (boolean)
  - frequency_control_specs (object[]): MUST be set at creation; immutable afterward.
  - multi_advertiser_ads (number): 0 = opt out, 1 = opt in.
  - regional_regulated_categories, regional_regulation_identities: For Taiwan/Australia/etc.
  - attribution_spec (object[]): e.g., [{event_type:"CLICK_THROUGH", window_days:7}].`,
      inputSchema: z.object({
        act_id: z.string(),
        campaign_id: z.string(),
        name: z.string(),
        optimization_goal: z.string(),
        billing_event: z.string(),
        status: z.enum(["ACTIVE", "PAUSED"]).optional(),
        daily_budget: z.number().int().positive().optional(),
        lifetime_budget: z.number().int().positive().optional(),
        targeting: z.record(z.string(), z.unknown()).optional(),
        bid_amount: z.number().int().positive().optional(),
        bid_strategy: z.string().optional(),
        bid_constraints: z.record(z.string(), z.unknown()).optional(),
        bid_adjustments: z.record(z.string(), z.unknown()).optional(),
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        dsa_beneficiary: z.string().optional(),
        dsa_payor: z.string().optional(),
        promoted_object: z.record(z.string(), z.unknown()).optional(),
        destination_type: z.string().optional(),
        is_dynamic_creative: z.boolean().optional(),
        frequency_control_specs: z.array(z.record(z.string(), z.unknown())).optional(),
        multi_advertiser_ads: z.number().int().min(0).max(1).optional(),
        regional_regulated_categories: z.array(z.string()).optional(),
        regional_regulation_identities: z.record(z.string(), z.unknown()).optional(),
        attribution_spec: z.array(z.record(z.string(), z.unknown())).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const params: Record<string, unknown> = {
          name: args.name,
          campaign_id: args.campaign_id,
          optimization_goal: args.optimization_goal,
          billing_event: args.billing_event,
          status: args.status ?? "PAUSED",
        };
        if (args.daily_budget !== undefined) params.daily_budget = String(args.daily_budget);
        if (args.lifetime_budget !== undefined) params.lifetime_budget = String(args.lifetime_budget);
        if (args.bid_amount !== undefined) params.bid_amount = String(args.bid_amount);
        if (args.bid_strategy !== undefined) params.bid_strategy = args.bid_strategy;
        if (args.start_time !== undefined) params.start_time = args.start_time;
        if (args.end_time !== undefined) params.end_time = args.end_time;
        if (args.dsa_beneficiary !== undefined) params.dsa_beneficiary = args.dsa_beneficiary;
        if (args.dsa_payor !== undefined) params.dsa_payor = args.dsa_payor;
        if (args.destination_type !== undefined) params.destination_type = args.destination_type;
        if (args.is_dynamic_creative !== undefined) {
          params.is_dynamic_creative = args.is_dynamic_creative ? "true" : "false";
        }
        if (args.multi_advertiser_ads !== undefined) {
          params.multi_advertiser_ads = args.multi_advertiser_ads;
        }
        if (args.targeting !== undefined) params.targeting = JSON.stringify(args.targeting);
        if (args.bid_constraints !== undefined) {
          params.bid_constraints = JSON.stringify(args.bid_constraints);
        }
        if (args.bid_adjustments !== undefined) {
          params.bid_adjustments = JSON.stringify(args.bid_adjustments);
        }
        if (args.promoted_object !== undefined) {
          params.promoted_object = JSON.stringify(args.promoted_object);
        }
        if (args.frequency_control_specs !== undefined) {
          params.frequency_control_specs = JSON.stringify(args.frequency_control_specs);
        }
        if (args.regional_regulated_categories !== undefined) {
          params.regional_regulated_categories = JSON.stringify(args.regional_regulated_categories);
        }
        if (args.regional_regulation_identities !== undefined) {
          params.regional_regulation_identities = JSON.stringify(args.regional_regulation_identities);
        }
        if (args.attribution_spec !== undefined) {
          params.attribution_spec = JSON.stringify(args.attribution_spec);
        }

        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${args.act_id}/adsets`;
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
    "meta_ads_update_adset",
    {
      title: "Update Meta Ad Set",
      description: `Update an existing ad set. Pass only the fields you want to change.

Note: frequency_control_specs is immutable after creation.`,
      inputSchema: z.object({
        adset_id: z.string(),
        name: z.string().optional(),
        status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"]).optional(),
        daily_budget: z.number().int().positive().optional(),
        lifetime_budget: z.number().int().positive().optional(),
        bid_amount: z.number().int().positive().optional(),
        bid_strategy: z.string().optional(),
        bid_constraints: z.record(z.string(), z.unknown()).optional(),
        optimization_goal: z.string().optional(),
        billing_event: z.string().optional(),
        targeting: z.record(z.string(), z.unknown()).optional(),
        start_time: z.string().optional(),
        end_time: z.string().optional(),
        attribution_spec: z.array(z.record(z.string(), z.unknown())).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      try {
        const params: Record<string, unknown> = {};
        if (args.name !== undefined) params.name = args.name;
        if (args.status !== undefined) params.status = args.status;
        if (args.daily_budget !== undefined) params.daily_budget = String(args.daily_budget);
        if (args.lifetime_budget !== undefined) params.lifetime_budget = String(args.lifetime_budget);
        if (args.bid_amount !== undefined) params.bid_amount = String(args.bid_amount);
        if (args.bid_strategy !== undefined) params.bid_strategy = args.bid_strategy;
        if (args.optimization_goal !== undefined) params.optimization_goal = args.optimization_goal;
        if (args.billing_event !== undefined) params.billing_event = args.billing_event;
        if (args.start_time !== undefined) params.start_time = args.start_time;
        if (args.end_time !== undefined) params.end_time = args.end_time;
        if (args.targeting !== undefined) params.targeting = JSON.stringify(args.targeting);
        if (args.bid_constraints !== undefined) {
          params.bid_constraints = JSON.stringify(args.bid_constraints);
        }
        if (args.attribution_spec !== undefined) {
          params.attribution_spec = JSON.stringify(args.attribution_spec);
        }

        const data = await postNode(args.adset_id, params);
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
    "meta_ads_delete_adset",
    {
      title: "Delete Meta Ad Set",
      description: `Permanently delete an ad set. This also stops delivery on all of its ads.
Irreversible — prefer meta_ads_pause_adset if you may want to resume later.`,
      inputSchema: z.object({ adset_id: z.string() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ adset_id }) => {
      try {
        const data = await deleteNode(adset_id);
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
    "meta_ads_pause_adset",
    {
      title: "Pause Meta Ad Set",
      description: "Pause an ad set (sets status to PAUSED).",
      inputSchema: z.object({ adset_id: z.string() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ adset_id }) => {
      try {
        const data = await postNode(adset_id, { status: "PAUSED" });
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
    "meta_ads_resume_adset",
    {
      title: "Resume Meta Ad Set",
      description: "Resume a paused ad set (sets status to ACTIVE).",
      inputSchema: z.object({ adset_id: z.string() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ adset_id }) => {
      try {
        const data = await postNode(adset_id, { status: "ACTIVE" });
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
