import { memo, useMemo } from "react"
import { View } from "react-native"
import { AppText } from "@/components/ui/AppText"
import { type ColorToken, fontFamily, makeStyles, sizes, spacing } from "@/theme"
import { parseBlocks, type TextSpan } from "@/utils/assistantText"

const BULLET = "•"

type SpansProps = { spans: TextSpan[]; color: ColorToken }

function Spans({ spans, color }: SpansProps) {
  return (
    <>
      {spans.map((span, index) =>
        span.bold ? (
          <AppText key={index} color={color} style={{ fontFamily: fontFamily.semibold }}>
            {span.text}
          </AppText>
        ) : (
          span.text
        ),
      )}
    </>
  )
}

type RichTextProps = {
  text: string
  color?: ColorToken
}

/** The text of an answer: paragraphs, bullet and numbered lists, bold words. Plain text can be copied. */
function RichTextBase({ text, color = "text" }: RichTextProps) {
  const styles = useStyles()

  const blocks = useMemo(() => parseBlocks(text), [text])
  return (
    <View style={styles.blocks}>
      {blocks.map((block, index) => {
        if (block.type === "paragraph") {
          return (
            <AppText key={index} color={color} selectable>
              <Spans spans={block.spans} color={color} />
            </AppText>
          )
        }
        const items =
          block.type === "bullets"
            ? block.items.map((spans) => ({ marker: BULLET, spans }))
            : block.items.map((item) => ({ marker: `${item.number}.`, spans: item.spans }))
        return (
          <View key={index} style={styles.list}>
            {items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.item}>
                <AppText color={color} style={styles.marker}>
                  {item.marker}
                </AppText>
                <AppText color={color} selectable style={styles.itemText}>
                  <Spans spans={item.spans} color={color} />
                </AppText>
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

export const RichText = memo(RichTextBase)

const useStyles = makeStyles(() => ({
  blocks: { gap: spacing.sm },
  list: { gap: spacing.xs },
  item: { flexDirection: "row", gap: spacing.sm },
  marker: { width: sizes.trackNumberWidth, textAlign: "right" },
  itemText: { flex: 1, minWidth: 0 },
}))
