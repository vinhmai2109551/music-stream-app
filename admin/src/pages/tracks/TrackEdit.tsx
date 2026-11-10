import { CustomerServiceOutlined } from "@ant-design/icons"
import { Edit, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import { Button } from "antd"
import { Link } from "react-router"
import type { TrackView } from "@/api/types"
import { TrackForm } from "./TrackForm"
import type { TrackFormValues } from "./trackValues"

export function TrackEdit() {
  const { formProps, saveButtonProps, query, id } = useForm<TrackView, HttpError, TrackFormValues>({
    resource: "tracks",
    action: "edit",
  })
  const record = query?.data?.data

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      isLoading={query?.isLoading}
      title="Sửa bài hát"
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <Link to={`/tracks/${id}/lyrics`}>
            <Button icon={<CustomerServiceOutlined />}>Lời bài hát</Button>
          </Link>
        </>
      )}
    >
      {/* Rendered once the track is loaded, so the form starts from the track and not from blanks. */}
      {record ? <TrackForm formProps={formProps} record={record} /> : null}
    </Edit>
  )
}
