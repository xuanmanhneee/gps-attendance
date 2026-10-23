/** Tag được trả về từ API. */
export interface TagResponse {
  id: number;
  name: string;
  ownerId: number;
  createdAt: string;
}

/** Tag kèm danh sách ID người dùng được gắn tag. */
export interface TagWithUsersResponse extends TagResponse {
  userIds: number[];
}

/** Dữ liệu yêu cầu tạo Tag. */
export interface CreateTagRequest {
  name: string;
}

/** Dữ liệu yêu cầu cập nhật Tag. */
export interface UpdateTagRequest {
  name?: string;
}
