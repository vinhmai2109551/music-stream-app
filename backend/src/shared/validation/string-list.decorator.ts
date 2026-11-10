import { applyDecorators } from "@nestjs/common"
import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches, MaxLength } from "class-validator"
import { LIST_ITEM_MAX_LENGTH, LIST_MAX_ITEMS } from "./limits.js"

/** Optional list of short words (genres, moods, tags): up to 10 entries of up to 40 characters. */
export function StringList() {
  return applyDecorators(
    IsOptional(),
    IsArray(),
    ArrayMaxSize(LIST_MAX_ITEMS),
    IsString({ each: true }),
    Matches(/\S/, { each: true, message: "each entry must contain a character other than spaces" }),
    MaxLength(LIST_ITEM_MAX_LENGTH, { each: true }),
  )
}
