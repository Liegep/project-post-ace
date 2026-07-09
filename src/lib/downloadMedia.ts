/**
 * Force-download a media URL as a file. Falls back to opening in a new tab
 * when CORS blocks the fetch.
 */
export async function downloadMediaUrl(url: string, baseName: string, index?: number) {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const path = url.split("?")[0];
    const extMatch = path.match(/\.([a-z0-9]{2,5})$/i);
    const ext = extMatch ? extMatch[1] : "bin";
    const safe = (baseName || "download").replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60) || "download";
    const suffix = typeof index === "number" ? `_${index + 1}` : "";
    const a = document.createElement("a");
    const objUrl = URL.createObjectURL(blob);
    a.href = objUrl;
    a.download = `${safe}${suffix}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
