import { beforeEach, describe, expect, it, jest } from "@jest/globals"
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native"
import * as ImagePicker from "expo-image-picker"
import type { User } from "@/api/types"
import { ApiError } from "@/api/client"
import { EditProfileForm } from "@/components/media/EditProfileForm"
import { AUTH_LIMITS } from "@/constants/auth"
import { copy } from "@/constants/copy"
import { useAuthStore } from "@/store/authStore"
import { useToastStore } from "@/store/toastStore"
import { prepareAvatar } from "@/utils/avatarImage"

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }))
jest.mock("@/utils/avatarImage", () => ({ prepareAvatar: jest.fn() }))

const text = copy.account.edit
const USER: User = {
  id: "u1",
  email: "a@b.co",
  name: "Vinh",
  avatarUrl: null,
  role: "USER",
  isPremium: false,
}
const ASSET = { uri: "file:///photo.heic", width: 3000, height: 3000 }
const PREPARED = { uri: "file:///cache/avatar.jpg", contentType: "image/jpeg" }

const updateProfile = jest.fn<(changes: object) => Promise<void>>()
const onDone = jest.fn<() => void>()
const picker = jest.mocked(ImagePicker.launchImageLibraryAsync)
const prepare = jest.mocked(prepareAvatar)

const nameField = () => screen.getByLabelText(text.nameLabel)
const saveButton = () => screen.getByRole("button", { name: text.save })
const changePhoto = () => screen.getByRole("button", { name: text.changePhoto })
const toast = () => useToastStore.getState().message

/** What the picker answers when the user chooses a picture. */
const picked = () =>
  picker.mockResolvedValue({ canceled: false, assets: [ASSET] } as ImagePicker.ImagePickerResult)

beforeEach(async () => {
  jest.clearAllMocks()
  updateProfile.mockResolvedValue(undefined)
  prepare.mockResolvedValue(PREPARED)
  useToastStore.setState({ message: null })
  useAuthStore.setState({ user: USER, updateProfile })
  await render(<EditProfileForm onDone={onDone} />)
})

describe("EditProfileForm", () => {
  it("starts with the current name and nothing to save", () => {
    expect(nameField().props.value).toBe("Vinh")
    expect(saveButton()).toBeDisabled()
  })

  describe("the name", () => {
    it("is saved trimmed, and the form closes with a confirmation", async () => {
      await fireEvent.changeText(nameField(), "  Vinh Mai  ")
      await fireEvent.press(saveButton())

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
      expect(updateProfile).toHaveBeenCalledWith({ name: "Vinh Mai" })
      expect(toast()).toBe(text.saved)
    })

    it("cannot be left empty", async () => {
      await fireEvent.changeText(nameField(), "   ")

      expect(screen.getByText(copy.auth.validation.nameRequired)).toBeOnTheScreen()
      expect(saveButton()).toBeDisabled()
    })

    it("stops typing at the longest allowed name", () => {
      expect(nameField().props.maxLength).toBe(AUTH_LIMITS.nameMax)
    })

    it("typing the same name again is not a change", async () => {
      await fireEvent.changeText(nameField(), "Vinh ")

      expect(saveButton()).toBeDisabled()
    })
  })

  describe("the picture", () => {
    it("is cropped and shrunk when chosen, and sent with the save", async () => {
      picked()

      await fireEvent.press(changePhoto())
      await waitFor(() => expect(saveButton()).toBeEnabled())
      await fireEvent.press(saveButton())

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
      expect(picker).toHaveBeenCalledWith(
        expect.objectContaining({ allowsEditing: true, aspect: [1, 1], mediaTypes: ["images"] }),
      )
      expect(prepare).toHaveBeenCalledWith(ASSET)
      expect(updateProfile).toHaveBeenCalledWith({ photo: PREPARED })
    })

    it("goes together with a new name", async () => {
      picked()
      await fireEvent.changeText(nameField(), "Vinh Mai")

      await fireEvent.press(changePhoto())
      await waitFor(() => expect(prepare).toHaveBeenCalled())
      await waitFor(() => expect(saveButton()).toBeEnabled())
      await fireEvent.press(saveButton())

      await waitFor(() => expect(updateProfile).toHaveBeenCalled())
      expect(updateProfile).toHaveBeenCalledWith({ name: "Vinh Mai", photo: PREPARED })
    })

    it("changes nothing when the user closes the picker", async () => {
      picker.mockResolvedValue({ canceled: true, assets: null } as ImagePicker.ImagePickerResult)

      await fireEvent.press(changePhoto())

      await waitFor(() => expect(picker).toHaveBeenCalled())
      expect(prepare).not.toHaveBeenCalled()
      expect(saveButton()).toBeDisabled()
      expect(toast()).toBeNull()
    })

    it("tells the user when the picture cannot be prepared", async () => {
      picked()
      prepare.mockRejectedValue(new Error("out of memory"))

      await fireEvent.press(changePhoto())

      await waitFor(() => expect(toast()).toBe(text.pickFailed))
      expect(saveButton()).toBeDisabled()
    })

    it("tells the user when the picker itself fails", async () => {
      picker.mockRejectedValue(new Error("no access"))

      await fireEvent.press(changePhoto())

      await waitFor(() => expect(toast()).toBe(text.pickFailed))
    })
  })

  describe("when saving fails", () => {
    it("shows the reason in a toast, keeps the form open and lets the user try again", async () => {
      updateProfile.mockRejectedValueOnce(
        new ApiError({ status: 0, kind: "network", message: copy.errors.network }),
      )
      await fireEvent.changeText(nameField(), "Vinh Mai")

      await fireEvent.press(saveButton())

      await waitFor(() => expect(toast()).toBe(copy.errors.network))
      expect(onDone).not.toHaveBeenCalled()
      expect(nameField().props.value).toBe("Vinh Mai")
      await waitFor(() => expect(saveButton()).toBeEnabled())

      await fireEvent.press(saveButton())
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    })

    it("says something plain for an error it does not know", async () => {
      updateProfile.mockRejectedValueOnce(new Error("boom"))
      await fireEvent.changeText(nameField(), "Vinh Mai")

      await fireEvent.press(saveButton())

      await waitFor(() => expect(toast()).toBe(copy.errors.unknown))
    })
  })

  it("going back leaves without saving", async () => {
    await fireEvent.changeText(nameField(), "Vinh Mai")

    await fireEvent.press(screen.getByRole("button", { name: text.back }))

    expect(onDone).toHaveBeenCalledTimes(1)
    expect(updateProfile).not.toHaveBeenCalled()
  })
})
