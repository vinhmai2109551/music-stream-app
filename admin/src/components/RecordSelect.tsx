import { useSelect } from "@refinedev/antd"
import type { CrudFilter } from "@refinedev/core"
import { Select, type SelectProps } from "antd"
import type { ArtistView, TrackView } from "@/api/types"

interface Props {
  /** The id of the chosen record. Plugs into `Form.Item`. */
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  allowClear?: boolean
}

/** Remote search can be slow to type into; wait for a pause before asking the API. */
const SEARCH_DEBOUNCE_MS = 300

function SearchSelect<TRecord extends { id: string }>(
  props: Props & {
    resource: "artists" | "tracks"
    label: (record: TRecord) => string
    filters?: CrudFilter[]
  },
) {
  const { resource, label, filters, value, onChange, placeholder, disabled, allowClear } = props
  const { selectProps } = useSelect<TRecord>({
    resource,
    optionLabel: label,
    optionValue: (record) => record.id,
    defaultValue: value,
    filters,
    debounce: SEARCH_DEBOUNCE_MS,
    pagination: { mode: "server", pageSize: 20 },
    onSearch: (term) => [{ field: "q", operator: "contains", value: term }],
  })
  return (
    <Select
      {...(selectProps as SelectProps<string>)}
      value={value}
      onChange={(next: string) => onChange?.(next)}
      placeholder={placeholder}
      disabled={disabled}
      allowClear={allowClear}
      showSearch
      // The list is already filtered by the API; do not filter it a second time here.
      filterOption={false}
      style={{ width: "100%" }}
    />
  )
}

/** Searchable select of artists; the form value is the artist id. */
export function ArtistSelect(props: Props) {
  return (
    <SearchSelect<ArtistView>
      {...props}
      resource="artists"
      label={(artist) => artist.name}
      placeholder={props.placeholder ?? "Chọn nghệ sĩ"}
    />
  )
}

/** Searchable select of tracks, optionally only those of one artist; the value is the track id. */
export function TrackSelect({ artistId, ...props }: Props & { artistId?: string }) {
  return (
    <SearchSelect<TrackView>
      {...props}
      resource="tracks"
      filters={artistId ? [{ field: "artistId", operator: "eq", value: artistId }] : undefined}
      label={(track) => `${track.title} - ${track.artist}`}
      placeholder={props.placeholder ?? "Chọn bài hát"}
    />
  )
}
