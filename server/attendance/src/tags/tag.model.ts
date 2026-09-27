export interface Tag {
  id: number;
  name: string;
  ownerId: number; // Account.id của user sở hữu tag
  createdAt: Date;
}

// Input khi tạo mới — không có id, createdAt (DB tự sinh)
export interface CreateTagRecord {
  name: string;
  ownerId: number;
}

// Input khi update — cho phép sửa từng phần
export interface UpdateTagRecord {
  name?: string;
}

// Domain shape khi cần kèm danh sách user được gắn tag
// (thay thế cho việc lộ bảng join UserTag ra ngoài)
export interface TagWithUsers extends Tag {
  userIds: number[];
}
