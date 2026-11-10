import { App, Col, Form, Input, Row, type FormProps } from "antd"
import type { Row as BodyRow } from "@/api/resources"
import type { AlbumDetail } from "@/api/types"
import { ImageUpload } from "@/components/ImageUpload"
import { ArtistSelect } from "@/components/RecordSelect"
import { TrackListEditor } from "@/components/TrackListEditor"
import { pickChanged } from "@/lib/diff"
import { submitBody } from "@/lib/form"

export interface AlbumFormValues {
  title: string
  artistId: string
  coverUrl: string
  /** Track ids in play order. */
  trackIds: string[]
}

function initialValues(album: AlbumDetail): AlbumFormValues {
  return {
    title: album.title,
    artistId: album.artistId,
    coverUrl: album.cover,
    trackIds: album.trackIds,
  }
}

const toBody = (values: AlbumFormValues): BodyRow => ({
  title: values.title.trim(),
  artistId: values.artistId,
  coverUrl: values.coverUrl,
  trackIds: values.trackIds ?? [],
})

interface Props {
  formProps: FormProps<AlbumFormValues>
  record?: AlbumDetail
}

export function AlbumForm({ formProps, record }: Props) {
  const { notification } = App.useApp()

  const handleFinish = (values: AlbumFormValues) => {
    const body = toBody(values)
    // Editing sends only what changed: sending `trackIds` replaces the whole track list, and the
    // cover URL is checked by the API.
    const payload = record ? pickChanged(toBody(initialValues(record)), body) : body
    if (Object.keys(payload).length === 0) {
      notification.info({ message: "Chưa có thay đổi nào để lưu" })
      return
    }
    return submitBody(formProps.onFinish, payload)
  }

  return (
    <Form<AlbumFormValues>
      {...formProps}
      layout="vertical"
      requiredMark="optional"
      onFinish={handleFinish}
      initialValues={record ? initialValues(record) : { trackIds: [] }}
    >
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Form.Item
            name="title"
            label="Tên album"
            rules={[
              { required: true, whitespace: true, message: "Nhập tên album" },
              { max: 200, message: "Tối đa 200 ký tự" },
            ]}
          >
            <Input maxLength={200} />
          </Form.Item>
          <Form.Item
            name="artistId"
            label="Nghệ sĩ"
            rules={[{ required: true, message: "Chọn nghệ sĩ" }]}
          >
            <ArtistSelect />
          </Form.Item>
          <Form.Item
            name="trackIds"
            label="Bài hát trong album"
            extra="Thứ tự trong danh sách là thứ tự phát. Lưu sẽ thay toàn bộ danh sách bài của album."
          >
            <TrackListEditor known={record?.tracks} />
          </Form.Item>
        </Col>
        <Col xs={24} lg={8}>
          <Form.Item
            name="coverUrl"
            label="Ảnh bìa"
            rules={[{ required: true, message: "Hãy tải ảnh bìa lên" }]}
          >
            <ImageUpload />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
