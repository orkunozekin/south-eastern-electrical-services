import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "@/components/site-footer";

function renderFooter() {
  const html = renderToStaticMarkup(createElement(SiteFooter));
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  return { html, text };
}

describe("SiteFooter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the client copyright and adds the Studio Artemis LLC credit for the current year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-03-01T12:00:00Z"));
    const { text } = renderFooter();
    expect(text).toContain(
      "© 2027 Southeastern Electrical Services. All rights reserved.",
    );
    expect(text).toContain("© 2027 Studio Artemis LLC. All rights reserved.");
  });

  it("links the company name to the Studio Artemis site in a new tab", () => {
    const { html } = renderFooter();
    const link = html.match(/<a [^>]*>Studio Artemis LLC<\/a>/)?.[0];
    expect(link).toBeDefined();
    expect(link).toContain('href="https://studioartemis.io"');
    expect(link).toContain('target="_blank"');
    expect(link).toContain('rel="noopener noreferrer"');
  });
});
