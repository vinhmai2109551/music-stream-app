/** Input limits; they mirror the backend DTO validation (backend/src/modules/auth/dto). */
export const AUTH_LIMITS = {
  emailMax: 254,
  nameMax: 80,
  passwordMin: 8,
  passwordMax: 72,
} as const
