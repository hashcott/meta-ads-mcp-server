import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL } from "../constants.js";
import {
  getAccessToken,
  makeGraphApiCall,
  prepareParams,
  handleApiError,
} from "../services/graph-api.js";
import { FieldsSchema, FilteringSchema, PaginationSchema, DateFormatSchema, EffectiveStatusSchema } from "../schemas/common.js";

const CREATIVE_FIELDS_DESC =
  "Fields to retrieve. Available: id, name, account_id, actor_id, adlabels, asset_feed_spec, authorization_category, body, call_to_action_type, effective_authorization_category, effective_instagram_media_id, effective_object_story_id, image_hash, image_url, instagram_permalink_url, instagram_story_id, instagram_user_id, link_url, object_id, object_story_id, object_story_spec, object_type, object_url, platform_customizations, product_set_id, status, template_url, thumbnail_url, title, url_tags, use_page_actor_override, video_id";

export function registerCreativeTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_get_adcreatives_by_adaccount",
    {
      title: "Get Meta Ad Creatives by Ad Account",
      description: `Retrieve all ad creatives belonging to a specific Meta ad account.

Useful for auditing all creative assets, finding creatives by status, or reviewing creative content across the account.

Args:
  - act_id (string): Ad account ID prefixed with 'act_', e.g., 'act_1234567890'
  - fields (string[]): ${CREATIVE_FIELDS_DESC}
  - effective_status (string[]): Filter by status: ACTIVE, DELETED, IN_PROCESS, WITH_ISSUES
  - filtering (object[]): Additional filter objects with field, operator, value
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors

Returns:
  Object with data (creative array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.

Examples:
  - Use when: "List all active creatives in my ad account"
  - Use when: "Show all creatives with issues in act_123456"`,
      inputSchema: z
        .object({
          act_id: z
            .string()
            .describe("Ad account ID prefixed with 'act_', e.g., 'act_1234567890'"),
          fields: FieldsSchema.describe(CREATIVE_FIELDS_DESC),
          effective_status: z
            .array(z.enum(["ACTIVE", "DELETED", "IN_PROCESS", "WITH_ISSUES"]))
            .optional()
            .describe("Filter by creative status: ACTIVE, DELETED, IN_PROCESS, WITH_ISSUES"),
          filtering: FilteringSchema,
        })
        .merge(PaginationSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ act_id, fields, effective_status, filtering, limit, after, before }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/adcreatives`;
        const params = prepareParams(
          { access_token: token },
          { fields, effective_status, filtering, limit, after, before }
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
    "meta_ads_get_ad_creative_by_id",
    {
      title: "Get Meta Ad Creative by ID",
      description: `Retrieve detailed information about a specific Meta ad creative.

Args:
  - creative_id (string): Ad creative ID, e.g., '23842312323312'
  - fields (string[]): ${CREATIVE_FIELDS_DESC}
  - thumbnail_width (number): Width of the thumbnail image in pixels (default: 64)
  - thumbnail_height (number): Height of the thumbnail image in pixels (default: 64)

Returns:
  Object with the requested creative fields.

Examples:
  - Use when: "Get the body text, title, and image URL for creative 23842312323312"
  - Use when: "What is the call-to-action type and status of this creative?"
  - Use when: "Get a larger thumbnail (300x200) for this creative"`,
      inputSchema: z.object({
        creative_id: z.string().describe("Ad creative ID, e.g., '23842312323312'"),
        fields: FieldsSchema.describe(CREATIVE_FIELDS_DESC),
        thumbnail_width: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Width of the thumbnail image in pixels (default: 64)"),
        thumbnail_height: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Height of the thumbnail image in pixels (default: 64)"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ creative_id, fields, thumbnail_width, thumbnail_height }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${creative_id}`;
        const params = prepareParams(
          { access_token: token },
          {
            fields,
            ...(thumbnail_width !== undefined ? { thumbnail_width } : {}),
            ...(thumbnail_height !== undefined ? { thumbnail_height } : {}),
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
    "meta_ads_get_ad_creatives_by_ad_id",
    {
      title: "Get Meta Ad Creatives by Ad ID",
      description: `Retrieve the ad creatives associated with a specific Meta ad.

Args:
  - ad_id (string): Ad ID to retrieve creatives for, e.g., '23843211234567'
  - fields (string[]): ${CREATIVE_FIELDS_DESC}
  - limit (number): Maximum creatives per page (default: 25)
  - after / before (string): Pagination cursors from response.paging.cursors
  - date_format (string): Date format: 'U' for Unix timestamp, 'Y-m-d H:i:s' for MySQL datetime

Returns:
  Object with data (creative array) and paging. Use meta_ads_fetch_pagination_url with paging.next for more results.

Examples:
  - Use when: "What creatives are used by ad 23843211234567?"
  - Use when: "Get the image URLs and titles for all creatives on this ad"`,
      inputSchema: z
        .object({
          ad_id: z
            .string()
            .describe("Ad ID to retrieve creatives for, e.g., '23843211234567'"),
          fields: FieldsSchema.describe(CREATIVE_FIELDS_DESC),
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
    async ({ ad_id, fields, date_format, limit, after, before }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${ad_id}/adcreatives`;
        const params = prepareParams(
          { access_token: token },
          { fields, date_format, limit, after, before }
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
