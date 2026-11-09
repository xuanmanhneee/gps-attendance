import { DatabaseSync } from "node:sqlite";

import type {
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
      CREATE TABLE IF NOT EXISTS lms_sessions (id INTEGER PRIMARY KEY, external_id TEXT UNIQUE NOT NULL, class_id INTEGER NOT NULL, title TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, radius REAL NOT NULL, open_at TEXT NOT NULL, close_at TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
  }

  seed(): void {
    this.db.exec(`
      INSERT OR IGNORE INTO units VALUES ('DLU', 'Đại học Đà Lạt', NULL), ('CNTT', 'Khoa Công nghệ Thông tin', 'DLU'), ('CNTT-K47', 'CNTT K47', 'CNTT');
      INSERT OR IGNORE INTO buildings VALUES (1, 'A', 'Tòa A — Cơ sở chính', 11.9404, 108.4583), (2, 'B', 'Tòa B — Khu giảng đường', 11.9412, 108.4591);
      INSERT OR IGNORE INTO users VALUES ('GV001', 'Nguyễn Văn An', 'organizer', 'CNTT'), ('SV001', 'Trần Minh Anh', 'participant', 'CNTT-K47'), ('SV002', 'Lê Quốc Bình', 'participant', 'CNTT-K47');
      INSERT OR IGNORE INTO accounts VALUES ('gv001', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'GV001'), ('sv001', 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791', 'SV001');
      INSERT OR IGNORE INTO classes VALUES
        (1, 'INT101', 'Nhập môn lập trình', 'GV001'),
        (2, 'WEB201', 'Phát triển ứng dụng Web', 'GV001'),
        (3, 'DBS202', 'Cơ sở dữ liệu', 'GV001'),
        (4, 'MOB301', 'Phát triển ứng dụng di động', 'GV001'),
        (5, 'SWE302', 'Công nghệ phần mềm', 'GV001'),
        (6, 'NET203', 'Mạng máy tính', 'GV001'),
        (7, 'SEC303', 'An toàn thông tin', 'GV001'),
        (8, 'AI401', 'Nhập môn trí tuệ nhân tạo', 'GV001');
      INSERT OR IGNORE INTO enrollments VALUES
        (1, 'SV001'), (1, 'SV002'), (2, 'SV001'), (2, 'SV002'),
        (3, 'SV001'), (3, 'SV002'), (4, 'SV001'), (4, 'SV002'),
        (5, 'SV001'), (5, 'SV002'), (6, 'SV001'), (6, 'SV002'),
        (7, 'SV001'), (7, 'SV002'), (8, 'SV001'), (8, 'SV002');
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

  close(): void {
    this.db.close();
  }
}
