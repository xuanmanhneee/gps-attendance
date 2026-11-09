import type {
  CreateLmsSessionInput,
  ILmsRepository,
  LmsBuilding,
  LmsClass,
  LmsSession,
  LmsUser,
} from "../database/lms.repository.ts";
export class CourseService {
  constructor(private readonly repository: ILmsRepository) {}
  list(): LmsClass[] {
    return this.repository.listClasses();
  }
  find(id: number): LmsClass | null {
    return this.repository.findClass(id);
  }
  students(id: number): string[] {
    return this.repository.listStudentCodes(id);
  }
  studentDetails(id: number): LmsUser[] {
    return this.repository.listStudents(id);
  }
  createSession(input: CreateLmsSessionInput): LmsSession {
    return this.repository.createSession(input);
  }
  buildings(): LmsBuilding[] {
    return this.repository.listBuildings();
  }
  building(id: number): LmsBuilding | null {
    return this.repository.findBuilding(id);
  }
}
