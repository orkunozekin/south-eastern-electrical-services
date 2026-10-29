import Script from "next/script";

import { shouldLoadUpSmithWidget } from "@/lib/upsmith";

const UPSMITH_WIDGET_SRC = "https://app.upsmith.com/embed/widget.js";

// This is UpSmith's public browser embed identifier, not a private API key.
const UPSMITH_WIDGET_KEY =
  "pk_live_JX8NufsNc3XwiNn2NxEXN5GxSDT9t9PTfDZG89ECGbc";

export function UpSmithWidget() {
  if (!shouldLoadUpSmithWidget(process.env.NODE_ENV, process.env.VERCEL_ENV)) {
    return null;
  }

  return (
    <Script
      src={UPSMITH_WIDGET_SRC}
      data-key={UPSMITH_WIDGET_KEY}
      strategy="lazyOnload"
      defer
    />
  );
}
