import type { BaseRecord, CrudFilter, DataProvider } from "@refinedev/core"
import { api, type QueryValue } from "@/api/http"
import { adapterFor, type ResourceAdapter, type Row } from "@/api/resources"
import { API_URL } from "@/config/env"
import type { Page } from "@/api/types"

/** The API returns at most 100 rows per page. */
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

/** Filters of Refine -> query parameters of the list endpoint (only the ones the resource has). */
export function filtersToQuery(
  adapter: Pick<ResourceAdapter, "filters">,
  filters: CrudFilter[] | undefined,
): Record<string, QueryValue> {
  const query: Record<string, QueryValue> = {}
  for (const filter of filters ?? []) {
    if (!("field" in filter) || !adapter.filters.includes(filter.field)) continue
    const { value } = filter
    if (value === undefined || value === null || value === "") continue
    query[filter.field] = Array.isArray(value) ? value.join(",") : (value as QueryValue)
  }
  return query
}

const read = (adapter: ResourceAdapter, row: Row): BaseRecord =>
  (adapter.fromApi ? adapter.fromApi(row) : row) as BaseRecord

const body = (adapter: ResourceAdapter, values: unknown): Row =>
  adapter.toApi ? adapter.toApi(values as Row) : (values as Row)

/**
 * Refine's data provider for the Music Stream API. The lists of the API are paged with
 * `page` / `limit` (answer: `{ items, total, ... }`), which is what Refine's `currentPage` /
 * `pageSize` are, so there is nothing to translate but the names.
 */
export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  async getList({ resource, pagination, filters }) {
    const adapter = adapterFor(resource)
    const off = pagination?.mode === "off"
    const page = await api<Page<Row>>(adapter.path, {
      query: {
        ...filtersToQuery(adapter, filters),
        page: off ? 1 : (pagination?.currentPage ?? 1),
        limit: off
          ? MAX_PAGE_SIZE
          : Math.min(pagination?.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
      },
    })
    return { data: page.items.map((row) => read(adapter, row)) as never[], total: page.total }
  },

  async getOne({ resource, id }) {
    const adapter = adapterFor(resource)
    if (!adapter.hasDetail) throw new Error(`Không có API xem chi tiết cho ${resource}.`)
    const row = await api<Row>(`${adapter.path}/${encodeURIComponent(String(id))}`)
    return { data: read(adapter, row) as never }
  },

  async getMany({ resource, ids }) {
    const adapter = adapterFor(resource)
    const rows = await Promise.all(
      ids.map((id) => api<Row>(`${adapter.path}/${encodeURIComponent(String(id))}`)),
    )
    return { data: rows.map((row) => read(adapter, row)) as never[] }
  },

  async create({ resource, variables }) {
    const adapter = adapterFor(resource)
    const row = await api<Row>(adapter.path, { method: "POST", body: body(adapter, variables) })
    return { data: read(adapter, row) as never }
  },

  async update({ resource, id, variables }) {
    const adapter = adapterFor(resource)
    const row = await api<Row>(`${adapter.path}/${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      body: body(adapter, variables),
    })
    return { data: read(adapter, row) as never }
  },

  async deleteOne({ resource, id }) {
    const adapter = adapterFor(resource)
    await api<void>(`${adapter.path}/${encodeURIComponent(String(id))}`, { method: "DELETE" })
    return { data: { id } as never }
  },

  async custom({ url, method, payload, query }) {
    const data = await api<never>(url.startsWith("http") ? new URL(url).pathname : url, {
      method: method.toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      body: payload,
      query: query as Record<string, QueryValue> | undefined,
    })
    return { data }
  },
}
