/** Compatibility entry point. Preview only unless --yes is explicitly supplied. */
import { tsImport } from "tsx/esm/api";
await tsImport("./clear-bookings.ts", import.meta.url);
