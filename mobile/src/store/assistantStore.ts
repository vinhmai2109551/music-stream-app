import { create } from "zustand"
import * as assistantApi from "@/api/assistant"
import { ApiError } from "@/api/client"
import type { AssistantConversation, AssistantUsage } from "@/api/types"
import { copy } from "@/constants/copy"
import { showToast } from "./toastStore"

/** Whether the server has the assistant switched on. Unknown until the first answer. */
export type AssistantAvailability = "unknown" | "available" | "unavailable"
export type ConversationsStatus = "idle" | "loading" | "ready" | "error"

type AssistantState = {
  availability: AssistantAvailability
  usage: AssistantUsage | null
  conversations: AssistantConversation[]
  status: ConversationsStatus
  error: unknown
}

type AssistantActions = {
  /** Asks the server whether the assistant is on (503 = off) and how many messages are left today. */
  probe: () => Promise<void>
  loadConversations: () => Promise<void>
  /** A new empty conversation, or null when it could not be made. */
  createConversation: () => Promise<AssistantConversation | null>
  /** Deletes a conversation; true once the server confirmed it. */
  removeConversation: (id: string) => Promise<boolean>
  /** The server says the assistant is off (any request answered 503). */
  markUnavailable: () => void
  /** Reads how many messages are left today. */
  refreshUsage: () => Promise<void>
  /** Moves a conversation to the top of the list (it was just used). */
  touch: (id: string) => void
  reset: () => void
}

export type AssistantStore = AssistantState & AssistantActions

const initialState: AssistantState = {
  availability: "unknown",
  usage: null,
  conversations: [],
  status: "idle",
  error: null,
}

const isOff = (error: unknown) => error instanceof ApiError && error.status === 503

/**
 * Bumped when the store is reset (sign-out). An answer that arrives for an earlier account must
 * not fill the store of the next one.
 */
let generation = 0

/**
 * What the app remembers about the assistant: whether it is on, the day's usage and the list of
 * conversations (a cache; the server has the truth). The messages of a conversation are not kept
 * here, they are loaded when it is opened.
 */
export const useAssistantStore = create<AssistantStore>()((set, get) => ({
  ...initialState,

  probe: async () => {
    const mine = generation
    try {
      const usage = await assistantApi.getAssistantUsage()
      if (mine === generation) set({ availability: "available", usage })
    } catch (error) {
      // Only a clear "off" hides the feature; no network must not make the button disappear.
      if (mine === generation && isOff(error)) set({ availability: "unavailable", usage: null })
    }
  },

  loadConversations: async () => {
    const mine = generation
    set({ status: "loading", error: null })
    try {
      const conversations = await assistantApi.listConversations()
      if (mine === generation) set({ conversations, status: "ready", availability: "available" })
    } catch (error) {
      if (mine !== generation) return
      if (isOff(error)) set({ availability: "unavailable", status: "idle" })
      else set({ status: "error", error })
    }
  },

  createConversation: async () => {
    const mine = generation
    try {
      const created = await assistantApi.createConversation()
      if (mine !== generation) return null
      set((state) => ({
        conversations: [created, ...state.conversations.filter((item) => item.id !== created.id)],
      }))
      return created
    } catch (error) {
      if (mine !== generation) return null
      if (isOff(error)) get().markUnavailable()
      else showToast(copy.assistant.history.createFailed)
      return null
    }
  },

  removeConversation: async (id) => {
    const before = get().conversations
    const index = before.findIndex((item) => item.id === id)
    if (index < 0) return false
    const mine = generation
    set({ conversations: before.filter((item) => item.id !== id) })
    try {
      await assistantApi.deleteConversation(id)
      return true
    } catch (error) {
      // 404: it is already gone, which is what was asked for.
      if (error instanceof ApiError && error.status === 404) return true
      if (mine !== generation) return false // signed out meanwhile: nothing to put back
      set((state) => ({
        conversations: [
          ...state.conversations.slice(0, index),
          before[index],
          ...state.conversations.slice(index),
        ],
      }))
      showToast(copy.assistant.history.deleteFailed)
      return false
    }
  },

  markUnavailable: () => set({ availability: "unavailable", usage: null }),

  refreshUsage: async () => {
    const mine = generation
    try {
      const usage = await assistantApi.getAssistantUsage()
      if (mine === generation) set({ usage })
    } catch (error) {
      if (mine === generation && isOff(error)) get().markUnavailable()
    }
  },

  touch: (id) =>
    set((state) => {
      const found = state.conversations.find((item) => item.id === id)
      if (!found) return state
      const used = { ...found, updatedAt: new Date().toISOString() }
      return { conversations: [used, ...state.conversations.filter((item) => item.id !== id)] }
    }),

  reset: () => {
    generation += 1
    set(initialState)
  },
}))
