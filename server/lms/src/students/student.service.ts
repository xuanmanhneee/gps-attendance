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
    return this.repository.listUsers();
  }
}
