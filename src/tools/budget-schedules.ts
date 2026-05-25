import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FB_GRAPH_URL, isWriteToolsEnabled } from "../constants.js";
import { getAccessToken, makeGraphApiPostCall, handleApiError } from "../services/graph-api.js";

export function registerBudgetScheduleTools(server: McpServer): void {
  // Gated — creates a Meta resource that affects live delivery.
  if (!isWriteToolsEnabled()) return;

  server.registerTool(
    "meta_ads_create_budget_schedule",
    {
      title: "Create Meta Campaign Budget Schedule",
      description: `Schedule a temporary budget change for a campaign during a high-demand period.
Times are Unix timestamps (seconds).

Args:
  - campaign_id (string)
  - budget_value (number): Either an absolute amount in account currency cents, or a
    multiplier of the current budget (depending on budget_value_type).
  - budget_value_type ("ABSOLUTE" | "MULTIPLIER"): How to interpret budget_value.
  - time_start (number): Unix timestamp when the schedule activates.
  - time_end (number): Unix timestamp when the schedule deactivates.`,
      inputSchema: z
        .object({
          campaign_id: z.string(),
          budget_value: z.number().int().positive(),
          budget_value_type: z.enum(["ABSOLUTE", "MULTIPLIER"]),
          time_start: z.number().int().positive(),
          time_end: z.number().int().positive(),
        })
        .refine((v) => v.time_end > v.time_start, {
          message: "time_end must be greater than time_start.",
        }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ campaign_id, budget_value, budget_value_type, time_start, time_end }) => {
      try {
        const token = getAccessToken();
        const url = `${FB_GRAPH_URL}/${campaign_id}/budget_schedules`;
        const data = await makeGraphApiPostCall(url, {
          access_token: token,
          budget_value,
          budget_value_type,
          time_start,
          time_end,
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
