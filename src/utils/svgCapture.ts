export async function svgElementToPngDataUrl(
  svgEl: SVGSVGElement | null,
  targetWidth = 1200
): Promise<string | undefined> {
  if (!svgEl) return undefined;

  const rect = svgEl.getBoundingClientRect();
  const viewBox = svgEl.viewBox.baseVal;
  const srcWidth = rect.width > 10 ? rect.width : viewBox?.width || 760;
  const srcHeight = rect.height > 10 ? rect.height : viewBox?.height || 360;

  if (srcWidth <= 0 || srcHeight <= 0) return undefined;

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(srcWidth));
  clone.setAttribute("height", String(srcHeight));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${srcWidth} ${srcHeight}`);
  }

  // Ensure clean system-safe font rendering inside standalone serialized SVG
  const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
  styleEl.textContent = `
    text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  `;
  clone.insertBefore(styleEl, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = url;
    });

    const scale = targetWidth / srcWidth;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(srcWidth * scale);
    canvas.height = Math.round(srcHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png", 0.95);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}
