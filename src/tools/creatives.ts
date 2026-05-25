import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL, isWriteToolsEnabled } from "../constants.js";
import {
  getAccessToken,
  makeGraphApiCall,
  makeGraphApiPostCall,
  postNode,
  prepareParams,
  handleApiError,
} from "../services/graph-api.js";
import { FieldsSchema, FilteringSchema, PaginationSchema, DateFormatSchema, EffectiveStatusSchema } from "../schemas/common.js";

const VALID_CROP_KEYS: ReadonlyArray<readonly [string, number, number]> = [
  ["100x100", 100, 100],
  ["100x72", 100, 72],
  ["400x500", 400, 500],
  ["400x150", 400, 150],
  ["600x360", 600, 360],
  ["90x160", 90, 160],
];

function computeCropBox(srcW: number, srcH: number, kw: number, kh: number): number[][] {
  const cropWFromH = (srcH * kw) / kh;
  let cropW: number;
  let cropH: number;
  if (cropWFromH <= srcW) {
    cropW = Math.round(cropWFromH);
    cropH = srcH;
  } else {
    cropW = srcW;
    cropH = Math.round((srcW * kh) / kw);
  }
  const x1 = Math.floor((srcW - cropW) / 2);
  const y1 = Math.floor((srcH - cropH) / 2);
  return [
    [x1, y1],
    [x1 + cropW, y1 + cropH],
  ];
}

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

  // Pure utility — does not call the Meta API. Compute centered crop boxes
  // for the 6 aspect ratios accepted by create_ad_creative.image_crops.
  server.registerTool(
    "meta_ads_compute_image_crops",
    {
      title: "Compute Meta Ad Image Crops",
      description: `Compute image_crops coordinates for a source image. For each requested key,
returns the largest centered region that fits the source while matching that key's aspect ratio
(equivalent to Meta's "Original" crop — no content cut beyond the ratio).

Valid keys (Meta accepts only these 6):
  100x100  — 1:1 square (Feed, Marketplace)
  100x72   — ~1.39:1 horizontal (Marketplace)
  400x500  — 4:5 portrait (Feed mobile, Stories fallback)
  400x150  — ~2.67:1 banner (Audience Network)
  600x360  — ~1.67:1 horizontal (Right column)
  90x160   — 9:16 portrait (Stories)

Pass the returned image_crops dict to meta_ads_create_ad_creative.`,
      inputSchema: z.object({
        image_width: z.number().int().positive(),
        image_height: z.number().int().positive(),
        crop_keys: z.array(z.string()).optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ image_width, image_height, crop_keys }) => {
      const requested = crop_keys ?? VALID_CROP_KEYS.map(([k]) => k);
      const keyMap = new Map<string, [number, number]>(
        VALID_CROP_KEYS.map(([k, w, h]) => [k, [w, h]])
      );
      const crops: Record<string, number[][]> = {};
      const warnings: string[] = [];
      for (const key of requested) {
        const dims = keyMap.get(key);
        if (!dims) {
          warnings.push(
            `'${key}' is not a valid Meta crop key. Valid keys: ${VALID_CROP_KEYS.map(([k]) => k).join(", ")}`
          );
          continue;
        }
        crops[key] = computeCropBox(image_width, image_height, dims[0], dims[1]);
      }
      const result: Record<string, unknown> = {
        image_crops: crops,
        source_dimensions: { width: image_width, height: image_height },
        usage:
          "Pass image_crops directly to meta_ads_create_ad_creative inside object_story_spec.link_data.",
      };
      if (warnings.length) result.warnings = warnings;
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    }
  );

  // Write/lifecycle tools are gated behind META_ADS_ENABLE_WRITE_TOOLS so
  // dangerous mutations don't ship by default.
  if (!isWriteToolsEnabled()) return;

  server.registerTool(
    "meta_ads_create_ad_creative",
    {
      title: "Create Meta Ad Creative",
      description: `Create an ad creative. Three common modes:

  1. Promote an existing organic post:
       object_story_id: "{page_id}_{post_id}"
     (image_hash / video_id / page_id not required)

  2. Single-image link ad:
       page_id, link_url, image_hash, message, headline?, description?, call_to_action_type?

  3. Single-video ad:
       page_id, link_url, video_id, message, headline?, call_to_action_type?, thumbnail_url?

For advanced modes (FLEX/DOF, Placement Asset Customization, Dynamic Creative, multi-headline
asset_feed_spec, lead-gen forms, branded content, image_crops, etc.), pass a fully composed
object_story_spec and/or asset_feed_spec — those override the simple-mode auto-construction.

Args:
  - act_id (string): Ad account ID prefixed with 'act_'
  - name (string, optional): Creative name
  - page_id (string, optional)
  - link_url (string, optional): Destination URL
  - image_hash (string, optional): From upload_ad_image
  - video_id (string, optional)
  - thumbnail_url (string, optional): Video thumbnail
  - message / headline / description (string, optional): Ad copy
  - call_to_action_type (string, optional): e.g., LEARN_MORE, SHOP_NOW, BOOK_NOW, SIGN_UP
  - object_story_id (string, optional): Mode 1
  - object_story_spec (object, optional): Full spec — overrides the auto-built one
  - asset_feed_spec (object, optional): For multi-variant / FLEX creatives
  - url_tags (string, optional): UTM params appended to the URL`,
      inputSchema: z
        .object({
          act_id: z.string(),
          name: z.string().optional(),
          page_id: z.string().optional(),
          link_url: z.string().optional(),
          image_hash: z.string().optional(),
          video_id: z.string().optional(),
          thumbnail_url: z.string().optional(),
          message: z.string().optional(),
          headline: z.string().optional(),
          description: z.string().optional(),
          call_to_action_type: z.string().optional(),
          object_story_id: z.string().optional(),
          object_story_spec: z.record(z.unknown()).optional(),
          asset_feed_spec: z.record(z.unknown()).optional(),
          url_tags: z.string().optional(),
        })
        .refine(
          (v) =>
            Boolean(v.object_story_id) ||
            Boolean(v.object_story_spec) ||
            Boolean(v.asset_feed_spec) ||
            Boolean(v.image_hash) ||
            Boolean(v.video_id),
          {
            message:
              "Provide at least one of: object_story_id, object_story_spec, asset_feed_spec, image_hash, video_id.",
          }
        ),
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
        if (args.name) params.name = args.name;
        if (args.url_tags) params.url_tags = args.url_tags;
        if (args.object_story_id) params.object_story_id = args.object_story_id;

        // If caller passed a full spec, prefer it verbatim. Otherwise build a
        // minimal one from the simple-mode fields.
        let spec = args.object_story_spec;
        if (!spec && !args.object_story_id) {
          if (!args.page_id) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      error:
                        "page_id is required when building a creative from simple fields (no object_story_id or object_story_spec).",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
          if (args.video_id) {
            const video_data: Record<string, unknown> = { video_id: args.video_id };
            if (args.message) video_data.message = args.message;
            if (args.headline) video_data.title = args.headline;
            if (args.link_url) video_data.link_description = args.link_url;
            if (args.thumbnail_url) video_data.image_url = args.thumbnail_url;
            if (args.call_to_action_type) {
              video_data.call_to_action = {
                type: args.call_to_action_type,
                value: args.link_url ? { link: args.link_url } : {},
              };
            }
            spec = { page_id: args.page_id, video_data };
          } else if (args.image_hash) {
            const link_data: Record<string, unknown> = {};
            if (args.link_url) link_data.link = args.link_url;
            if (args.message) link_data.message = args.message;
            if (args.headline) link_data.name = args.headline;
            if (args.description) link_data.description = args.description;
            link_data.image_hash = args.image_hash;
            if (args.call_to_action_type) {
              link_data.call_to_action = {
                type: args.call_to_action_type,
                value: args.link_url ? { link: args.link_url } : {},
              };
            }
            spec = { page_id: args.page_id, link_data };
          }
        }

        if (spec) params.object_story_spec = JSON.stringify(spec);
        if (args.asset_feed_spec) {
          params.asset_feed_spec = JSON.stringify(args.asset_feed_spec);
        }

        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${args.act_id}/adcreatives`;
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
    "meta_ads_update_ad_creative",
    {
      title: "Update Meta Ad Creative",
      description: `Update an existing creative. Meta restricts what can change on a saved
creative: 'name' is reliably updatable; content fields (message, headline, image, link)
are typically rejected. To change ad content, create a new creative and re-point the ad
via meta_ads_update_ad(creative_id=...).`,
      inputSchema: z.object({
        creative_id: z.string(),
        name: z.string().optional(),
        asset_feed_spec: z.record(z.unknown()).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ creative_id, name, asset_feed_spec }) => {
      try {
        const params: Record<string, unknown> = {};
        if (name !== undefined) params.name = name;
        if (asset_feed_spec !== undefined) {
          params.asset_feed_spec = JSON.stringify(asset_feed_spec);
        }
        if (Object.keys(params).length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { error: "No update parameters provided (name or asset_feed_spec)." },
                  null,
                  2
                ),
              },
            ],
          };
        }
        const data = await postNode(creative_id, params);
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
