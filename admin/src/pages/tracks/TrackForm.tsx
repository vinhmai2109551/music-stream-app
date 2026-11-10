import { App, Col, Form, Input, Radio, Row, Select, type FormProps } from "antd"
import { ArtistSelect } from "@/components/RecordSelect"
import { AudioUpload } from "@/components/AudioUpload"
import { DurationInput } from "@/components/DurationInput"
import { ImageUpload } from "@/components/ImageUpload"
import type { TrackView } from "@/api/types"
import { pickChanged } from "@/lib/diff"
import { submitBody } from "@/lib/form"
import { TRACK_LANGUAGES } from "@/lib/languages"
import { parseYouTubeVideoId, youtubeEmbedUrl } from "@/lib/youtube"
import {
  DESCRIPTION_MAX_LENGTH,
  initialTrackValues,
  LIST_MAX_ITEMS,
  listProblem,
  toTrackBody,
  type TrackFormValues,
} from "./trackValues"

interface Props {
  formProps: FormProps<TrackFormValues>
  /** The track being edited; absent when creating. */
  record?: TrackView
}

const SOURCE_OPTIONS = [
  { label: "YouTube", value: "youtube" },
  { label: "Upload audio", value: "audio" },
]

const listRule = (label: string) => ({
  validator: (_rule: unknown, value: string[] | undefined) => {
    const problem = listProblem(label, value)
    return problem ? Promise.reject(new Error(problem)) : Promise.resolve()
  },
})

function TagsField({
  name,
  label,
  placeholder,
}: {
  name: string
  label: string
  placeholder: string
}) {
  return (
    <Form.Item name={name} label={label} rules={[listRule(label)]}>
      <Select
        mode="tags"
        maxCount={LIST_MAX_ITEMS}
        tokenSeparators={[","]}
        placeholder={placeholder}
        open={false}
        suffixIcon={null}
      />
    </Form.Item>
  )
}

/** The form of a track, for creating and editing. Exactly one of YouTube / audio file is chosen. */
export function TrackForm({ formProps, record }: Props) {
  const { notification } = App.useApp()
  const form = formProps.form
  const source = Form.useWatch("source", form) as TrackFormValues["source"] | undefined
  const youtubeInput = Form.useWatch("youtubeInput", form) as string | undefined
  const videoId = youtubeInput ? parseYouTubeVideoId(youtubeInput) : null

  const handleFinish = (values: TrackFormValues) => {
    const body = toTrackBody(values)
    // Editing sends only what changed: the API checks every media URL it receives, and an
    // unchanged cover of demo data (not in our storage) would be refused.
    const payload = record ? pickChanged(toTrackBody(initialTrackValues(record)), body) : body
    if (Object.keys(payload).length === 0) {
      notification.info({ message: "Chưa có thay đổi nào để lưu" })
      return
    }
    return submitBody(formProps.onFinish, payload)
  }

  return (
    <Form<TrackFormValues>
      {...formProps}
      layout="vertical"
      requiredMark="optional"
      onFinish={handleFinish}
      initialValues={
        record ? initialTrackValues(record) : { source: "youtube", genres: [], mood: [], tags: [] }
      }
    >
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Form.Item
            name="title"
            label="Tên bài hát"
            rules={[
              { required: true, whitespace: true, message: "Nhập tên bài hát" },
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

          <Form.Item name="source" label="Nguồn phát" rules={[{ required: true }]}>
            <Radio.Group options={SOURCE_OPTIONS} optionType="button" buttonStyle="solid" />
          </Form.Item>

          {source === "audio" ? (
            <Form.Item
              name="audioUrl"
              label="File âm thanh"
              rules={[{ required: true, message: "Hãy tải file âm thanh lên" }]}
            >
              <AudioUpload
                onUploaded={({ durationSec }) => {
                  if (durationSec) form?.setFieldValue("durationSec", durationSec)
                }}
              />
            </Form.Item>
          ) : (
            <>
              <Form.Item
                name="youtubeInput"
                label="Link hoặc ID video YouTube"
                extra="Dán link (youtube.com/watch?v=…, youtu.be/…) hoặc ID 11 ký tự."
                rules={[
                  {
                    validator: (_rule, value: string | undefined) =>
                      value && parseYouTubeVideoId(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Nhập link YouTube hợp lệ hoặc ID 11 ký tự")),
                  },
                ]}
              >
                <Input allowClear placeholder="https://www.youtube.com/watch?v=…" />
              </Form.Item>
              {videoId ? (
                <div style={{ marginBottom: 24 }}>
                  <iframe
                    title="Xem trước video YouTube"
                    src={youtubeEmbedUrl(videoId)}
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ width: "100%", maxWidth: 480, aspectRatio: "16 / 9", border: 0 }}
                  />
                </div>
              ) : null}
            </>
          )}

          <Form.Item
            name="durationSec"
            label="Thời lượng"
            extra="Nhập dạng phút:giây (vd 3:25). Với file âm thanh, thời lượng được đọc tự động."
            rules={[{ required: true, message: "Nhập thời lượng của bài hát" }]}
          >
            <DurationInput />
          </Form.Item>

          <Form.Item name="language" label="Ngôn ngữ giọng hát">
            <Select
              allowClear
              placeholder="Không lời / chưa rõ"
              options={TRACK_LANGUAGES.map((language) => ({ ...language }))}
            />
          </Form.Item>

          <TagsField name="genres" label="Thể loại" placeholder="vd: v-pop, ballad" />
          <TagsField name="mood" label="Tâm trạng" placeholder="vd: buồn, sôi động" />
          <TagsField name="tags" label="Thẻ" placeholder="vd: ngày mưa, piano, gym" />

          <Form.Item
            name="description"
            label="Mô tả"
            extra="Vài câu về phong cách và cảm xúc của bài. Không dán lời bài hát vào đây."
            rules={[
              { max: DESCRIPTION_MAX_LENGTH, message: `Tối đa ${DESCRIPTION_MAX_LENGTH} ký tự` },
            ]}
          >
            <Input.TextArea rows={3} showCount maxLength={DESCRIPTION_MAX_LENGTH} />
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
