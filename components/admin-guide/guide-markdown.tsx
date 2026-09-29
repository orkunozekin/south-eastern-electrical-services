import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

/** Assigns precomputed ids to headings in document order. */
function rehypeHeadingIds(ids: string[]) {
  return () => (tree: HastNode) => {
    let index = 0;
    const visit = (node: HastNode) => {
      if (node.type === "element" && /^h[1-6]$/.test(node.tagName ?? "")) {
        const id = ids[index++];
        if (id) node.properties = { ...node.properties, id };
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}

function HeadingAnchor({ id }: { id?: string }) {
  if (!id) return null;
  return (
    <a
      href={`#${id}`}
      aria-label="Link to this section"
      className="text-amber ml-2 opacity-0 transition group-hover:opacity-100 focus:opacity-100 print:hidden"
    >
      #
    </a>
  );
}

const components: Components = {
  h3: ({ id, children }) => (
    <h3
      id={id}
      className="group font-display text-navy scroll-mt-6 text-2xl font-semibold tracking-tight uppercase"
    >
      {children}
      <HeadingAnchor id={id} />
    </h3>
  ),
  h4: ({ id, children }) => (
    <h4 id={id} className="group text-navy scroll-mt-6 text-lg font-semibold">
      {children}
      <HeadingAnchor id={id} />
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-slate text-[1.0625rem] leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="text-navy font-semibold">{children}</strong>
  ),
  ul: ({ children }) => (
    <ul className="marker:text-amber list-disc space-y-2 pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="marker:text-navy list-decimal space-y-2 pl-6 marker:font-semibold">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-slate pl-1 text-[1.0625rem] leading-relaxed [&>ol]:mt-2 [&>ul]:mt-2">
      {children}
    </li>
  ),
  code: ({ children }) => (
    <code className="border-navy/10 bg-navy/[0.05] text-navy rounded border px-1.5 py-0.5 font-mono text-[0.875em] break-words">
      {children}
    </code>
  ),
  a: ({ href = "", children }) => {
    const className =
      "text-navy decoration-amber hover:bg-amber/15 font-medium underline decoration-2 underline-offset-4 transition";
    if (href.startsWith("#") || href.startsWith("/")) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <aside className="border-amber bg-amber/10 border-l-4 px-5 py-4 [&_p]:text-[1rem] [&>*+*]:mt-3">
      <p className="font-display text-navy text-xs font-semibold tracking-[0.16em] uppercase">
        Good to know
      </p>
      {children}
    </aside>
  ),
  table: ({ children }) => (
    <div className="border-navy/10 overflow-x-auto border bg-white">
      <table className="w-full min-w-[32rem] border-collapse text-left text-[0.95rem]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-navy text-white print:bg-white print:text-black">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-paper border-navy/10 border-t first:border-t-0">
      {children}
    </tr>
  ),
  td: ({ children }) => (
    <td className="text-slate px-4 py-3 align-top leading-relaxed">
      {children}
    </td>
  ),
  hr: () => <hr className="border-navy/10" />,
};

type GuideMarkdownProps = {
  markdown: string;
  headingIds?: string[];
};

export function GuideMarkdown({
  markdown,
  headingIds = [],
}: GuideMarkdownProps) {
  return (
    <div className="guide-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHeadingIds(headingIds)]}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
