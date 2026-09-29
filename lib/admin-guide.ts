import { readFile } from "node:fs/promises";
import path from "node:path";

import GithubSlugger from "github-slugger";

import { GUIDE_SECTION_IDS } from "@/lib/admin-guide-links";

/** Kept in sync with `outputFileTracingIncludes` in `next.config.ts`. */
const GUIDE_FILE = path.join(process.cwd(), "docs", "admin-guide.md");

export type GuideHeading = {
  id: string;
  depth: 2 | 3;
  /** Leading section number from `## 4. Bookings page`, if any. */
  number: string | null;
  title: string;
};

export type GuideSection = GuideHeading & {
  /** Section markdown without its own `##` heading line. */
  markdown: string;
  /** Ids for every heading inside `markdown`, in document order. */
  headingIds: string[];
  subheadings: GuideHeading[];
};

export type AdminGuide = {
  title: string;
  intro: string;
  sections: GuideSection[];
};

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/gm;

function plainText(markdown: string): string {
  return markdown
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/_([^_]*)_/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}

function toHeading(depth: 2 | 3, text: string, id: string): GuideHeading {
  const numbered = /^(\d+(?:\.\d+)*)\.?\s+(.*)$/.exec(text);
  return {
    id,
    depth,
    number: numbered ? numbered[1]! : null,
    title: numbered ? numbered[2]! : text,
  };
}

/**
 * Splits `docs/admin-guide.md` into its title, intro, and numbered `##`
 * sections. The markdown's own "Contents" list is dropped because the page
 * renders a navigable table of contents instead.
 *
 * Heading ids come from one github-slugger pass over the whole body, the same
 * way GitHub builds anchors, so in-guide links like `#6-settings-page` resolve
 * both on GitHub and on the page.
 */
export async function loadAdminGuide(): Promise<AdminGuide> {
  const source = (await readFile(GUIDE_FILE, "utf8")).replace(/\r\n/g, "\n");

  const titleMatch = /^#\s+(.+)$/m.exec(source);
  const title = titleMatch
    ? plainText(titleMatch[1]!).replace(/^.*?—\s*/, "")
    : "Admin guide";

  const firstSection = source.search(/^##\s+1\.\s/m);
  const contents = source.search(/^##\s+Contents\s*$/m);
  const introStart = titleMatch ? titleMatch.index + titleMatch[0].length : 0;
  const introEnd = contents >= 0 ? contents : Math.max(firstSection, 0);

  const intro = source
    .slice(introStart, introEnd)
    .replace(/\n-{3,}\s*$/, "")
    .trim();
  const body = firstSection >= 0 ? source.slice(firstSection) : source;

  const slugger = new GithubSlugger();
  const sections: GuideSection[] = [];

  for (const chunk of body.split(/^(?=##\s)/m)) {
    const [headingLine = "", ...rest] = chunk.split("\n");
    const sectionText = plainText(headingLine.replace(/^##\s+/, ""));
    if (!sectionText) continue;

    const markdown = rest
      .join("\n")
      .replace(/\n-{3,}\s*$/, "")
      .trim();
    const section: GuideSection = {
      ...toHeading(2, sectionText, slugger.slug(sectionText)),
      markdown,
      headingIds: [],
      subheadings: [],
    };

    for (const match of markdown.matchAll(HEADING_RE)) {
      const depth = match[1]!.length;
      const text = plainText(match[2]!);
      const id = slugger.slug(text);
      section.headingIds.push(id);
      if (depth === 3) section.subheadings.push(toHeading(3, text, id));
    }

    sections.push(section);
  }

  if (process.env.NODE_ENV !== "production") {
    const ids = new Set(sections.map((s) => s.id));
    for (const [key, id] of Object.entries(GUIDE_SECTION_IDS)) {
      if (!ids.has(id)) {
        console.warn(
          `[admin-guide] GUIDE_SECTION_IDS.${key} ("${id}") no longer matches a heading in docs/admin-guide.md.`,
        );
      }
    }
  }

  return { title, intro, sections };
}
