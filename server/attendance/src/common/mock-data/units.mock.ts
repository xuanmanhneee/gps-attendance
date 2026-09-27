import { Unit } from "#units/unit.model";

export const mockUnits: Unit[] = [
  // ===== Trường Đại học =====
  {
    id: 1,
    name: 'Trường Đại học Công nghệ',
    parentId: null,
    level: 0,
  },

  // ===== Khoa =====
  {
    id: 2,
    name: 'Khoa Công nghệ Thông tin',
    parentId: 1,
    level: 1,
  },
  {
    id: 3,
    name: 'Khoa Điện - Điện tử',
    parentId: 1,
    level: 1,
  },
  {
    id: 4,
    name: 'Khoa Kinh tế',
    parentId: 1,
    level: 1,
  },

  // ===== Bộ môn CNTT =====
  {
    id: 5,
    name: 'Bộ môn Kỹ thuật Phần mềm',
    parentId: 2,
    level: 2,
  },
  {
    id: 6,
    name: 'Bộ môn Hệ thống Thông tin',
    parentId: 2,
    level: 2,
  },
  {
    id: 7,
    name: 'Bộ môn Mạng máy tính',
    parentId: 2,
    level: 2,
  },

  // ===== Bộ môn Điện - Điện tử =====
  {
    id: 8,
    name: 'Bộ môn Điện tử',
    parentId: 3,
    level: 2,
  },
  {
    id: 9,
    name: 'Bộ môn Tự động hóa',
    parentId: 3,
    level: 2,
  },

  // ===== Bộ môn Kinh tế =====
  {
    id: 10,
    name: 'Bộ môn Quản trị kinh doanh',
    parentId: 4,
    level: 2,
  },
  {
    id: 11,
    name: 'Bộ môn Tài chính',
    parentId: 4,
    level: 2,
  },

  // ===== Phòng/Ban trực thuộc trường =====
  {
    id: 12,
    name: 'Phòng Đào tạo',
    parentId: 1,
    level: 1,
  },
  {
    id: 13,
    name: 'Phòng Công tác sinh viên',
    parentId: 1,
    level: 1,
  },
  {
    id: 14,
    name: 'Phòng Tổ chức - Hành chính',
    parentId: 1,
    level: 1,
  },

  // ===== Trung tâm =====
  {
    id: 15,
    name: 'Trung tâm Công nghệ thông tin',
    parentId: 1,
    level: 1,
  },
  {
    id: 16,
    name: 'Trung tâm Ngoại ngữ',
    parentId: 1,
    level: 1,
  },

  // ===== Một root khác để test forest =====
  {
    id: 17,
    name: 'Viện Nghiên cứu Công nghệ',
    parentId: null,
    level: 0,
  },
  {
    id: 18,
    name: 'Phòng Nghiên cứu AI',
    parentId: 17,
    level: 1,
  },
  {
    id: 19,
    name: 'Phòng Nghiên cứu IoT',
    parentId: 17,
    level: 1,
  },
];