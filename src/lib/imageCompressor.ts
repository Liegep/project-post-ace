const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.82;

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") && !file.type.includes("svg") && !file.type.includes("gif");
}

function supportsWebP(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0;
  } catch {
    return false;
  }
}

const WEBP_OK = typeof document !== "undefined" ? supportsWebP() : false;

function replaceExt(name: string, newExt: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${newExt}`;
}

export async function compressImage(file: File): Promise<File> {
  if (!isImageFile(file)) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Resize if too big (preserve aspect ratio)
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const useWebP = WEBP_OK;
      const mime = useWebP ? "image/webp" : "image/jpeg";
      const quality = useWebP ? WEBP_QUALITY : JPEG_QUALITY;
      const newExt = useWebP ? "webp" : "jpg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Keep the smaller one — never grow the file
          if (blob.size >= file.size && file.type !== "image/png") {
            resolve(file);
            return;
          }
          const compressed = new File([blob], replaceExt(file.name, newExt), {
            type: mime,
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        mime,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

export async function compressFiles(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
