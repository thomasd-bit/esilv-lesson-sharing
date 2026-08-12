export const COMMENT_PAGE_SIZE = 30;

export function getCommentRange(offset: number, pageSize = COMMENT_PAGE_SIZE) {
  const safeOffset = Math.max(0, Math.floor(offset));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  return { from: safeOffset, to: safeOffset + safePageSize - 1 };
}

export function hasMoreCommentPage(count: number, pageSize = COMMENT_PAGE_SIZE) {
  return count >= Math.max(1, Math.floor(pageSize));
}
