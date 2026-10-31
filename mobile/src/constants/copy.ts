import { AUTH_LIMITS } from "./auth"

export const copy = {
  appName: "Music Stream",
  greeting: {
    morning: "Good morning,",
    afternoon: "Good afternoon,",
    evening: "Good evening,",
  },
  searchPlaceholder: "What do you want to listen to?",
  launchHeadline: "Your music, your artists",
  launchSubtitle: "Millions of songs from artists you love.",
  defaultSource: "Music Stream",

  /** Generic errors, used by the API client and any screen that talks to the server. */
  errors: {
    network: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
    timeout: "Máy chủ phản hồi quá lâu. Vui lòng thử lại.",
    server: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
    tooManyRequests: "Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
    unknown: "Đã có lỗi xảy ra. Vui lòng thử lại.",
    notConfigured: "Chưa cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_URL).",
    loadFailedTitle: "Không tải được dữ liệu",
    notFoundTitle: "Không tìm thấy",
    notFoundDescription: "Nội dung này không còn tồn tại.",
  },

  account: {
    title: "Account",
  },

  common: {
    retry: "Thử lại",
  },

  home: {
    emptyTitle: "Nothing to listen to yet",
    emptyDescription: "New music will show up here.",
  },

  library: {
    addedTo: "Added to",
    alreadyIn: "Already in",
    addToPlaylist: "Add to playlist",
    noPlaylists: "You have no playlists yet",
    loadFailed: "Couldn't load your playlists",
    newPlaylist: "New playlist",
    playlistNamePlaceholder: "Playlist name",
    createPlaylist: "Create",
  },

  auth: {
    login: {
      title: "Chào mừng trở lại",
      subtitle: "Đăng nhập để tiếp tục nghe nhạc",
      submit: "Đăng nhập",
      switchPrompt: "Chưa có tài khoản?",
      switchAction: "Đăng ký",
    },
    register: {
      title: "Tạo tài khoản",
      subtitle: "Chỉ mất một phút để bắt đầu",
      submit: "Đăng ký",
      switchPrompt: "Đã có tài khoản?",
      switchAction: "Đăng nhập",
    },
    fields: {
      email: { label: "Email", placeholder: "ten@email.com" },
      name: { label: "Tên hiển thị", placeholder: "Tên của bạn" },
      password: { label: "Mật khẩu", placeholder: "Nhập mật khẩu" },
    },
    showPassword: "Hiện mật khẩu",
    hidePassword: "Ẩn mật khẩu",
    logout: "Đăng xuất",
    validation: {
      emailRequired: "Vui lòng nhập email",
      emailInvalid: "Email không hợp lệ",
      emailTooLong: `Email tối đa ${AUTH_LIMITS.emailMax} ký tự`,
      nameRequired: "Vui lòng nhập tên",
      nameTooLong: `Tên tối đa ${AUTH_LIMITS.nameMax} ký tự`,
      passwordRequired: "Vui lòng nhập mật khẩu",
      passwordTooShort: `Mật khẩu phải có ít nhất ${AUTH_LIMITS.passwordMin} ký tự`,
      passwordTooLong: `Mật khẩu tối đa ${AUTH_LIMITS.passwordMax} ký tự`,
    },
    errors: {
      invalidCredentials: "Email hoặc mật khẩu không đúng",
      emailTaken: "Email đã được đăng ký",
    },
  },
} as const
