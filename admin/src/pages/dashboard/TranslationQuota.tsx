import { Alert, Button, Card, Progress, Skeleton, Typography } from "antd"
import type { TranslationUsage } from "@/api/types"
import { useApi } from "@/hooks/useApi"
import { formatNumber } from "@/lib/time"

/** How much of the monthly DeepL allowance is used (it is spent by translating lyrics). */
export function TranslationQuota() {
  const usage = useApi<TranslationUsage>("/translation/usage")
  const { data, error, loading } = usage

  return (
    <Card
      title="Hạn mức dịch DeepL"
      extra={
        <Button size="small" onClick={usage.reload}>
          Làm mới
        </Button>
      }
    >
      {loading && !data ? (
        <Skeleton active />
      ) : error && !data ? (
        <Alert
          type="warning"
          showIcon
          message="Không đọc được hạn mức"
          description={error.message}
        />
      ) : data && !data.configured ? (
        <Alert
          type="info"
          showIcon
          message="Chưa cấu hình DeepL"
          description="Máy chủ chưa có DEEPL_API_KEY nên chưa dịch được lời bài hát."
        />
      ) : data ? (
        <div style={{ display: "grid", gap: 8 }}>
          <Progress
            percent={Math.min(100, Math.round(data.percent ?? 0))}
            status={data.warning ? "exception" : "normal"}
          />
          <Typography.Text>
            Đã dùng {formatNumber(data.used ?? 0)} / {formatNumber(data.limit ?? 0)} ký tự trong
            tháng
          </Typography.Text>
          {data.warning ? (
            <Alert
              type="warning"
              showIcon
              message="Đã dùng từ 80% hạn mức"
              description="Dịch thêm sẽ bị chặn khi gần hết hạn mức."
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
