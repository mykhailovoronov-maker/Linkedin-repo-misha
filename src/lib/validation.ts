import { z } from "zod";
import { AUDIENCES } from "./audiences";

const audienceIds = AUDIENCES.map((a) => a.id) as [string, ...string[]];

export const campaignInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Campaign name must be at least 3 characters")
    .max(255),
  audienceId: z.enum(audienceIds, {
    errorMap: () => ({ message: "Select a valid audience" }),
  }),
  dailyBudget: z
    .number({ invalid_type_error: "Daily budget must be a number" })
    .positive("Daily budget must be greater than 0")
    .max(1_000_000, "Daily budget is unreasonably large"),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code")
    .transform((c) => c.toUpperCase())
    .default("USD"),
  destinationUrl: z
    .string()
    .trim()
    .url("Destination URL must be a valid URL")
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "Destination URL must start with http:// or https://",
    ),
  imageUrl: z.string().trim().url("A creative image is required"),
});

export type ValidatedCampaignInput = z.infer<typeof campaignInputSchema>;
