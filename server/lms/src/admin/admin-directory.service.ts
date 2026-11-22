import type {
  ILmsRepository,
  LmsClass,
  LmsUnit,
  LmsUser,
} from "../database/lms.repository.ts";
import { hashPassword, verifyPassword } from "../auth/password.ts";

export const AdminDirectoryErrorCode = {
  FORBIDDEN: "LMS_ADMIN_FORBIDDEN",
  INVALID_INPUT: "LMS_ADMIN_INVALID_INPUT",
  UNIT_NOT_FOUND: "LMS_ADMIN_UNIT_NOT_FOUND",
  CONFLICT: "LMS_ADMIN_CONFLICT",
  SYNC_FAILED: "LMS_ADMIN_SYNC_FAILED",
} as const;

export class AdminDirectoryError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface CreateLmsUnitInput {
  code?: string;
  name?: string;
  parentCode?: string | null;
}

export interface CreateLmsUserInput {
  code?: string;
  fullname?: string;
  role?: string;
  unitCode?: string;
  username?: string;
  password?: string;
}

export interface CreateLmsClassRequest {
  code?: string;
  name?: string;
  lecturerCode?: string;
  studentCodes?: unknown;
}

export class AdminDirectoryService {
  constructor(private readonly repository: ILmsRepository) {}

  createUnit(input: CreateLmsUnitInput): { created: boolean; unit: LmsUnit } {
    if (
      input.parentCode !== undefined && input.parentCode !== null &&
      typeof input.parentCode !== "string"
    ) throw this.invalid("Mã unit cha không hợp lệ");
    const unit = {
      code: typeof input.code === "string" ? input.code.trim() : "",
      name: typeof input.name === "string" ? input.name.trim() : "",
      parentCode: input.parentCode?.trim() || null,
    };
    if (
      !unit.code || unit.code.length > 100 || !unit.name ||
      unit.name.length > 150 || unit.parentCode === unit.code
    ) {
      throw this.invalid("Mã và tên unit không hợp lệ");
    }
    if (unit.parentCode && !this.repository.findUnit(unit.parentCode)) {
      throw new AdminDirectoryError(
        422,
        AdminDirectoryErrorCode.UNIT_NOT_FOUND,
        "Không tìm thấy unit cha",
      );
    }

    const existing = this.repository.findUnit(unit.code);
    if (existing) {
      if (
        existing.name === unit.name && existing.parentCode === unit.parentCode
      ) return { created: false, unit: existing };
      throw this.conflict("Mã unit đã tồn tại với dữ liệu khác");
    }
    this.repository.createUnit(unit);
    return { created: true, unit };
  }

  async createUser(
    input: CreateLmsUserInput,
  ): Promise<{ created: boolean; user: LmsUser }> {
    const role = input.role;
    const user: LmsUser = {
      code: typeof input.code === "string" ? input.code.trim() : "",
      fullname: typeof input.fullname === "string" ? input.fullname.trim() : "",
      role: role === "lecturer" ? "lecturer" : "student",
      unitCode: typeof input.unitCode === "string" ? input.unitCode.trim() : "",
    };
    const username = typeof input.username === "string"
      ? input.username.trim().toLowerCase()
      : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (
      !user.code || user.code.length > 50 || !user.fullname ||
      user.fullname.length > 150 ||
      !["lecturer", "student"].includes(role ?? "") ||
      !user.unitCode || user.unitCode.length > 100 ||
      !/^[a-z0-9._-]{3,100}$/.test(username) || password.length < 8 ||
      password.length > 128
    ) throw this.invalid("Thông tin user hoặc account không hợp lệ");
    if (!this.repository.findUnit(user.unitCode)) {
      throw new AdminDirectoryError(
        422,
        AdminDirectoryErrorCode.UNIT_NOT_FOUND,
        "Không tìm thấy unit của user",
      );
    }

    const existingUser = this.repository.findUser(user.code);
    const existingAccount = this.repository.findAccount(username);
    if (existingUser || existingAccount) {
      const unchanged = existingUser?.fullname === user.fullname &&
        existingUser.role === user.role &&
        existingUser.unitCode === user.unitCode &&
        existingAccount?.userCode === user.code &&
        await verifyPassword(password, existingAccount.passwordHash);
      if (unchanged) return { created: false, user: existingUser };
      throw this.conflict("User code hoặc username đã tồn tại");
    }

    this.repository.createUserWithAccount(user, {
      username,
      passwordHash: await hashPassword(password),
      userCode: user.code,
    });
    return { created: true, user };
  }

  createClass(
    input: CreateLmsClassRequest,
  ): { created: boolean; class: LmsClass } {
    const code = typeof input.code === "string" ? input.code.trim() : "";
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const lecturerCode = typeof input.lecturerCode === "string"
      ? input.lecturerCode.trim()
      : "";
    const rawStudentCodes = Array.isArray(input.studentCodes)
      ? input.studentCodes
      : [];
    if (
      !code || code.length > 100 || !name || name.length > 150 ||
      !lecturerCode || lecturerCode.length > 50 ||
      rawStudentCodes.length === 0 || rawStudentCodes.length > 5000 ||
      rawStudentCodes.some((value) => typeof value !== "string")
    ) throw this.invalid("Thông tin lớp hoặc danh sách sinh viên không hợp lệ");
    const studentCodes = rawStudentCodes.map((value) => value.trim());
    if (
      studentCodes.some((studentCode) =>
        !studentCode || studentCode.length > 50
      ) ||
      new Set(studentCodes).size !== studentCodes.length
    ) throw this.invalid("Mã sinh viên phải khác rỗng và không trùng");

    const lecturer = this.repository.findUser(lecturerCode);
    if (lecturer?.role !== "lecturer") {
      throw this.invalid("Lecturer phải tồn tại trong LMS");
    }
    const invalidStudent = studentCodes.find((studentCode) =>
      this.repository.findUser(studentCode)?.role !== "student"
    );
    if (invalidStudent) {
      throw this.invalid(`Student ${invalidStudent} không hợp lệ`);
    }

    const existing = this.repository.findClassByCode(code);
    if (existing) {
      const existingStudentCodes = this.repository.listStudentCodes(
        existing.id,
      );
      const normalizedStudentCodes = [...studentCodes].sort();
      if (
        existing.name === name && existing.lecturerCode === lecturerCode &&
        existingStudentCodes.length === studentCodes.length &&
        existingStudentCodes.every((value, index) =>
          value === normalizedStudentCodes[index]
        )
      ) return { created: false, class: existing };
      throw this.conflict("Mã lớp đã tồn tại với dữ liệu khác");
    }

    return {
      created: true,
      class: this.repository.createClassWithEnrollments({
        code,
        name,
        lecturerCode,
        studentCodes,
      }),
    };
  }

  private invalid(message: string) {
    return new AdminDirectoryError(
      400,
      AdminDirectoryErrorCode.INVALID_INPUT,
      message,
    );
  }

  private conflict(message: string) {
    return new AdminDirectoryError(
      409,
      AdminDirectoryErrorCode.CONFLICT,
      message,
    );
  }
}
