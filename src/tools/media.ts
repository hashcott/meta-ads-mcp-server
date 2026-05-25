import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";
import { FB_GRAPH_URL, isWriteToolsEnabled } from "../constants.js";
import {
  getAccessToken,
  makeGraphApiCall,
  makeGraphApiPostCall,
  prepareParams,
  handleApiError,
} from "../services/graph-api.js";
import { PaginationSchema } from "../schemas/common.js";

export function registerMediaTools(server: McpServer): void {
  server.registerTool(
    "meta_ads_get_ad_images",
    {
      title: "Get Meta Ad Images",
      description: `Retrieve ad images belonging to a Meta ad account.

Useful for auditing image assets, finding images by hash or name, and checking image dimensions and status.

Args:
  - act_id (string): Ad account ID prefixed with 'act_', e.g., 'act_1234567890'
  - fields (string[]): Fields to retrieve. Available: id, account_id, created_time, creatives, hash, height, is_associated_creatives_in_adgroups, name, original_height, original_width, permalink_url, status, updated_time, url, url_128, width
  - hashes (string[]): Filter by specific image hashes
  - name (string): Filter images by name (partial match)
  - minwidth (number): Minimum image width in pixels
  - minheight (number): Minimum image height in pixels
  - limit (number): Results per page (1-100, default: 25)
  - after / before (string): Pagination cursors

Returns:
  Object with data (image array) and paging. Each image contains URL, dimensions, hash, and status.
  Use meta_ads_fetch_pagination_url with paging.next for more results.

Examples:
  - Use when: "List all images in my ad account"
  - Use when: "Find images with hashes abc123 and def456"
  - Use when: "Show images wider than 1000px"`,
      inputSchema: z
        .object({
          act_id: z
            .string()
            .describe("Ad account ID prefixed with 'act_', e.g., 'act_1234567890'"),
          fields: z
            .array(z.string())
            .optional()
            .describe(
              "Fields to retrieve. Available: id, account_id, created_time, creatives, hash, height, is_associated_creatives_in_adgroups, name, original_height, original_width, permalink_url, status, updated_time, url, url_128, width"
            ),
          hashes: z
            .array(z.string())
            .optional()
            .describe("Filter by specific image hashes, e.g., ['abc123', 'def456']"),
          name: z
            .string()
            .optional()
            .describe("Filter images by name (partial match)"),
          minwidth: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Minimum image width in pixels"),
          minheight: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Minimum image height in pixels"),
        })
        .merge(PaginationSchema),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ act_id, fields, hashes, name, minwidth, minheight, limit, after, before }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/adimages`;

        const opts: Record<string, unknown> = { limit, after, before };
        if (fields && fields.length > 0) opts.fields = fields.join(",");
        if (hashes && hashes.length > 0) opts.hashes = JSON.stringify(hashes);
        if (name) opts.name = name;
        if (minwidth !== undefined) opts.minwidth = minwidth;
        if (minheight !== undefined) opts.minheight = minheight;

        const params = prepareParams({ access_token: token }, opts);
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
    "meta_ads_get_ad_previews",
    {
      title: "Get Meta Ad Previews",
      description: `Generate preview links or embed HTML for a Meta ad in various ad formats and placements.

Allows you to see how an ad looks across different placements (Facebook feed, Instagram, Stories, etc.) before or after publishing.

Args:
  - ad_id (string): Ad ID to preview, e.g., '23843211234567'
  - ad_format (string): Preview format. Options: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, MOBILE_FEED_BASIC, MOBILE_INTERSTITIAL, MOBILE_BANNER, MOBILE_MEDIUM_RECTANGLE, MOBILE_FULLWIDTH, RIGHT_COLUMN_STANDARD, INSTAGRAM_STANDARD, INSTAGRAM_STORY, AUDIENCE_NETWORK_OUTSTREAM_VIDEO, AUDIENCE_NETWORK_INSTREAM_VIDEO, FACEBOOK_STORY_MOBILE, MESSENGER_MOBILE_INBOX_MEDIA, SUGGESTED_VIDEO_MOBILE, WATCH_FEED_MOBILE, FACEBOOK_REELS_MOBILE, INSTAGRAM_REELS
  - locale (string): Locale for the preview, e.g., 'en_US'
  - start_date (string): Preview start date for scheduled ads (UNIX timestamp)
  - end_date (string): Preview end date for scheduled ads (UNIX timestamp)

Returns:
  Object with data array. Each item contains:
  - body (string): HTML iframe embed code for the preview
  - encoded_creative_id (string): Encoded creative ID

Examples:
  - Use when: "Show me how ad 23843211234567 looks on Instagram"
  - Use when: "Preview this ad in desktop feed format"
  - Use when: "Generate previews for all placements of this ad"`,
      inputSchema: z.object({
        ad_id: z.string().describe("Ad ID to preview, e.g., '23843211234567'"),
        ad_format: z
          .enum([
            "DESKTOP_FEED_STANDARD",
            "MOBILE_FEED_STANDARD",
            "MOBILE_FEED_BASIC",
            "MOBILE_INTERSTITIAL",
            "MOBILE_BANNER",
            "MOBILE_MEDIUM_RECTANGLE",
            "MOBILE_FULLWIDTH",
            "RIGHT_COLUMN_STANDARD",
            "INSTAGRAM_STANDARD",
            "INSTAGRAM_STORY",
            "AUDIENCE_NETWORK_OUTSTREAM_VIDEO",
            "AUDIENCE_NETWORK_INSTREAM_VIDEO",
            "FACEBOOK_STORY_MOBILE",
            "MESSENGER_MOBILE_INBOX_MEDIA",
            "SUGGESTED_VIDEO_MOBILE",
            "WATCH_FEED_MOBILE",
            "FACEBOOK_REELS_MOBILE",
            "INSTAGRAM_REELS",
          ])
          .optional()
          .describe(
            "Preview format/placement. Options: DESKTOP_FEED_STANDARD, MOBILE_FEED_STANDARD, INSTAGRAM_STANDARD, INSTAGRAM_STORY, FACEBOOK_STORY_MOBILE, FACEBOOK_REELS_MOBILE, INSTAGRAM_REELS, RIGHT_COLUMN_STANDARD, MESSENGER_MOBILE_INBOX_MEDIA, etc."
          ),
        locale: z
          .string()
          .optional()
          .describe("Locale for the preview, e.g., 'en_US', 'vi_VN'"),
        start_date: z
          .string()
          .optional()
          .describe("Preview start date as UNIX timestamp (for scheduled ads)"),
        end_date: z
          .string()
          .optional()
          .describe("Preview end date as UNIX timestamp (for scheduled ads)"),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ ad_id, ad_format, locale, start_date, end_date }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${ad_id}/previews`;
        const opts: Record<string, unknown> = {};
        if (ad_format) opts.ad_format = ad_format;
        if (locale) opts.locale = locale;
        if (start_date) opts.start_date = start_date;
        if (end_date) opts.end_date = end_date;

        const params = prepareParams({ access_token: token }, opts);
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
  // dangerous mutations don't ship by default.
  if (!isWriteToolsEnabled()) return;

  server.registerTool(
    "meta_ads_upload_ad_image",
    {
      title: "Upload Meta Ad Image",
      description: `Upload an image to a Meta ad account's ad images library. Returns the image
hash, which is what create_ad_creative consumes (image_hash field).

Supply EXACTLY ONE of:
  - file: a data URL ("data:image/png;base64,iVBORw0KG...") or a raw base64 string
  - image_url: a publicly fetchable URL — the server downloads the bytes and uploads them

Args:
  - act_id (string): Ad account ID prefixed with 'act_'
  - file (string, optional): Data URL or raw base64 of the image
  - image_url (string, optional): Public URL to fetch the image from
  - name (string, optional): Friendly filename — Meta uses this as the image asset name

Returns:
  { images: { "<name>": { hash, url, width, height } } } — the Meta CDN url can be opened directly.`,
      inputSchema: z
        .object({
          act_id: z.string(),
          file: z.string().optional(),
          image_url: z.string().url().optional(),
          name: z.string().optional(),
        })
        .refine((v) => Boolean(v.file) !== Boolean(v.image_url), {
          message: "Provide exactly one of 'file' or 'image_url'.",
        }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ act_id, file, image_url, name }) => {
      try {
        let encoded: string;
        let inferredName = name ?? "";

        if (file) {
          const dataPrefix = "data:";
          const marker = "base64,";
          if (file.startsWith(dataPrefix) && file.includes(marker)) {
            const [header, payload] = file.split(marker, 2);
            encoded = payload.trim();
            if (!inferredName) {
              const mime = header.slice(dataPrefix.length).split(";")[0].trim();
              const ext =
                { "image/png": ".png", "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/webp": ".webp", "image/gif": ".gif" }[
                  mime
                ] ?? ".png";
              inferredName = `upload${ext}`;
            }
          } else {
            encoded = file.trim();
            if (!inferredName) inferredName = "upload.png";
          }
        } else {
          const resp = await axios.get<ArrayBuffer>(image_url!, {
            responseType: "arraybuffer",
            timeout: 30000,
          });
          encoded = Buffer.from(resp.data).toString("base64");
          if (!inferredName) {
            const cleaned = image_url!.split("?")[0];
            const last = cleaned.substring(cleaned.lastIndexOf("/") + 1);
            inferredName = last || "upload.jpg";
          }
        }

        const finalName = name ?? inferredName;
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${act_id}/adimages`;
        const data = await makeGraphApiPostCall(url, {
          access_token: token,
          bytes: encoded,
          name: finalName,
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
}
