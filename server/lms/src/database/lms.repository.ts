export interface LmsUnit {
  code: string;
  name: string;
  parentCode: string | null;
}

export interface LmsUser {
  code: string;
  fullname: string;
  role: "organizer" | "participant";
  unitCode: string;
}
export interface LmsAccount {
  username: string;
  passwordHash: string;
  userCode: string;
}

export interface LmsClass {
  id: number;
  code: string;
  name: string;
  lecturerCode: string;
}
export interface LmsBuilding {
  id: number;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface CreateLmsSessionInput {
  classId: number;
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  openAt: string;
  closeAt: string;
  buildingId: number;
}

export interface LmsSession extends CreateLmsSessionInput {
  id: number;
  externalId: string;
  createdAt: string;
}

export interface ILmsRepository {
  seed(): void;
  listClasses(): LmsClass[];
  findClass(id: number): LmsClass | null;
  listStudentCodes(classId: number): string[];
  listStudents(classId: number): LmsUser[];
  createSession(input: CreateLmsSessionInput): LmsSession;
  listUnits(): LmsUnit[];
  listUsers(): LmsUser[];
  listBuildings(): LmsBuilding[];
  findBuilding(id: number): LmsBuilding | null;
  findAccount(username: string): LmsAccount | null;
  findUser(code: string): LmsUser | null;
}
