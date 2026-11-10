import { App, Col, Form, Input, InputNumber, Row, Select, type FormProps } from "antd"
import type { Row as BodyRow } from "@/api/resources"
import type { ArtistView, Region } from "@/api/types"
import { ImageUpload } from "@/components/ImageUpload"
import { pickChanged } from "@/lib/diff"
import { submitBody } from "@/lib/form"
import { REGION_LABELS } from "@/lib/languages"
import { LIST_ITEM_MAX_LENGTH, LIST_MAX_ITEMS, listProblem } from "@/pages/tracks/trackValues"

export interface ArtistFormValues {
  name: string
  bio?: string
  imageUrl: string
  region: Region
  genres: string[]
  /** Followers outside the app. Empty = not given (the API keeps what it has). */
  baseFollowers?: number | null
}

const REGION_OPTIONS = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }))
const BIO_MAX = 2000

/** What the form starts from. `baseFollowers` is not in the API's view, so it starts empty. */
function initialValues(artist: ArtistView): ArtistFormValues {
  return {
    name: artist.name,
    bio: artist.bio,
    imageUrl: artist.image,
    region: artist.region,
    genres: artist.genres,
  }
}

function toBody(values: ArtistFormValues): BodyRow {
  return {
    name: values.name.trim(),
    bio: (values.bio ?? "").trim(),
    imageUrl: values.imageUrl,
    region: values.region,
    genres: values.genres ?? [],
    baseFollowers: values.baseFollowers ?? undefined,
  }
}

interface Props {
  formProps: FormProps<ArtistFormValues>
  record?: ArtistView
}

export function ArtistForm({ formProps, record }: Props) {
  const { notification } = App.useApp()

  const handleFinish = (values: ArtistFormValues) => {
    const body = toBody(values)
    // Editing sends only what changed, as for tracks (the picture URL is checked by the API).
    const payload = record ? pickChanged(toBody(initialValues(record)), body) : body
    if (Object.keys(payload).length === 0) {
      notification.info({ message: "Chưa có thay đổi nào để lưu" })
      return
    }
    return submitBody(formProps.onFinish, payload)
  }

  return (
    <Form<ArtistFormValues>
      {...formProps}
      layout="vertical"
      requiredMark="optional"
      onFinish={handleFinish}
      initialValues={record ? initialValues(record) : { region: "VIETNAM", genres: [] }}
    >
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Form.Item
            name="name"
            label="Tên nghệ sĩ"
            rules={[
              { required: true, whitespace: true, message: "Nhập tên nghệ sĩ" },
              { max: 120, message: "Tối đa 120 ký tự" },
            ]}
          >
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="region" label="Khu vực" rules={[{ required: true }]}>
            <Select options={REGION_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="genres"
            label="Thể loại"
            rules={[
              {
                validator: (_rule, value: string[] | undefined) => {
                  const problem = listProblem("Thể loại", value)
                  return problem ? Promise.reject(new Error(problem)) : Promise.resolve()
                },
              },
            ]}
            extra={`Tối đa ${LIST_MAX_ITEMS} thể loại, mỗi thể loại tối đa ${LIST_ITEM_MAX_LENGTH} ký tự.`}
          >
            <Select
              mode="tags"
              maxCount={LIST_MAX_ITEMS}
              tokenSeparators={[","]}
              open={false}
              suffixIcon={null}
              placeholder="vd: v-pop, ballad"
            />
          </Form.Item>
          <Form.Item
            name="baseFollowers"
            label="Số người theo dõi ngoài ứng dụng"
            extra={record ? "Để trống = giữ nguyên giá trị hiện có." : undefined}
            rules={[{ type: "number", min: 0, message: "Phải từ 0 trở lên" }]}
          >
            <InputNumber min={0} precision={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="bio"
            label="Tiểu sử"
            rules={[{ max: BIO_MAX, message: `Tối đa ${BIO_MAX} ký tự` }]}
          >
            <Input.TextArea rows={5} showCount maxLength={BIO_MAX} />
          </Form.Item>
        </Col>
        <Col xs={24} lg={8}>
          <Form.Item
            name="imageUrl"
            label="Ảnh đại diện"
            rules={[{ required: true, message: "Hãy tải ảnh đại diện lên" }]}
          >
            <ImageUpload />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  )
}
