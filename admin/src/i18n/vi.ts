/** Vietnamese texts for the labels that Refine and its Ant Design components draw themselves. */
export const vi: Record<string, string> = {
  "buttons.create": "Tạo mới",
  "buttons.save": "Lưu",
  "buttons.logout": "Đăng xuất",
  "buttons.delete": "Xoá",
  "buttons.edit": "Sửa",
  "buttons.show": "Xem",
  "buttons.list": "Danh sách",
  "buttons.clone": "Nhân bản",
  "buttons.refresh": "Làm mới",
  "buttons.cancel": "Huỷ",
  "buttons.confirm": "Bạn chắc chắn chứ?",
  "buttons.filter": "Lọc",
  "buttons.clear": "Xoá lọc",
  "buttons.undo": "Hoàn tác",
  "buttons.import": "Nhập",
  "buttons.export": "Xuất",
  "buttons.notAccessTitle": "Bạn không có quyền thực hiện thao tác này",

  "notifications.success": "Thành công",
  "notifications.error": "Có lỗi (mã {{statusCode}})",
  "notifications.createSuccess": "Đã tạo {{resource}}",
  "notifications.createError": "Không tạo được {{resource}} (mã {{statusCode}})",
  "notifications.editSuccess": "Đã cập nhật {{resource}}",
  "notifications.editError": "Không cập nhật được {{resource}} (mã {{statusCode}})",
  "notifications.deleteSuccess": "Đã xoá {{resource}}",
  "notifications.deleteError": "Không xoá được {{resource}} (mã {{statusCode}})",
  "notifications.undoable": "Bạn có {{seconds}} giây để hoàn tác",

  warnWhenUnsavedChanges: "Bạn có thay đổi chưa lưu. Rời trang sẽ mất các thay đổi này.",
  "autoSave.success": "Đã lưu",
  "autoSave.error": "Lỗi khi lưu",
  "autoSave.loading": "Đang lưu…",
  "autoSave.idle": "Tự động lưu",

  "pages.error.404": "Xin lỗi, không tìm thấy trang này.",
  "pages.error.info": "Bạn đã mở đường dẫn không đúng?",
  "pages.error.backHome": "Về trang chủ",

  "tracks.tracks": "bài hát",
  "tracks.titles.list": "Bài hát",
  "tracks.titles.create": "Thêm bài hát",
  "tracks.titles.edit": "Sửa bài hát",
  "tracks.titles.show": "Chi tiết bài hát",
  "artists.artists": "nghệ sĩ",
  "artists.titles.list": "Nghệ sĩ",
  "artists.titles.create": "Thêm nghệ sĩ",
  "artists.titles.edit": "Sửa nghệ sĩ",
  "artists.titles.show": "Chi tiết nghệ sĩ",
  "albums.albums": "album",
  "albums.titles.list": "Album",
  "albums.titles.create": "Thêm album",
  "albums.titles.edit": "Sửa album",
  "albums.titles.show": "Chi tiết album",
  "users.users": "người dùng",
  "users.titles.list": "Người dùng",
  "feed.feed": "bài đăng",
  "feed.titles.list": "Feed",
  "feed.titles.create": "Đăng bài mới",
}

function interpolate(template: string, params: Record<string, unknown> | undefined): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) =>
    params && params[name] !== undefined ? String(params[name]) : "",
  )
}

/** Refine's `translate`: the Vietnamese text of a key, else the default Refine gave (English). */
export function translate(key: string, options?: unknown, defaultMessage?: string): string {
  const params =
    typeof options === "object" && options !== null
      ? (options as Record<string, unknown>)
      : undefined
  const fallback = typeof options === "string" ? options : defaultMessage
  const text = vi[key] ?? fallback ?? key
  return interpolate(text, params)
}
