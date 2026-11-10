import { Create, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import type { ArtistView } from "@/api/types"
import { ArtistForm, type ArtistFormValues } from "./ArtistForm"

export function ArtistCreate() {
  const { formProps, saveButtonProps } = useForm<ArtistView, HttpError, ArtistFormValues>({
    resource: "artists",
    action: "create",
  })

  return (
    <Create saveButtonProps={saveButtonProps} title="Thêm nghệ sĩ">
      <ArtistForm formProps={formProps} />
    </Create>
  )
}
