import { router } from "expo-router"
import { ChevronLeft } from "lucide-react-native"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { makeStyles, sizes, spacing } from "@/theme"
import { AppText } from "./AppText"
import { IconButton } from "./IconButton"
import { useTranslation } from "@/i18n"

type TopBarProps = {
  title?: string
}

/** Back button + optional title for pushed screens. Respects the top safe area. */
export function TopBar({ title }: TopBarProps) {
  const { t } = useTranslation()

  const styles = useStyles()

  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + sizes.topBarHeight }]}>
      <IconButton
        icon={ChevronLeft}
        label={t("common.back")}
        color="text"
        onPress={() => router.back()}
      />
      {title !== undefined && (
        <AppText variant="subtitle" numberOfLines={1} ellipsizeMode="tail" style={styles.title}>
          {title}
        </AppText>
      )}
    </View>
  )
}

const useStyles = makeStyles((colors) => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  title: { flex: 1, marginLeft: spacing.xs },
}))
