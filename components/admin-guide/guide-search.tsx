"use client";

import { useRef, useState } from "react";

type SearchSection = { id: string; title: string };
type SearchEntry = SearchSection & { text: string; searchable: string };

export function GuideSearch({ sections }: { sections: SearchSection[] }) {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = terms.length
    ? entries.filter((entry) =>
        terms.every((term) => entry.searchable.includes(term)),
      )
    : [];

  function search(value: string) {
    // Index the rendered guide once, so formatting and link URLs aren't searched.
    if (entries.length === 0) {
      setEntries(
        sections.map((section) => {
          const content = document
            .getElementById(section.id)
            ?.querySelector<HTMLElement>(".guide-prose");
          const text = (content?.innerText ?? "").replace(/\s+/g, " ").trim();
          return {
            ...section,
            text,
            searchable: `${section.title} ${text}`.toLowerCase(),
          };
        }),
      );
    }
    setQuery(value);
  }

  return (
    <div
      role="search"
      aria-label="User guide"
      className="relative mt-8 print:hidden"
    >
      <label htmlFor="guide-search" className="block text-sm font-semibold">
        Search this guide
      </label>
      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          id="guide-search"
          type="search"
          value={query}
          onChange={(event) => search(event.target.value)}
          placeholder="Try cancelling a booking or weekly hours"
          aria-controls="guide-search-results"
          className="text-navy focus:outline-amber min-w-0 flex-1 rounded border border-white/30 bg-white px-4 py-3 focus:outline-2 focus:outline-offset-2"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="rounded border border-white/30 px-4 py-2 font-semibold hover:bg-white/10"
          >
            Clear
          </button>
        )}
      </div>
      <p role="status" className="text-mist/85 mt-3 text-sm">
        {terms.length > 0
          ? results.length > 0
            ? `${results.length} matching ${results.length === 1 ? "section" : "sections"}. Select a result to jump to it.`
            : "No matching sections. Try different words."
          : "Search topics and instructions on this page."}
      </p>
      <div id="guide-search-results">
        {results.length > 0 && (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto p-1">
            {results.map((result) => {
              const firstMatch = Math.min(
                ...terms
                  .map((term) => result.text.toLowerCase().indexOf(term))
                  .filter((index) => index >= 0),
              );
              const start = Number.isFinite(firstMatch)
                ? Math.max(0, firstMatch - 60)
                : 0;
              const preview = result.text.slice(start, start + 220);
              return (
                <li key={result.id}>
                  <a
                    href={`#${result.id}`}
                    className="focus:outline-amber block rounded bg-white/10 p-4 hover:bg-white/15 focus:outline-2"
                  >
                    <span className="text-amber font-semibold">
                      {result.title}
                    </span>
                    <span className="text-mist/85 mt-1 block text-sm leading-relaxed">
                      {start > 0 ? "…" : ""}
                      {preview}
                      {start + 220 < result.text.length ? "…" : ""}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
