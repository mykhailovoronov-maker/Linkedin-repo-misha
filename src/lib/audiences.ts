import type { Audience } from "./types";

/**
 * Predefined audiences the user can choose from. Each maps to a LinkedIn
 * `targetingCriteria` payload. URNs use LinkedIn's standardized facet values;
 * swap in your own saved audiences or matched audiences as needed.
 */
export const AUDIENCES: Audience[] = [
  {
    id: "tech-decision-makers-us",
    name: "US Tech Decision Makers",
    description:
      "Senior+ seniority in IT / Engineering functions, United States.",
    targetingCriteria: {
      include: {
        and: [
          { or: { "urn:li:adTargetingFacet:locations": ["urn:li:geo:103644278"] } },
          {
            or: {
              "urn:li:adTargetingFacet:jobFunctions": [
                "urn:li:function:13", // Engineering
                "urn:li:function:20", // Information Technology
              ],
            },
          },
          {
            or: {
              "urn:li:adTargetingFacet:seniorities": [
                "urn:li:seniority:7", // Director
                "urn:li:seniority:8", // VP
                "urn:li:seniority:9", // CXO
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: "marketing-leaders-emea",
    name: "EMEA Marketing Leaders",
    description: "Marketing function, Manager+ seniority across EMEA.",
    targetingCriteria: {
      include: {
        and: [
          {
            or: {
              "urn:li:adTargetingFacet:locations": [
                "urn:li:geo:91000000", // EMEA region
              ],
            },
          },
          {
            or: {
              "urn:li:adTargetingFacet:jobFunctions": [
                "urn:li:function:25", // Marketing
              ],
            },
          },
          {
            or: {
              "urn:li:adTargetingFacet:seniorities": [
                "urn:li:seniority:5", // Manager
                "urn:li:seniority:6", // Senior
                "urn:li:seniority:7", // Director
                "urn:li:seniority:8", // VP
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: "startup-founders-global",
    name: "Startup Founders (Global)",
    description: "Owner / Founder titles at companies with 1–200 employees.",
    targetingCriteria: {
      include: {
        and: [
          {
            or: {
              "urn:li:adTargetingFacet:seniorities": [
                "urn:li:seniority:10", // Owner / Partner
              ],
            },
          },
          {
            or: {
              "urn:li:adTargetingFacet:staffCountRanges": [
                "urn:li:staffCountRange:(1,10)",
                "urn:li:staffCountRange:(11,50)",
                "urn:li:staffCountRange:(51,200)",
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: "hr-people-ops-us",
    name: "US HR & People Ops",
    description: "Human Resources function, all seniorities, United States.",
    targetingCriteria: {
      include: {
        and: [
          {
            or: {
              "urn:li:adTargetingFacet:locations": ["urn:li:geo:103644278"],
            },
          },
          {
            or: {
              "urn:li:adTargetingFacet:jobFunctions": [
                "urn:li:function:14", // Human Resources
              ],
            },
          },
        ],
      },
    },
  },
];

export function getAudienceById(id: string): Audience | undefined {
  return AUDIENCES.find((a) => a.id === id);
}
