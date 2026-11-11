import { LockOutlined, MailOutlined } from "@ant-design/icons"
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile"
import { useLogin } from "@refinedev/core"
import { Alert, Button, Form, Input, Typography } from "antd"
import { useRef, useState } from "react"
import loginArt from "@/assets/login-art.jpg"
import { TURNSTILE_SITE_KEY } from "@/config/env"
import { Logo } from "@/layout/Logo"
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
    <main className="login">
      <aside className="login__art" aria-hidden="true">
        <div className="login__frame">
          <img src={loginArt} alt="" width={390} height={844} />
        </div>
        <p className="login__tagline">
          Quản lý bài hát, lời bài hát và người dùng của Music Stream.
        </p>
      </aside>

      <section className="login__panel">
        <div className="login__card">
          <div className="login__head">
            <Logo size={40} />
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Đăng nhập quản trị
              </Typography.Title>
              <Typography.Text type="secondary">Dành cho tài khoản quản trị viên</Typography.Text>
            </div>
          </div>

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
        </div>
      </section>
    </main>
  )
}
