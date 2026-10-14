import { httpClient } from './http';
import type { TeachingSectionOption } from './attendance-sessions.api';

export interface CourseSectionStudent {
  id: number;
  code: string;
  fullname: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  cohort: string | null;
  enrolledAt: string;
}

export interface CourseSectionRoster {
  section: {
    id: number;
    code: string;
    capacity: number | null;
    course: { code: string; name: string };
    term: { name: string; academicYear: string; semester: number };
  };
  students: CourseSectionStudent[];
}

export interface RosterImportResult {
  importedCodes: string[];
  alreadyEnrolledCodes: string[];
  unknownCodes: string[];
  duplicateCodes: string[];
  capacityExceededCodes: string[];
  createdAccountCodes: string[];
  usernameConflictCodes: string[];
  missingAccountDataCodes: string[];
  conflictingCodes: string[];
}

export interface ImportSectionStudent {
  studentCode: string;
  username?: string;
  password?: string;
  fullname?: string;
  middleName?: string;
  firstName?: string;
  dateOfBirth?: string;
  gender?: string;
  cohort?: string;
}

export interface CourseSectionCreationOptions {
  lecturers: Array<{ id: number; code: string; fullname: string }>;
  rooms: Array<{ id: number; code: string; name: string }>;
  courses: Array<{ id: number; code: string; name: string; credits: number | null }>;
}

export interface TimetableSlotInput {
  dayOfWeek?: number;
  scheduledDate?: string;
  startMinute: number;
  endMinute: number;
  roomId?: number;
}

export interface UpdateTimetableSlotInput {
  scheduledDate?: string | null;
  dayOfWeek?: number;
  startMinute?: number;
  endMinute?: number;
  roomId?: number | null;
}

export interface ImportCourseItem {
  code: string;
  name?: string;
  credits?: number;
}

export interface CourseImportResult {
  createdCodes: string[];
  existingCodes: string[];
  duplicateCodes: string[];
}

export interface CreateCourseSectionInput {
  courseCode: string;
  courseName: string;
  sectionCode: string;
  credits?: number;
  academicYear: string;
  semester: number;
  termName: string;
  startDate: string;
  endDate: string;
  lecturerId?: number;
  roomId?: number;
  capacity?: number;
}

export interface CreatedCourseSection {
  id: number;
  code: string;
  course: { code: string; name: string };
  term: { name: string; academicYear: string; semester: number };
}

export const courseSectionsApi = {
  list() {
    return httpClient.get<TeachingSectionOption[]>(
      '/v0/attendance-sessions/teaching-sections',
    );
  },

  getRoster(sectionId: number) {
    return httpClient.get<CourseSectionRoster>(
      `/v0/attendance-sessions/sections/${sectionId}/roster`,
    );
  },

  importRoster(sectionId: number, students: ImportSectionStudent[]) {
    return httpClient.post<RosterImportResult>(
      `/v0/attendance-sessions/sections/${sectionId}/roster/import`,
      { students },
    );
  },

  expandCapacity(sectionId: number) {
    return httpClient.patch<{ id: number; capacity: number }>(
      `/v0/attendance-sessions/sections/${sectionId}/capacity`,
    );
  },

  getCreationOptions() {
    return httpClient.get<CourseSectionCreationOptions>(
      '/v0/attendance-sessions/sections/creation-options',
    );
  },

  importCourses(courses: ImportCourseItem[]) {
    return httpClient.post<CourseImportResult>(
      '/v0/attendance-sessions/courses/import',
      { courses },
    );
  },

  create(input: CreateCourseSectionInput) {
    return httpClient.post<CreatedCourseSection>(
      '/v0/attendance-sessions/sections',
      input,
    );
  },

  createTimetableSlot(sectionId: number, input: TimetableSlotInput) {
    return httpClient.post(
      `/v0/attendance-sessions/sections/${sectionId}/timetable`,
      input,
    );
  },

  updateTimetableSlot(
    sectionId: number,
    slotId: number,
    input: UpdateTimetableSlotInput,
  ) {
    return httpClient.patch(
      `/v0/attendance-sessions/sections/${sectionId}/timetable/${slotId}`,
      input,
    );
  },

  deleteTimetableSlot(sectionId: number, slotId: number) {
    return httpClient.delete(
      `/v0/attendance-sessions/sections/${sectionId}/timetable/${slotId}`,
    );
  },
};