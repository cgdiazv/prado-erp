import { PDFDocument, PDFImage } from 'pdf-lib';

export interface EmbeddedLogoResult {
  image: PDFImage;
  width: number;
  height: number;
}

/**
 * Safely fetches and embeds an organization logo into a pdf-lib PDFDocument.
 * Handles timeouts and format detection (PNG vs JPEG).
 * Returns null if the logo cannot be fetched or embedded so PDF generation continues seamlessly.
 */
export async function embedOrganizationLogo(
  pdfDoc: PDFDocument,
  logoUrl?: string | null,
  maxWidth = 60,
  maxHeight = 48
): Promise<EmbeddedLogoResult | null> {
  const cleanUrl = (logoUrl || '').trim();
  if (!cleanUrl) {
    return null;
  }

  try {
    const res = await fetch(cleanUrl, {
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      console.warn(`[embedOrganizationLogo] Failed to fetch logo (${res.status}): ${cleanUrl}`);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length === 0) {
      return null;
    }

    // PNG signature: 0x89 0x50 0x4E 0x47 (89 80 78 71)
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    // JPEG signature: 0xFF 0xD8 0xFF
    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    let image: PDFImage | null = null;

    if (isPng) {
      image = await pdfDoc.embedPng(arrayBuffer);
    } else if (isJpg) {
      image = await pdfDoc.embedJpg(arrayBuffer);
    } else {
      // Fallback: try PNG first then JPG
      try {
        image = await pdfDoc.embedPng(arrayBuffer);
      } catch {
        image = await pdfDoc.embedJpg(arrayBuffer);
      }
    }

    if (!image) {
      return null;
    }

    const dims = image.scaleToFit(maxWidth, maxHeight);
    return {
      image,
      width: dims.width,
      height: dims.height,
    };
  } catch (error) {
    console.warn(`[embedOrganizationLogo] Could not embed logo from ${cleanUrl}:`, error);
    return null;
  }
}
