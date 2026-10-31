/** "like" for 1, "likes" otherwise: plural("like", 3) -> "likes". */
export const plural = (noun: string, count: number): string => (count === 1 ? noun : `${noun}s`)
