import dayjs from "dayjs"
import "dayjs/locale/vi"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./index.css"

dayjs.locale("vi")

const root = document.getElementById("root")
if (!root) throw new Error("#root not found")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
