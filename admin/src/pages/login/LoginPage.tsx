import { LockOutlined, MailOutlined } from "@ant-design/icons"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useLogin } from "@refinedev/core"
import { Alert, Button, Card, Form, Input, Typography } from "antd"
import { useRef, useState } from "react"
import { TURNSTILE_SITE_KEY } from "@/config/env"
import type { LoginParams } from "@/providers/authProvider"
import { useColorMode } from "@/theme/color-mode"

interface LoginValues {
  email: string
  password: string
}

/** Email + password, with the Cloudflare Turnstile check when the site key is configured. */
export function LoginPage() {
  const { mutate: login, isPending } = useLogin<LoginParams>()
  const { mode } = useColorMode()
  const widget = useRef<TurnstileInstance>(undefined)
  const [token, setToken] = useState<string | null>(null)
  const [widgetFailed, setWidgetFailed] = useState(false)
  const needsCheck = TURNSTILE_SITE_KEY !== ""

  const submit = (values: LoginValues) => {
    login(
      { ...values, turnstileToken: token ?? undefined },
      {
        onSettled: () => {
          // A Turnstile token works once: after any answer the widget must give a new one.
          setToken(null)
          widget.current?.reset()
        },
      },
    )
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <Card style={{ width: "100%", maxWidth: 400 }}>
        <Typography.Title level={3} style={{ textAlign: "center", marginTop: 0 }}>
          Music Stream Admin
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: "center" }}>
          Đăng nhập bằng tài khoản quản trị viên
        </Typography.Paragraph>

        <Form<LoginValues> layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Nhập email" },
              { type: "email", message: "Email không hợp lệ" },
            ]}
          >
            <Input prefix={<MailOutlined />} autoComplete="username" size="large" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: "Nhập mật khẩu" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              autoComplete="current-password"
              size="large"
            />
          </Form.Item>

          {needsCheck ? (
            <Form.Item>
              <Turnstile
                ref={widget}
                siteKey={TURNSTILE_SITE_KEY}
                options={{ action: "login", theme: mode, size: "flexible" }}
                onSuccess={(value) => {
                  setToken(value)
                  setWidgetFailed(false)
                }}
                onExpire={() => setToken(null)}
                onError={() => setWidgetFailed(true)}
              />
              {widgetFailed ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginTop: 8 }}
                  message="Không tải được bước kiểm tra bảo mật. Kiểm tra mạng và tải lại trang."
                />
              ) : null}
            </Form.Item>
          ) : null}

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isPending}
            disabled={needsCheck && token === null}
          >
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  )
}
