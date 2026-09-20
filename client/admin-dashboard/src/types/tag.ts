/**
 * Domain type cho Tags (frontend).
 *
 * Backend `TagController` là `@Controller('tags')` (không prefix `/v0`),
 * `createdAt` là `Date` ở server nên qua JSON thành chuỗi ISO.
 * Không import model server để tránh lệ thuộc shape backend.
 */
export type Tag = {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
};

export type CreateTagRequest = {
  name: string;
};

/**
 * User tối thiểu để hiển thị khi gán tag.
 *
 * Lấy từ `GET /v0/users` (controller hiện có, không guard). Nếu directory
 * không tải được, UI fallback hiển thị `ID {id}` thay vì bịa tên.
 */
export type DirectoryUser = {
  id: number;
  code: string;
  fullname: string;
};

/** Backend giới hạn tên tag tối đa 100 ký tự. */
export const MAX_TAG_NAME_LENGTH = 100;

export type TagNameErrorKey = 'tags.nameRequired' | 'tags.nameTooLong';

export type TagNameValidation =
  | { ok: true; value: string }
  | { ok: false; error: TagNameErrorKey };

/** Pure validator: trim, chặn rỗng và chặn vượt 100 ký tự trước khi gửi. */
export const validateTagName = (input: string): TagNameValidation => {
  const value = input.trim();

  if (value.length === 0) {
    return { ok: false, error: 'tags.nameRequired' };
  }

  if (value.length > MAX_TAG_NAME_LENGTH) {
    return { ok: false, error: 'tags.nameTooLong' };
  }

  return { ok: true, value };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Kiểm tra shape response trước khi ghi vào state, tránh success giả. */
export const isTag = (value: unknown): value is Tag => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    typeof value.name === 'string' &&
    typeof value.ownerId === 'number' &&
    Number.isInteger(value.ownerId) &&
    typeof value.createdAt === 'string'
  );
};

export const isTagList = (value: unknown): value is Tag[] =>
  Array.isArray(value) && value.every(isTag);

/** Payload `GET /tags/:tagId/users` là `number[]` user ID. */
export const isUserIdList = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.every(
    (item): item is number =>
      typeof item === 'number' && Number.isInteger(item) && item > 0,
  );

export const isDirectoryUser = (value: unknown): value is DirectoryUser => {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    value.id > 0 &&
    typeof value.code === 'string' &&
    typeof value.fullname === 'string'
  );
};

export const isDirectoryUserList = (
  value: unknown,
): value is DirectoryUser[] =>
  Array.isArray(value) && value.every(isDirectoryUser);

/**
 * Parse ô nhập user ID thủ công (fallback khi directory lỗi).
 * Trả `null` khi không phải số nguyên dương.
 */
export const parseUserIdInput = (input: string): number | null => {
  const trimmed = input.trim();

  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;

  return parsed;
};
