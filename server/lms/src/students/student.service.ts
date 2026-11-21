import type {
  ILmsRepository,
  LmsUnit,
  LmsUser,
} from "../database/lms.repository.ts";
export class StudentService {
  constructor(private readonly repository: ILmsRepository) {}
  units(): LmsUnit[] {
    return this.repository.listUnits();
  }
  users(): LmsUser[] {
    return this.repository.listUsers().filter((user) => user.role !== "admin");
  }

  participants(): LmsUser[] {
    return this.repository.listUsers().filter((user) =>
      user.role === "student"
    );
  }

  resolveParticipantCodes(
    unitCodes: string[],
    studentCodes: string[],
  ): string[] {
    const units = new Map(this.units().map((unit) => [unit.code, unit]));
    const selectedUnits = new Set(unitCodes);
    if (unitCodes.some((code) => !units.has(code))) {
      throw new Error("Có unit không tồn tại trong LMS");
    }

    const participants = new Map(
      this.participants().map((participant) => [participant.code, participant]),
    );
    if (studentCodes.some((code) => !participants.has(code))) {
      throw new Error("Có mã sinh viên không tồn tại trong LMS");
    }

    const belongsToSelectedUnit = (unitCode: string) => {
      let current: string | null = unitCode;
      while (current) {
        if (selectedUnits.has(current)) return true;
        current = units.get(current)?.parentCode ?? null;
      }
      return false;
    };
    return [...participants.values()]
      .filter((participant) =>
        studentCodes.includes(participant.code) ||
        belongsToSelectedUnit(participant.unitCode)
      )
      .map((participant) => participant.code);
  }
}
