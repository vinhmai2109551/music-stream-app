import { jest } from "@jest/globals"

/** Stand-in for expo-audio: the tests build their own fake players (see helpers/playback.ts). */
export const createAudioPlayer = jest.fn()
export const useAudioPlayer = jest.fn()
export const useAudioPlayerStatus = jest.fn(() => ({}))
export const setAudioModeAsync = jest.fn(async () => undefined)
export const setIsAudioActiveAsync = jest.fn(async () => undefined)
