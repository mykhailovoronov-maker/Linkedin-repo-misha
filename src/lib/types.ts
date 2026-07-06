export interface Audience {
  /** Stable identifier used by the form and stored with the campaign. */
  id: string;
  name: string;
  description: string;
  /**
   * LinkedIn targeting criteria, shaped like the `targetingCriteria` object of
   * the Ad Campaigns API. Kept as data so audiences are pure configuration.
   */
  targetingCriteria: TargetingCriteria;
}

export interface TargetingCriteria {
  include: {
    and: Array<{
      or: Record<string, string[]>;
    }>;
  };
}

export interface CampaignInput {
  name: string;
  audienceId: string;
  /** Whole-currency units per day, e.g. 50 = $50.00/day. */
  dailyBudget: number;
  currency: string;
  destinationUrl: string;
  /** Public URL of the creative image (already uploaded to storage). */
  imageUrl: string;
}

export type CampaignStatus =
  | "draft"
  | "launching"
  | "active"
  | "failed";

export interface CampaignRecord extends CampaignInput {
  id?: string;
  /** Email of the signed-in user who created the campaign. */
  userEmail: string;
  audienceName: string;
  /** destinationUrl with the tracking template merged in. */
  trackedUrl: string;
  status: CampaignStatus;
  linkedinCampaignId?: string | null;
  linkedinCreativeId?: string | null;
  error?: string | null;
  createdAt?: string;
}

export interface LaunchResult {
  campaignId: string;
  creativeId: string;
  /** True when the launch was simulated because LinkedIn is not configured. */
  dryRun: boolean;
}
