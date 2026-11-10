import { Edit, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import type { AlbumDetail } from "@/api/types"
import { AlbumForm, type AlbumFormValues } from "./AlbumForm"

export function AlbumEdit() {
  const { formProps, saveButtonProps, query } = useForm<AlbumDetail, HttpError, AlbumFormValues>({
    resource: "albums",
    action: "edit",
  })
  const record = query?.data?.data

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={query?.isLoading} title="Sửa album">
      {record ? <AlbumForm formProps={formProps} record={record} /> : null}
    </Edit>
  )
}
