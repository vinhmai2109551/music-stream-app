/** The first stop of the Tab key: jumps over the menu, which is the same on every page. */
export function SkipLink() {
  return (
    <a
      className="skip"
      href="#main"
      onClick={(event) => {
        event.preventDefault()
        const main = document.querySelector("main")
        if (!main) return
        main.tabIndex = -1
        main.focus()
      }}
    >
      Bỏ qua menu, tới nội dung
    </a>
  )
}
