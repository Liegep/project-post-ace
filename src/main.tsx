import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-recover from stale chunk references after a new deploy.
// When a user has an old tab open and the build hash changes, dynamic imports
// like `import("@/lib/foo")` fail with "Failed to fetch dynamically imported module".
// Reload once so the browser picks up the new asset manifest.
const STALE_CHUNK_FLAG = "lovable:reloaded-for-stale-chunk";
function isStaleChunkError(reason: unknown): boolean {
  const msg = reason instanceof Error ? reason.message : String(reason ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(msg);
}
function handleStaleChunk(reason: unknown) {
  if (!isStaleChunkError(reason)) return;
  if (sessionStorage.getItem(STALE_CHUNK_FLAG)) return; // avoid reload loop
  sessionStorage.setItem(STALE_CHUNK_FLAG, "1");
  window.location.reload();
}
window.addEventListener("error", (e) => handleStaleChunk(e.error ?? e.message));
window.addEventListener("unhandledrejection", (e) => handleStaleChunk(e.reason));

createRoot(document.getElementById("root")!).render(<App />);
