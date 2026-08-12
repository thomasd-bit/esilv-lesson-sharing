export const MAX_RESOURCE_FILE_SIZE = 10 * 1024 * 1024;

export const RESOURCE_FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip";

const ACCEPTED_RESOURCE_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "zip",
]);

const ACCEPTED_RESOURCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

export function resourceFileError(file: Pick<File, "name" | "size" | "type">) {
  if (file.size > MAX_RESOURCE_FILE_SIZE) {
    return "Le fichier ne doit pas dépasser 10 Mo.";
  }

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const extensionAccepted = ACCEPTED_RESOURCE_EXTENSIONS.has(extension);
  const mimeAccepted = !file.type || ACCEPTED_RESOURCE_MIME_TYPES.has(file.type.toLowerCase());
  if (!extensionAccepted || !mimeAccepted) {
    return "Ce format n’est pas accepté. Utilisez un PDF, une image, un document, une présentation, un tableur ou un ZIP.";
  }

  return null;
}
