import { ImageManipulator, SaveFormat } from "expo-image-manipulator"

/** Side of the square picture that gets uploaded, in pixels. Bigger pictures are shrunk to this. */
export const AVATAR_SIZE = 512
const AVATAR_QUALITY = 0.8
export const AVATAR_CONTENT_TYPE = "image/jpeg"

/** A picture chosen on the device. */
export interface PickedImage {
  uri: string
  width: number
  height: number
}

/** A picture ready to upload: square, about 512 px, JPEG. */
export interface PreparedAvatar {
  uri: string
  contentType: string
}

/**
 * The biggest square in the middle of a `width` x `height` picture, and the side it is shrunk to
 * (never enlarged: a small picture stays as sharp as it was).
 */
export function squareCrop(width: number, height: number, maxSide: number = AVATAR_SIZE) {
  if (!(width > 0) || !(height > 0)) throw new Error("The picture has no size")
  const side = Math.floor(Math.min(width, height))
  return {
    originX: Math.floor((width - side) / 2),
    originY: Math.floor((height - side) / 2),
    side,
    target: Math.min(side, maxSide),
  }
}

/** Crops the picture to a centred square, shrinks it to 512 px and saves it as a JPEG file. */
export async function prepareAvatar(image: PickedImage): Promise<PreparedAvatar> {
  const { originX, originY, side, target } = squareCrop(image.width, image.height)
  const rendered = await ImageManipulator.manipulate(image.uri)
    .crop({ originX, originY, width: side, height: side })
    .resize({ width: target, height: target })
    .renderAsync()
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: AVATAR_QUALITY })
  return { uri: saved.uri, contentType: AVATAR_CONTENT_TYPE }
}
