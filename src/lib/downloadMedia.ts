/**
 * Force-download a media URL as a file. Reports byte-level progress when
 * the server exposes Content-Length; otherwise reports indeterminate.
 * Falls back to opening in a new tab when CORS blocks the fetch.
 */
export async function downloadMediaUrl(
  url: string,
  baseName: string,
  index?: number,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (!url) return;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const total = Number(res.headers.get("Content-Length") || 0);
    let blob: Blob;

    if (res.body && total > 0) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          onProgress?.(Math.min(received / total, 1));
        }
      }
      blob = new Blob(chunks as BlobPart[]);
    } else {
      blob = await res.blob();
      onProgress?.(1);
    }

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
  } catch (err) {
    window.open(url, "_blank", "noopener,noreferrer");
    throw err;
  }
}
