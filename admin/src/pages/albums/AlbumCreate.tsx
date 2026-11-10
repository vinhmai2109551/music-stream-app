import { Create, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import type { AlbumDetail } from "@/api/types"
import { AlbumForm, type AlbumFormValues } from "./AlbumForm"

export function AlbumCreate() {
  const { formProps, saveButtonProps } = useForm<AlbumDetail, HttpError, AlbumFormValues>({
    resource: "albums",
    action: "create",
  })

  return (
    <Create saveButtonProps={saveButtonProps} title="Thêm album">
      <AlbumForm formProps={formProps} />
    </Create>
  )
}
