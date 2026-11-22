import { DatabaseSync } from "node:sqlite";

import type {
  CreateLmsClassInput,
  CreateLmsSessionInput,
  ILmsRepository,
  LmsAccount,
  LmsBuilding,
  LmsClass,
  LmsSession,
  LmsUnit,
  LmsUser,
} from "./lms.repository.ts";

export class SqliteLmsRepository implements ILmsRepository {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS units (code TEXT PRIMARY KEY, name TEXT NOT NULL, parent_code TEXT);
      CREATE TABLE IF NOT EXISTS users (code TEXT PRIMARY KEY, fullname TEXT NOT NULL, role TEXT NOT NULL, unit_code TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS accounts (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL, user_code TEXT UNIQUE NOT NULL);
      CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, lecturer_code TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS enrollments (class_id INTEGER NOT NULL, student_code TEXT NOT NULL, PRIMARY KEY (class_id, student_code));
      CREATE TABLE IF NOT EXISTS buildings (id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL);
      CREATE TABLE IF NOT EXISTS lms_sessions (id INTEGER PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, class_id INTEGER, title TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, radius REAL NOT NULL, open_at TEXT NOT NULL, close_at TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    this.allowGeneralSessions();
  }

  seed(): void {
    this.db.exec(`
      INSERT OR IGNORE INTO units VALUES
        ('DLU', 'Đại học Đà Lạt', NULL),
        ('CNTT', 'Khoa Công nghệ Thông tin', 'DLU'),
        ('QTKD', 'Khoa Quản trị Kinh doanh', 'DLU'),
        ('NN', 'Khoa Ngoại ngữ', 'DLU'),
        ('CNTT-K47', 'CNTT K47', 'CNTT'),
        ('CNTT-K48', 'CNTT K48', 'CNTT'),
        ('QTKD-K47', 'QTKD K47', 'QTKD'),
        ('NN-K47', 'Ngoại ngữ K47', 'NN');
      INSERT OR IGNORE INTO buildings VALUES
        (1, 'A', 'Tòa A — Cơ sở chính', 11.9404, 108.4583),
        (2, 'B', 'Tòa B — Khu giảng đường', 11.9412, 108.4591),
        (3, 'GPS-TEST', 'Điểm test GPS — sai số khoảng 132 m', 11.951604996184374, 108.43791111196973);
      INSERT OR IGNORE INTO users VALUES
        ('ADMIN', 'Quản trị LMS', 'admin', 'DLU'),
        ('GV001', 'Nguyễn Văn An', 'lecturer', 'CNTT'),
        ('GV002', 'Trần Thị Mai', 'lecturer', 'QTKD'),
        ('GV003', 'Lê Hoàng Nam', 'lecturer', 'NN'),
        ('SV001', 'Trần Minh Anh', 'student', 'CNTT-K47'),
        ('SV002', 'Lê Quốc Bình', 'student', 'CNTT-K47'),
        ('SV003', 'Nguyễn Hoài Phương', 'student', 'CNTT-K47'),
        ('SV004', 'Phạm Gia Hân', 'student', 'CNTT-K47'),
        ('SV005', 'Võ Thành Đạt', 'student', 'CNTT-K47'),
        ('SV006', 'Đỗ Khánh Linh', 'student', 'CNTT-K47'),
        ('SV007', 'Bùi Minh Khang', 'student', 'CNTT-K48'),
        ('SV008', 'Hoàng Ngọc Anh', 'student', 'CNTT-K48'),
        ('SV009', 'Dương Quốc Bảo', 'student', 'CNTT-K48'),
        ('SV010', 'Trương Mỹ Duyên', 'student', 'CNTT-K48'),
        ('SV011', 'Hồ Nhật Minh', 'student', 'CNTT-K48'),
        ('SV012', 'Lý Thu Trang', 'student', 'CNTT-K48'),
        ('SV013', 'Nguyễn Đức Huy', 'student', 'QTKD-K47'),
        ('SV014', 'Trần Ngọc Mai', 'student', 'QTKD-K47'),
        ('SV015', 'Phan Tuấn Kiệt', 'student', 'QTKD-K47'),
        ('SV016', 'Lâm Bảo Trân', 'student', 'QTKD-K47'),
        ('SV017', 'Đặng Minh Thư', 'student', 'NN-K47'),
        ('SV018', 'Vũ Hoàng Long', 'student', 'NN-K47'),
        ('SV019', 'Tạ Ngọc Hân', 'student', 'NN-K47'),
        ('SV020', 'Mai Anh Tuấn', 'student', 'NN-K47');
      UPDATE users SET role = 'lecturer' WHERE role = 'organizer';
      UPDATE users SET role = 'student' WHERE role = 'participant';
      INSERT OR IGNORE INTO accounts VALUES
        ('admin', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'ADMIN'),
        ('gv001', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'GV001'),
        ('gv002', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'GV002'),
        ('gv003', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'GV003'),
        ('sv001', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV001'),
        ('sv002', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV002'),
        ('sv003', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV003'),
        ('sv004', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV004'),
        ('sv005', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV005'),
        ('sv006', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV006'),
        ('sv007', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV007'),
        ('sv008', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV008'),
        ('sv009', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV009'),
        ('sv010', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV010'),
        ('sv011', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV011'),
        ('sv012', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV012'),
        ('sv013', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV013'),
        ('sv014', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV014'),
        ('sv015', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV015'),
        ('sv016', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV016'),
        ('sv017', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV017'),
        ('sv018', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV018'),
        ('sv019', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV019'),
        ('sv020', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV020');
      INSERT OR IGNORE INTO classes VALUES
        (1, 'INT101', 'Nhập môn lập trình', 'GV001'),
        (2, 'WEB201', 'Phát triển ứng dụng Web', 'GV001'),
        (3, 'DBS202', 'Cơ sở dữ liệu', 'GV001'),
        (4, 'MOB301', 'Phát triển ứng dụng di động', 'GV001'),
        (5, 'SWE302', 'Công nghệ phần mềm', 'GV001'),
        (6, 'NET203', 'Mạng máy tính', 'GV001'),
        (7, 'SEC303', 'An toàn thông tin', 'GV001'),
        (8, 'AI401', 'Nhập môn trí tuệ nhân tạo', 'GV001'),
        (9, 'MKT201', 'Marketing căn bản', 'GV002'),
        (10, 'BUS101', 'Quản trị học', 'GV002'),
        (11, 'ENG101', 'Tiếng Anh học thuật', 'GV003'),
        (12, 'ENG201', 'Kỹ năng giao tiếp', 'GV003');
      INSERT OR IGNORE INTO enrollments VALUES
        (1, 'SV001'), (1, 'SV002'), (1, 'SV003'), (1, 'SV004'), (1, 'SV005'), (1, 'SV006'),
        (2, 'SV007'), (2, 'SV008'), (2, 'SV009'), (2, 'SV010'), (2, 'SV011'), (2, 'SV012'),
        (3, 'SV001'), (3, 'SV002'), (3, 'SV003'), (3, 'SV007'), (3, 'SV008'), (3, 'SV009'),
        (4, 'SV001'), (4, 'SV002'), (4, 'SV003'), (4, 'SV004'), (4, 'SV005'), (4, 'SV006'),
        (5, 'SV007'), (5, 'SV008'), (5, 'SV009'), (5, 'SV010'), (5, 'SV011'), (5, 'SV012'),
        (6, 'SV001'), (6, 'SV002'), (6, 'SV003'), (6, 'SV004'), (6, 'SV007'), (6, 'SV008'),
        (7, 'SV005'), (7, 'SV006'), (7, 'SV007'), (7, 'SV008'), (7, 'SV009'), (7, 'SV010'),
        (8, 'SV001'), (8, 'SV002'), (8, 'SV003'), (8, 'SV004'), (8, 'SV005'), (8, 'SV006'),
        (8, 'SV007'), (8, 'SV008'), (8, 'SV009'), (8, 'SV010'), (8, 'SV011'), (8, 'SV012'),
        (9, 'SV013'), (9, 'SV014'), (9, 'SV015'), (9, 'SV016'),
        (10, 'SV013'), (10, 'SV014'), (10, 'SV015'), (10, 'SV016'),
        (11, 'SV017'), (11, 'SV018'), (11, 'SV019'), (11, 'SV020'),
        (12, 'SV017'), (12, 'SV018'), (12, 'SV019'), (12, 'SV020');
    `);
  }

  listClasses(): LmsClass[] {
    return this.db.prepare(
      "SELECT id, code, name, lecturer_code AS lecturerCode FROM classes ORDER BY code",
    ).all() as unknown as LmsClass[];
  }

  findClass(id: number): LmsClass | null {
    return (this.db.prepare(
      "SELECT id, code, name, lecturer_code AS lecturerCode FROM classes WHERE id = ?",
    ).get(id) as LmsClass | undefined) ?? null;
  }

  findClassByCode(code: string): LmsClass | null {
    return (this.db.prepare(
      "SELECT id, code, name, lecturer_code AS lecturerCode FROM classes WHERE code = ?",
    ).get(code) as LmsClass | undefined) ?? null;
  }

  createClassWithEnrollments(input: CreateLmsClassInput): LmsClass {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = this.db.prepare(
        "INSERT INTO classes (code, name, lecturer_code) VALUES (?, ?, ?)",
      ).run(input.code, input.name, input.lecturerCode);
      const id = Number(result.lastInsertRowid);
      const insertEnrollment = this.db.prepare(
        "INSERT INTO enrollments (class_id, student_code) VALUES (?, ?)",
      );
      for (const studentCode of input.studentCodes) {
        insertEnrollment.run(id, studentCode);
      }
      this.db.exec("COMMIT");
      return {
        id,
        code: input.code,
        name: input.name,
        lecturerCode: input.lecturerCode,
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listStudentCodes(classId: number): string[] {
    return (this.db.prepare(
      "SELECT student_code FROM enrollments WHERE class_id = ? ORDER BY student_code",
    ).all(classId) as { student_code: string }[]).map((row) =>
      row.student_code
    );
  }

  listStudents(classId: number): LmsUser[] {
    return this.db.prepare(`
      SELECT users.code, users.fullname, users.role, users.unit_code AS unitCode
      FROM enrollments
      JOIN users ON users.code = enrollments.student_code
      WHERE enrollments.class_id = ?
      ORDER BY users.code
    `).all(classId) as unknown as LmsUser[];
  }

  listBuildings(): LmsBuilding[] {
    return this.db.prepare(
      "SELECT id, code, name, latitude, longitude FROM buildings ORDER BY code",
    ).all() as unknown as LmsBuilding[];
  }
  findBuilding(id: number): LmsBuilding | null {
    return (this.db.prepare(
      "SELECT id, code, name, latitude, longitude FROM buildings WHERE id = ?",
    ).get(id) as LmsBuilding | undefined) ?? null;
  }

  createSession(input: CreateLmsSessionInput): LmsSession {
    const externalId = `LMS-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const result = this.db.prepare(
      "INSERT INTO lms_sessions (external_id, class_id, title, latitude, longitude, radius, open_at, close_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).run(
      externalId,
      input.classId,
      input.title,
      input.latitude,
      input.longitude,
      input.radius,
      input.openAt,
      input.closeAt,
      createdAt,
    );
    return {
      id: Number(result.lastInsertRowid),
      externalId,
      createdAt,
      ...input,
    };
  }

  listUnits(): LmsUnit[] {
    return this.db.prepare(
      "SELECT code, name, parent_code AS parentCode FROM units ORDER BY code",
    ).all() as unknown as LmsUnit[];
  }

  findUnit(code: string): LmsUnit | null {
    return (this.db.prepare(
      "SELECT code, name, parent_code AS parentCode FROM units WHERE code = ?",
    ).get(code) as LmsUnit | undefined) ?? null;
  }

  createUnit(unit: LmsUnit): void {
    this.db.prepare(
      "INSERT INTO units (code, name, parent_code) VALUES (?, ?, ?)",
    ).run(unit.code, unit.name, unit.parentCode);
  }

  listUsers(): LmsUser[] {
    return this.db.prepare(
      "SELECT code, fullname, role, unit_code AS unitCode FROM users ORDER BY code",
    ).all() as unknown as LmsUser[];
  }

  findAccount(username: string): LmsAccount | null {
    return (this.db.prepare(
      "SELECT username, password_hash AS passwordHash, user_code AS userCode FROM accounts WHERE username = ?",
    ).get(username) as LmsAccount | undefined) ?? null;
  }
  findUser(code: string): LmsUser | null {
    return (this.db.prepare(
      "SELECT code, fullname, role, unit_code AS unitCode FROM users WHERE code = ?",
    ).get(code) as LmsUser | undefined) ?? null;
  }

  createUserWithAccount(user: LmsUser, account: LmsAccount): void {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare(
        "INSERT INTO users (code, fullname, role, unit_code) VALUES (?, ?, ?, ?)",
      ).run(user.code, user.fullname, user.role, user.unitCode);
      this.db.prepare(
        "INSERT INTO accounts (username, password_hash, user_code) VALUES (?, ?, ?)",
      ).run(account.username, account.passwordHash, account.userCode);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }

  private allowGeneralSessions(): void {
    const classId =
      (this.db.prepare("PRAGMA table_info(lms_sessions)").all() as {
        name: string;
        notnull: number;
      }[]).find((column) => column.name === "class_id");
    if (classId?.notnull !== 1) return;

    this.db.exec(`
      BEGIN IMMEDIATE;
      ALTER TABLE lms_sessions RENAME TO lms_sessions_legacy;
      CREATE TABLE lms_sessions (id INTEGER PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, class_id INTEGER, title TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, radius REAL NOT NULL, open_at TEXT NOT NULL, close_at TEXT NOT NULL, created_at TEXT NOT NULL);
      INSERT INTO lms_sessions SELECT * FROM lms_sessions_legacy;
      DROP TABLE lms_sessions_legacy;
      COMMIT;
    `);
  }
}
