import { Create, useForm } from "@refinedev/antd"
import type { HttpError } from "@refinedev/core"
import { Col, Form, Input, Row } from "antd"
import type { FeedPostView } from "@/api/types"
import { ImageUpload } from "@/components/ImageUpload"
import { ArtistSelect, TrackSelect } from "@/components/RecordSelect"

interface FeedFormValues {
  artistId: string
  trackId: string
  artworkUrl: string
  caption?: string
}

const CAPTION_MAX = 500

export function FeedCreate() {
  const { formProps, saveButtonProps } = useForm<FeedPostView, HttpError, FeedFormValues>({
    resource: "feed",
    action: "create",
  })
  const artistId = Form.useWatch("artistId", formProps.form) as string | undefined

  return (
    <Create saveButtonProps={saveButtonProps} title="Đăng bài mới">
      <Form<FeedFormValues>
        {...formProps}
        layout="vertical"
        requiredMark="optional"
        onValuesChange={(changed, all) => {
          // Another artist: the track chosen before is not theirs any more.
          if ("artistId" in changed) formProps.form?.setFieldValue("trackId", undefined)
          formProps.onValuesChange?.(changed, all)
        }}
      >
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            <Form.Item
              name="artistId"
              label="Nghệ sĩ"
              rules={[{ required: true, message: "Chọn nghệ sĩ" }]}
            >
              <ArtistSelect />
            </Form.Item>
            <Form.Item
              name="trackId"
              label="Bài hát"
              extra={artistId ? undefined : "Chọn nghệ sĩ trước để chỉ thấy bài hát của họ."}
              rules={[{ required: true, message: "Chọn bài hát" }]}
            >
              <TrackSelect artistId={artistId} />
            </Form.Item>
            <Form.Item
              name="caption"
              label="Nội dung"
              rules={[{ max: CAPTION_MAX, message: `Tối đa ${CAPTION_MAX} ký tự` }]}
            >
              <Input.TextArea rows={4} showCount maxLength={CAPTION_MAX} />
            </Form.Item>
          </Col>
          <Col xs={24} lg={8}>
            <Form.Item
              name="artworkUrl"
              label="Ảnh bài đăng"
              rules={[{ required: true, message: "Hãy tải ảnh lên" }]}
            >
              <ImageUpload />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Create>
  )
}
