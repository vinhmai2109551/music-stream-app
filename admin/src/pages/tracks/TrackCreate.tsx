import { Create, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import type { TrackView } from "@/api/types"
import { TrackForm } from "./TrackForm"
import type { TrackFormValues } from "./trackValues"

export function TrackCreate() {
  const { formProps, saveButtonProps } = useForm<TrackView, HttpError, TrackFormValues>({
    resource: "tracks",
    action: "create",
  })

  return (
    <Create saveButtonProps={saveButtonProps} title="Thêm bài hát">
      <TrackForm formProps={formProps} />
    </Create>
  )
}
