import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { AVATAR_SIZE, prepareAvatar, squareCrop } from "@/utils/avatarImage"

const mockSave = jest.fn<(options: object) => Promise<{ uri: string }>>()
const mockRender = jest.fn<() => Promise<{ saveAsync: typeof mockSave }>>()
const mockCrop = jest.fn<(rect: object) => unknown>()
const mockResize = jest.fn<(size: object) => unknown>()
const mockManipulate = jest.fn<(uri: string) => unknown>()

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: (uri: string) => mockManipulate(uri) },
  SaveFormat: { JPEG: "jpeg" },
}))

describe("squareCrop", () => {
  it("takes the middle square of a landscape picture and shrinks it to 512", () => {
    expect(squareCrop(4000, 3000)).toEqual({ originX: 500, originY: 0, side: 3000, target: 512 })
  })

  it("takes the middle square of a portrait picture", () => {
    expect(squareCrop(3000, 4000)).toEqual({ originX: 0, originY: 500, side: 3000, target: 512 })
  })

  it("keeps a square picture whole", () => {
    expect(squareCrop(1024, 1024)).toEqual({ originX: 0, originY: 0, side: 1024, target: 512 })
  })

  it("never enlarges a small picture", () => {
    expect(squareCrop(300, 400)).toEqual({ originX: 0, originY: 50, side: 300, target: 300 })
    expect(squareCrop(AVATAR_SIZE, AVATAR_SIZE).target).toBe(AVATAR_SIZE)
  })

  it("stays on whole pixels", () => {
    expect(squareCrop(1001, 600)).toEqual({ originX: 200, originY: 0, side: 600, target: 512 })
    expect(squareCrop(700.6, 500.4)).toMatchObject({ side: 500, originX: 100 })
  })

  it("follows a different target size", () => {
    expect(squareCrop(2000, 1000, 256).target).toBe(256)
  })

  it.each([
    [0, 100],
    [100, 0],
    [-5, 100],
    [Number.NaN, 100],
  ])("refuses a picture of %s x %s", (width, height) => {
    expect(() => squareCrop(width, height)).toThrow()
  })
})

describe("prepareAvatar", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const context = { crop: mockCrop, resize: mockResize, renderAsync: mockRender }
    mockManipulate.mockReturnValue(context)
    mockCrop.mockReturnValue(context)
    mockResize.mockReturnValue(context)
    mockRender.mockResolvedValue({ saveAsync: mockSave })
    mockSave.mockResolvedValue({ uri: "file:///cache/out.jpg" })
  })

  it("crops to the middle square, shrinks to 512 and saves a JPEG", async () => {
    const result = await prepareAvatar({ uri: "file:///photo.png", width: 4000, height: 3000 })

    expect(mockManipulate).toHaveBeenCalledWith("file:///photo.png")
    expect(mockCrop).toHaveBeenCalledWith({ originX: 500, originY: 0, width: 3000, height: 3000 })
    expect(mockResize).toHaveBeenCalledWith({ width: 512, height: 512 })
    expect(mockSave).toHaveBeenCalledWith({ format: "jpeg", compress: 0.8 })
    expect(result).toEqual({ uri: "file:///cache/out.jpg", contentType: "image/jpeg" })
  })

  it("crops before it resizes", async () => {
    await prepareAvatar({ uri: "file:///photo.png", width: 800, height: 600 })

    expect(mockCrop.mock.invocationCallOrder[0]).toBeLessThan(
      mockResize.mock.invocationCallOrder[0],
    )
  })

  it("passes on a failure of the image library", async () => {
    mockRender.mockRejectedValue(new Error("out of memory"))

    await expect(
      prepareAvatar({ uri: "file:///photo.png", width: 800, height: 600 }),
    ).rejects.toThrow("out of memory")
  })

  it("does not touch the library for a picture without a size", async () => {
    await expect(prepareAvatar({ uri: "file:///x.png", width: 0, height: 0 })).rejects.toThrow()

    expect(mockManipulate).not.toHaveBeenCalled()
  })
})
