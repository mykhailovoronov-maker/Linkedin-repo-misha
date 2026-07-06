import { test } from "node:test";
import assert from "node:assert/strict";
import { appendTrackingTemplate } from "./tracking.ts";

const template =
  "utm_source=linkedin&utm_medium=paid-social&utm_campaign={campaign_name}&utm_content={campaign_id}";

test("appends tracking params to a bare URL", () => {
  const out = appendTrackingTemplate("https://example.com/landing", template, {
    campaignName: "Q3 Launch",
    campaignId: "urn:li:sponsoredCampaign:123",
  });
  const url = new URL(out);
  assert.equal(url.searchParams.get("utm_source"), "linkedin");
  assert.equal(url.searchParams.get("utm_campaign"), "Q3 Launch");
  assert.equal(
    url.searchParams.get("utm_content"),
    "urn:li:sponsoredCampaign:123",
  );
});

test("preserves existing query params", () => {
  const out = appendTrackingTemplate(
    "https://example.com/p?ref=abc",
    template,
    { campaignName: "Test" },
  );
  const url = new URL(out);
  assert.equal(url.searchParams.get("ref"), "abc");
  assert.equal(url.searchParams.get("utm_source"), "linkedin");
});

test("template params override collisions", () => {
  const out = appendTrackingTemplate(
    "https://example.com/p?utm_source=organic",
    template,
    { campaignName: "Test" },
  );
  assert.equal(new URL(out).searchParams.get("utm_source"), "linkedin");
});

test("skips unresolved placeholders (no campaign id yet)", () => {
  const out = appendTrackingTemplate("https://example.com", template, {
    campaignName: "Draft",
  });
  assert.equal(new URL(out).searchParams.has("utm_content"), false);
});

test("rejects non-http URLs", () => {
  assert.throws(() =>
    appendTrackingTemplate("ftp://example.com", template, {
      campaignName: "x",
    }),
  );
});

test("rejects invalid URLs", () => {
  assert.throws(() =>
    appendTrackingTemplate("not a url", template, { campaignName: "x" }),
  );
});
