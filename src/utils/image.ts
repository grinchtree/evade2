import { createCanvas, loadImage } from "canvas";

export async function getPrimaryImageColour(
  imageUrl: string,
): Promise<number | null> {
  try {
    const image = await loadImage(imageUrl);

    // create a tiny 1x1 pixel canvas
    const canvas = createCanvas(1, 1);
    const ctx = canvas.getContext("2d");

    // drawing the entire image into a single pixel forces the canvas engine to instantly average out all the colors for us
    ctx.drawImage(image, 0, 0, 1, 1);

    // grab the raw red, green, and blue values from that specific pixel
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

    // shift the rgb values together into a single integer so discord can read it as a hex color
    return (r! << 16) + (g! << 8) + b!;
  } catch (error) {
    // fail silently and return null if the image link is dead or unsupported
    return null;
  }
}
