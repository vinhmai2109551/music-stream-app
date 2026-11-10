/** Public API of the uploads module. Other modules must import from here only. */
export { PresignedUploadDto } from "./dto/presign-upload.dto.js"
export { UploadsModule } from "./uploads.module.js"
export { UploadsService } from "./uploads.service.js"
export type { AvatarUploadRequest, PresignedUpload } from "./uploads.service.js"
