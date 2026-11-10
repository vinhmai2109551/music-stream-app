import { describe, expect, it, jest } from "@jest/globals"
import {
  ArgumentError,
  AuthorizationError,
  ConnectionError,
  DeepLError,
  QuotaExceededError,
  TooManyRequestsError,
  type TextResult,
} from "deepl-node"
import { DeepLTranslator, toTranslatorFailure, type DeepLClientLike } from "./deepl-translator.js"
import { TranslatorFailure } from "./translator.port.js"

const result = (text: string, billedCharacters: number) =>
  ({ text, billedCharacters }) as TextResult

function clientWith(overrides: Partial<DeepLClientLike> = {}): jest.Mocked<DeepLClientLike> {
  return {
    translateText: jest.fn<DeepLClientLike["translateText"]>(async (texts) =>
      texts.map((text) => result(`T:${text}`, text.length)),
    ),
    getUsage: jest.fn<DeepLClientLike["getUsage"]>(async () => ({
      character: { count: 10, limit: 500_000 },
    })),
    ...overrides,
  } as jest.Mocked<DeepLClientLike>
}

function failure(
  status: number | undefined,
  kind: new (message: string) => DeepLError = DeepLError,
) {
  const error = new kind("DeepL said something with the text: secret lyrics line")
  error.httpStatusCode = status
  return error
}

describe("DeepLTranslator.translate", () => {
  it("asks DeepL for the texts, in order, and gives the translations with what was billed", async () => {
    const client = clientWith()
    const translator = new DeepLTranslator(client)

    const out = await translator.translate(["một", "hai"], { source: "VI", target: "KO" })

    expect(client.translateText).toHaveBeenCalledWith(["một", "hai"], "VI", "KO", {})
    expect(out).toEqual([
      { text: "T:một", billedCharacters: 3 },
      { text: "T:hai", billedCharacters: 3 },
    ])
  })

  it("lets DeepL detect the language when none is given", async () => {
    const client = clientWith()
    await new DeepLTranslator(client).translate(["x"], { source: null, target: "JA" })
    expect(client.translateText).toHaveBeenCalledWith(["x"], null, "JA", {})
  })

  it("passes on the tag handling and the tags to leave alone", async () => {
    const client = clientWith()
    await new DeepLTranslator(client).translate(["Xin chào <x>name</x>"], {
      source: "VI",
      target: "EN-US",
      tagHandling: "xml",
      ignoreTags: ["x"],
    })
    expect(client.translateText).toHaveBeenCalledWith(["Xin chào <x>name</x>"], "VI", "EN-US", {
      tagHandling: "xml",
      ignoreTags: ["x"],
    })
  })

  it("sends no options it was not given", async () => {
    const client = clientWith()
    await new DeepLTranslator(client).translate(["x"], {
      source: "VI",
      target: "KO",
      ignoreTags: [],
    })
    expect(client.translateText).toHaveBeenCalledWith(["x"], "VI", "KO", {})
  })
})

describe("how the errors of the SDK read", () => {
  it.each([
    ["403, the key was refused", new AuthorizationError("x"), "auth", 403],
    ["456, the allowance is used up", new QuotaExceededError("x"), "quota", 456],
    ["429, too many requests", new TooManyRequestsError("x"), "rate-limited", 429],
    ["a network failure", new ConnectionError("x", true), "unavailable", undefined],
    ["a bad argument", new ArgumentError("x"), "bad-request", undefined],
  ])("%s", (_name, error, kind, status) => {
    const out = toTranslatorFailure(error)
    expect(out).toBeInstanceOf(TranslatorFailure)
    expect(out.kind).toBe(kind)
    expect(out.httpStatus).toBe(status)
  })

  it.each([
    [400, "bad-request"],
    [413, "bad-request"],
    [422, "bad-request"],
    [500, "unavailable"],
    [503, "unavailable"],
    [504, "unavailable"],
    [undefined, "unavailable"],
  ] as const)("another DeepL error with status %p is %s", (status, kind) => {
    expect(toTranslatorFailure(failure(status)).kind).toBe(kind)
  })

  it("an error it does not know is a service that is not available", () => {
    expect(toTranslatorFailure(new Error("boom")).kind).toBe("unavailable")
    expect(toTranslatorFailure("text").kind).toBe("unavailable")
  })

  it("leaves a failure that is already one as it is", () => {
    const own = new TranslatorFailure("quota", 456)
    expect(toTranslatorFailure(own)).toBe(own)
  })

  it("keeps the text of the request and the message of DeepL out of what it throws", async () => {
    const client = clientWith({
      translateText: jest.fn(async () => {
        throw failure(400)
      }),
    })

    const thrown = await new DeepLTranslator(client)
      .translate(["secret lyrics line"], { source: "VI", target: "KO" })
      .catch((error: unknown) => error)

    expect(thrown).toBeInstanceOf(TranslatorFailure)
    expect(String((thrown as Error).message)).not.toContain("secret")
    expect(JSON.stringify(thrown)).not.toContain("secret")
  })
})

describe("DeepLTranslator.usage", () => {
  it("gives the characters used and the limit", async () => {
    const translator = new DeepLTranslator(clientWith())
    expect(await translator.usage()).toEqual({ used: 10, limit: 500_000 })
  })

  it("is unavailable when DeepL gives no character usage", async () => {
    const client = clientWith({ getUsage: jest.fn(async () => ({})) })
    await expect(new DeepLTranslator(client).usage()).rejects.toMatchObject({
      kind: "unavailable",
    })
  })

  it("turns an error of DeepL into a failure", async () => {
    const client = clientWith({
      getUsage: jest.fn(async () => {
        throw new AuthorizationError("x")
      }),
    })
    await expect(new DeepLTranslator(client).usage()).rejects.toMatchObject({ kind: "auth" })
  })
})
