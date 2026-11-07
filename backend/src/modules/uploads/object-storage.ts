import {
  createR2Deleter,
  createR2Presigner,
  type PresignRequest,
  type R2Credentials,
} from "./r2-presigner.js"

/** What the uploads module needs from the bucket; tests swap it for a fake. */
export interface ObjectStorage {
  presignPut: (request: PresignRequest) => Promise<string>
  remove: (key: string) => Promise<void>
}

/** Injection token for a replacement storage (unit tests). Production builds the R2 one. */
export const OBJECT_STORAGE = "OBJECT_STORAGE"

export function createR2Storage(r2: R2Credentials): ObjectStorage {
  return { presignPut: createR2Presigner(r2), remove: createR2Deleter(r2) }
}
