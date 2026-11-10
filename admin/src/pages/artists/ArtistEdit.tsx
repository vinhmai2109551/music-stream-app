import { Edit, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import type { ArtistView } from "@/api/types"
import { ArtistForm, type ArtistFormValues } from "./ArtistForm"

export function ArtistEdit() {
  const { formProps, saveButtonProps, query } = useForm<ArtistView, HttpError, ArtistFormValues>({
    resource: "artists",
    action: "edit",
  })
  const record = query?.data?.data

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={query?.isLoading} title="Sửa nghệ sĩ">
      {record ? <ArtistForm formProps={formProps} record={record} /> : null}
    </Edit>
  )
}
