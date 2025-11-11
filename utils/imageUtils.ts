

/**
 * Converts a data URL string into a File object.
 * This implementation avoids using `fetch` on data URLs, which can be unreliable in some environments.
 * @param dataUrl The data URL of the image.
 * @param fileName The desired file name for the output File object.
 * @returns A Promise that resolves with the created File object.
 */
export const dataUrlToFile = async (dataUrl: string, fileName: string): Promise<File> => {
    const parts = dataUrl.split(',');
    if (parts.length !== 2) {
        throw new Error('Invalid data URL format');
    }
    
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not parse mime type from data URL');
    }
    const mimeString = mimeMatch[1];
    const byteString = atob(parts[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    return new File([blob], fileName, { type: mimeString });
};

/**
 * Crops an image element based on a normalized bounding box.
 * @param image The loaded HTMLImageElement to crop from.
 * @param box The normalized (0-1000) bounding box.
 * @returns A base64 data URL of the cropped image.
 */
export const cropImage = (
  image: HTMLImageElement,
  box: { yMin: number; xMin: number; yMax: number; xMax: number },
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { naturalWidth: imgWidth, naturalHeight: imgHeight } = image;
  
  const absX = (box.xMin / 1000) * imgWidth;
  const absY = (box.yMin / 1000) * imgHeight;
  const absWidth = ((box.xMax - box.xMin) / 1000) * imgWidth;
  const absHeight = ((box.yMax - box.yMin) / 1000) * imgHeight;
  
  if (absWidth < 1 || absHeight < 1) return '';

  canvas.width = absWidth;
  canvas.height = absHeight;

  ctx.drawImage(
    image,
    absX,
    absY,
    absWidth,
    absHeight,
    0,
    0,
    absWidth,
    absHeight
  );

  return canvas.toDataURL('image/png');
};

/**
 * Creates a black and white mask from a normalized bounding box.
 * @param box The normalized (0-1000) bounding box.
 * @param imageWidth The original width of the source image.
 * @param imageHeight The original height of the source image.
 * @returns A base64 encoded PNG string of the mask (data only, no prefix).
 */
export const createMaskFromBox = (
  box: { yMin: number; xMin: number; yMax: number; xMax: number },
  imageWidth: number,
  imageHeight: number
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  canvas.width = imageWidth;
  canvas.height = imageHeight;

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, imageWidth, imageHeight);

  const absX = (box.xMin / 1000) * imageWidth;
  const absY = (box.yMin / 1000) * imageHeight;
  const absWidth = ((box.xMax - box.xMin) / 1000) * imageWidth;
  const absHeight = ((box.yMax - box.yMin) / 1000) * imageHeight;
  
  ctx.fillStyle = 'white';
  ctx.fillRect(absX, absY, absWidth, absHeight);
  
  return canvas.toDataURL('image/png').split(',')[1];
};


/**
 * Draws the source image on a canvas and adds visual arrows and boxes to indicate multiple movements.
 * @param image The loaded HTMLImageElement.
 * @param movements An array of movements, each with an original and new bounding box.
 * @returns A base64 encoded PNG string of the new image (data only, no prefix).
 */
export const drawMovementInstructions = (
  image: HTMLImageElement,
  movements: { originalBox: { yMin: number; xMin: number; yMax: number; xMax: number }, newBox: { yMin: number; xMin: number; yMax: number; xMax: number } }[],
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { naturalWidth: w, naturalHeight: h } = image;
  canvas.width = w;
  canvas.height = h;

  // 1. Draw original image
  ctx.drawImage(image, 0, 0);

  movements.forEach((movement) => {
    const { originalBox, newBox } = movement;
    // 2. Calculate center points of boxes in absolute pixel coordinates
    const startX = ((originalBox.xMin + originalBox.xMax) / 2 / 1000) * w;
    const startY = ((originalBox.yMin + originalBox.yMax) / 2 / 1000) * h;
    const endX = ((newBox.xMin + newBox.xMax) / 2 / 1000) * w;
    const endY = ((newBox.yMin + newBox.yMax) / 2 / 1000) * h;

    // 3. Draw the arrow
    const headlen = 30; // length of head in pixels
    const angle = Math.atan2(endY - startY, endX - startX);
    
    ctx.strokeStyle = '#FF0000'; // Bright red
    ctx.lineWidth = 8; // Made the arrow thicker
    ctx.lineCap = 'round';
    
    // Line body
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();

    // 4. Draw the destination bounding box
    const absX = (newBox.xMin / 1000) * w;
    const absY = (newBox.yMin / 1000) * h;
    const absWidth = ((newBox.xMax - newBox.xMin) / 1000) * w;
    const absHeight = ((newBox.yMax - newBox.yMin) / 1000) * h;
    
    ctx.strokeStyle = '#FF0000'; // Bright red
    ctx.lineWidth = 4; // Slightly thinner than the arrow
    ctx.strokeRect(absX, absY, absWidth, absHeight);
  });

  // Return base64 data only
  return canvas.toDataURL('image/png').split(',')[1];
};

/**
 * Triggers a browser download for a given data URL.
 * @param imageUrl The base64 data URL of the image to download.
 * @param title The base name for the downloaded file.
 */
export const downloadImage = (imageUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    // Sanitize title for a safe filename
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};