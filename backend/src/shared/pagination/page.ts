export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export function toPage<T>(items: T[], total: number, page: number, limit: number): Page<T> {
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

/** Prisma `skip`/`take` for a 1-based page. */
export function pageArgs(page: number, limit: number): { skip: number; take: number } {
  return { skip: (page - 1) * limit, take: limit }
}
