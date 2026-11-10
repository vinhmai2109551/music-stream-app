import { Heart, MessageCircle, Share2 } from "lucide-react-native"
import { StyleSheet, View } from "react-native"
import { IconButton } from "@/components/ui/IconButton"
import { IconLabelButton } from "@/components/ui/IconLabelButton"
import { formatCount } from "@/utils/formatCount"
import { useTranslation } from "@/i18n"

type PlayerActionsProps = {
  liked: boolean
  likeCount: number
  commentCount: number
  onToggleLike: () => void
  onComments: () => void
  onShare: () => void
}

export function PlayerActions({
  liked,
  likeCount,
  commentCount,
  onToggleLike,
  onComments,
  onShare,
}: PlayerActionsProps) {
  const { t } = useTranslation()

  return (
    <View style={styles.row}>
      <IconLabelButton
        icon={Heart}
        label={formatCount(likeCount)}
        accessibilityLabel={t("player.likeCount", { count: likeCount })}
        color="white"
        active={liked}
        activeColor="like"
        onPress={onToggleLike}
      />
      <IconLabelButton
        icon={MessageCircle}
        label={formatCount(commentCount)}
        accessibilityLabel={t("player.commentCount", { count: commentCount })}
        color="white"
        onPress={onComments}
      />
      <IconButton icon={Share2} label={t("common.share")} color="white" onPress={onShare} />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
})
