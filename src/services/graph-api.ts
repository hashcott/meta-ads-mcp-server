import axios, { AxiosError } from "axios";
import { FB_GRAPH_URL } from "../constants.js";
import type { InsightsParams, PrepareParamsOptions } from "../types.js";

let accessToken: string | null = null;

/**
 * Get the Meta/Facebook access token from CLI args or environment variable.
 * Caches after first read. Priority: --access-token arg > META_ADS_ACCESS_TOKEN env var.
 */
export function getAccessToken(): string {
  if (accessToken) return accessToken;

  const argIndex = process.argv.indexOf("--access-token");
  if (argIndex !== -1 && argIndex + 1 < process.argv.length) {
    accessToken = process.argv[argIndex + 1];
    return accessToken;
  }

  if (process.env.META_ADS_ACCESS_TOKEN) {
    accessToken = process.env.META_ADS_ACCESS_TOKEN;
    return accessToken;
  }

  throw new Error(
    "Meta Ads access token is required. Provide it via --access-token argument or META_ADS_ACCESS_TOKEN environment variable."
  );
}

/**
 * Make a GET request to the Facebook Graph API.
 */
export async function makeGraphApiCall(
  url: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const response = await axios.get(url, {
    params,
    timeout: 30000,
  });
  return response.data;
}

/**
 * Make a POST request to the Facebook Graph API.
 *
 * Meta expects form-encoded bodies for writes — not JSON.
 */
export async function makeGraphApiPostCall(
  url: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    form.append(key, typeof value === "string" ? value : String(value));
  }
  const response = await axios.post(url, form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 30000,
  });
  return response.data;
}

/**
 * Make a DELETE request to the Facebook Graph API.
 *
 * Meta returns {"success": true} on a deletion.
 */
export async function makeGraphApiDeleteCall(
  url: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const response = await axios.delete(url, {
    params,
    timeout: 30000,
  });
  return response.data;
}

/**
 * POST to a Graph API node or edge.
 */
export async function postNode(
  path: string,
  options: PrepareParamsOptions = {}
): Promise<unknown> {
  const token = getAccessToken();
  const url = `${FB_GRAPH_URL}/${path}`;
  const params = prepareParams({ access_token: token }, options);
  return makeGraphApiPostCall(url, params);
}

/**
 * DELETE a Graph API node.
 */
export async function deleteNode(nodeId: string): Promise<unknown> {
  const token = getAccessToken();
  const url = `${FB_GRAPH_URL}/${nodeId}`;
  return makeGraphApiDeleteCall(url, { access_token: token });
}

/**
 * JSON-encode values that the Graph API expects as JSON strings.
 */
const JSON_ENCODED_KEYS = new Set([
  "filtering",
  "time_range",
  "time_ranges",
  "effective_status",
  "special_ad_categories",
  "objective",
  "buyer_guarantee_agreement_status",
  // write-side keys that Meta expects as JSON strings
  "targeting",
  "promoted_object",
  "tracking_specs",
  "creative",
  "adset_budgets",
  "ab_test_control_setups",
  "bid_constraints",
  "bid_adjustments",
  "frequency_control_specs",
  "regional_regulated_categories",
  "regional_regulation_identities",
  "attribution_spec",
]);

/**
 * Comma-join values that the Graph API expects as comma-separated strings.
 */
const CSV_KEYS = new Set([
  "fields",
  "action_attribution_windows",
  "action_breakdowns",
  "breakdowns",
]);

/**
 * Build a params object from a base set plus optional kwargs, encoding complex types correctly.
 */
export function prepareParams(
  baseParams: Record<string, unknown>,
  options: PrepareParamsOptions
): Record<string, unknown> {
  const params: Record<string, unknown> = { ...baseParams };

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;

    if (JSON_ENCODED_KEYS.has(key) && (Array.isArray(value) || typeof value === "object")) {
      params[key] = JSON.stringify(value);
    } else if (CSV_KEYS.has(key) && Array.isArray(value)) {
      params[key] = (value as string[]).join(",");
    } else {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Fetch a single Graph API node by its ID.
 */
export async function fetchNode(
  nodeId: string,
  options: PrepareParamsOptions = {}
): Promise<unknown> {
  const token = getAccessToken();
  const url = `${FB_GRAPH_URL}/${nodeId}`;
  const params = prepareParams({ access_token: token }, options);
  return makeGraphApiCall(url, params);
}

/**
 * Fetch a collection (edge) from a parent node.
 */
export async function fetchEdge(
  parentId: string,
  edgeName: string,
  options: PrepareParamsOptions = {}
): Promise<unknown> {
  const token = getAccessToken();
  const url = `${FB_GRAPH_URL}/${parentId}/${edgeName}`;
  const params = prepareParams({ access_token: token }, options);
  return makeGraphApiCall(url, params);
}

/**
 * Build the params dictionary for insights API calls, handling time precedence rules.
 */
export function buildInsightsParams(
  baseParams: Record<string, unknown>,
  opts: InsightsParams
): Record<string, unknown> {
  const {
    fields,
    date_preset,
    time_range,
    time_ranges,
    time_increment,
    level,
    action_attribution_windows,
    action_breakdowns,
    action_report_time,
    breakdowns,
    default_summary,
    use_account_attribution_setting,
    use_unified_attribution_setting,
    filtering,
    sort,
    limit,
    after,
    before,
    offset,
    since,
    until,
    locale,
  } = opts;

  let params = prepareParams(baseParams, {
    fields,
    level,
    action_attribution_windows,
    action_breakdowns,
    action_report_time,
    breakdowns,
    filtering,
    sort,
    limit,
    after,
    before,
    offset,
    locale,
  });

  // Time range logic: time_ranges > time_range > since/until > date_preset
  const hasExplicitTime = time_range || time_ranges || since || until;

  if (!hasExplicitTime && date_preset) {
    params.date_preset = date_preset;
  }
  if (time_range) {
    params.time_range = JSON.stringify(time_range);
  }
  if (time_ranges) {
    params.time_ranges = JSON.stringify(time_ranges);
  }
  if (time_increment && time_increment !== "all_days") {
    params.time_increment = time_increment;
  }
  if (!time_range && !time_ranges) {
    if (since) params.since = since;
    if (until) params.until = until;
  }

  if (default_summary) params.default_summary = "true";
  if (use_account_attribution_setting) params.use_account_attribution_setting = "true";
  if (use_unified_attribution_setting) params.use_unified_attribution_setting = "true";

  return params;
}

/**
 * Handle Axios errors and return an actionable error message string.
 */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ error?: { message?: string; code?: number } }>;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const fbError = axiosErr.response.data?.error;
      const fbMsg = fbError?.message ? ` Meta API: ${fbError.message}` : "";
      switch (status) {
        case 400:
          return `Error: Bad request — check your parameters.${fbMsg}`;
        case 401:
          return `Error: Authentication failed — your access token may be invalid or expired.${fbMsg}`;
        case 403:
          return `Error: Permission denied — ensure your token has the required permissions (ads_read).${fbMsg}`;
        case 404:
          return `Error: Resource not found — check the ID is correct.${fbMsg}`;
        case 429:
          return `Error: Rate limit exceeded — please wait before retrying.${fbMsg}`;
        default:
          return `Error: API request failed with status ${status}.${fbMsg}`;
      }
    }
    if (axiosErr.code === "ECONNABORTED") {
      return "Error: Request timed out. Please try again.";
    }
    if (axiosErr.code === "ENOTFOUND") {
      return "Error: Network error — cannot reach the Meta Graph API. Check your internet connection.";
    }
  }
  return `Error: Unexpected error — ${error instanceof Error ? error.message : String(error)}`;
}
