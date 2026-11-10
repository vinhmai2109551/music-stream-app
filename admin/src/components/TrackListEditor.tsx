import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined } from "@ant-design/icons"
import { useSelect } from "@refinedev/antd"
import { Button, Empty, List, Select, Space, Typography } from "antd"
import { useState } from "react"
import type { TrackView } from "@/api/types"
import { moveItem, removeAt } from "@/lib/list"

interface Props {
  /** Track ids in play order. Plugs into `Form.Item`. */
  value?: string[]
  onChange?: (ids: string[]) => void
  /** Tracks already known by name (the ones of the album being edited). */
  known?: readonly TrackView[]
}

const SEARCH_DEBOUNCE_MS = 300

const labelOf = (track: Pick<TrackView, "title" | "artist">) => `${track.title} - ${track.artist}`

/** An ordered list of tracks: search to add, arrows to reorder, a button to remove. */
export function TrackListEditor({ value = [], onChange, known = [] }: Props) {
  // The form keeps ids only; the names of the tracks added here are remembered for display.
  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(known.map((track) => [track.id, labelOf(track)])),
  )
  const { selectProps } = useSelect<TrackView>({
    resource: "tracks",
    optionLabel: labelOf,
    optionValue: (track) => track.id,
    debounce: SEARCH_DEBOUNCE_MS,
    pagination: { mode: "server", pageSize: 20 },
    onSearch: (term) => [{ field: "q", operator: "contains", value: term }],
  })

  const add = (picked: { value: string; label: unknown }) => {
    if (value.includes(picked.value)) return
    setLabels((previous) => ({ ...previous, [picked.value]: String(picked.label) }))
    onChange?.([...value, picked.value])
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Select
        {...selectProps}
        value={null}
        labelInValue
        showSearch
        filterOption={false}
        placeholder="Tìm bài hát để thêm vào album"
        style={{ width: "100%" }}
        onChange={(picked) => {
          if (picked && typeof picked === "object" && "value" in picked) {
            add({ value: String(picked.value), label: picked.label })
          }
        }}
        onSelect={undefined}
      />
      <List
        size="small"
        bordered
        dataSource={value}
        locale={{ emptyText: <Empty description="Album chưa có bài hát nào" /> }}
        renderItem={(id, index) => (
          <List.Item
            key={id}
            actions={[
              <Button
                key="up"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                aria-label="Chuyển lên"
                onClick={() => onChange?.(moveItem(value, index, -1))}
              />,
              <Button
                key="down"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === value.length - 1}
                aria-label="Chuyển xuống"
                onClick={() => onChange?.(moveItem(value, index, 1))}
              />,
              <Button
                key="remove"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label="Bỏ khỏi album"
                onClick={() => onChange?.(removeAt(value, index))}
              />,
            ]}
          >
            <Typography.Text ellipsis style={{ maxWidth: 360 }}>
              {index + 1}. {labels[id] ?? id}
            </Typography.Text>
          </List.Item>
        )}
      />
    </Space>
  )
}
