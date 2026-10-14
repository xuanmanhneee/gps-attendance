import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import DashboardSidebar from '../components/DashboardSidebar';
import { courseSectionsApi } from '../api/course-sections.api';
import type {
  CourseImportResult,
  CreateCourseSectionInput,
  CourseSectionCreationOptions,
  CourseSectionRoster,
  ImportCourseItem,
  ImportSectionStudent,
  RosterImportResult,
} from '../api/course-sections.api';
import type { TeachingSectionOption } from '../api/attendance-sessions.api';
import { useAuth } from '../hooks/useAuth';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_STUDENTS_PER_IMPORT = 2000;

const createInitialSectionDraft = () => {
  const year = new Date().getFullYear();
  return {
    courseCode: '',
    courseName: '',
    sectionCode: '',
    credits: '',
    academicYear: `${year}-${year + 1}`,
    semester: '1',
    termName: `Học kỳ 1 năm học ${year}-${year + 1}`,
    startDate: `${year}-09-01`,
    endDate: `${year + 1}-01-15`,
    lecturerId: '',
    roomId: '',
    capacity: '',
  };
};

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const cellText = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  return '';
};

const toIsoDate = (year: number, month: number, day: number): string | undefined => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const dateCellToIso = (value: unknown): string | undefined => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parts = XLSX.SSF.parse_date_code(value);
    if (parts) {
      return toIsoDate(parts.y, parts.m, parts.d);
    }
  }
  const text = cellText(value).split(/[T ]/, 1)[0];
  const isoDate = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoDate) {
    return toIsoDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  }
  const localDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (localDate) {
    return toIsoDate(Number(localDate[3]), Number(localDate[2]), Number(localDate[1]));
  }
  return undefined;
};

const formatDateOfBirth = (value?: string | null): string => {
  if (!value) return '';
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
  const localDate = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (localDate) {
    return `${localDate[1].padStart(2, '0')}/${localDate[2].padStart(2, '0')}/${localDate[3]}`;
  }
  return value;
};

const CourseSectionsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const courseFileInputRef = useRef<HTMLInputElement>(null);
  const [sections, setSections] = useState<TeachingSectionOption[]>([]);
  const [creationOptions, setCreationOptions] = useState<CourseSectionCreationOptions>({
    lecturers: [],
    rooms: [],
    courses: [],
  });
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [roster, setRoster] = useState<CourseSectionRoster | null>(null);
  const [studentRows, setStudentRows] = useState<ImportSectionStudent[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<RosterImportResult | null>(null);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExpandingCapacity, setIsExpandingCapacity] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sectionDraft, setSectionDraft] = useState(createInitialSectionDraft);
  const [isCourseImportOpen, setIsCourseImportOpen] = useState(false);
  const [courseFileName, setCourseFileName] = useState('');
  const [courseRows, setCourseRows] = useState<ImportCourseItem[]>([]);
  const [courseImportResult, setCourseImportResult] = useState<CourseImportResult | null>(null);
  const [isImportingCourses, setIsImportingCourses] = useState(false);
  const [slotDay, setSlotDay] = useState('1');
  const [slotScheduleMode, setSlotScheduleMode] = useState<'weekly' | 'specific'>('weekly');
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('08:00');
  const [slotEnd, setSlotEnd] = useState('09:00');
  const [slotRoomId, setSlotRoomId] = useState('');
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [savingSlotId, setSavingSlotId] = useState<number | null>(null);

  const selectedSection = useMemo(
    () => sections.find((section) => section.id === selectedSectionId) ?? null,
    [sections, selectedSectionId],
  );

  const loadSections = async () => {
    try {
      const data = await courseSectionsApi.list();
      setSections(data);
      setSelectedSectionId((current) => current ?? data[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không tải được danh sách học phần.');
    } finally {
      setIsLoadingSections(false);
    }
  };

  const loadRoster = async (sectionId: number) => {
    setIsLoadingRoster(true);
    try {
      setRoster(await courseSectionsApi.getRoster(sectionId));
    } catch (error) {
      setRoster(null);
      toast.error(error instanceof Error ? error.message : 'Không tải được danh sách sinh viên.');
    } finally {
      setIsLoadingRoster(false);
    }
  };

  const loadCreationOptions = async () => {
    try {
      setCreationOptions(await courseSectionsApi.getCreationOptions());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không tải được danh sách giảng viên/phòng.');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      void loadSections();
      void loadCreationOptions();
    }
    else setIsLoadingSections(false);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && selectedSectionId !== null) void loadRoster(selectedSectionId);
  }, [isAdmin, selectedSectionId]);

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['STT', 'Mã số SV', 'Họ lót', 'Tên', 'Ngày sinh', 'Giới tính', 'Lớp'],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sinh vien');
    XLSX.writeFile(workbook, 'mau-danh-sach-sinh-vien.xlsx');
  };

  const downloadCourseTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['ma_hoc_phan', 'ten_hoc_phan', 'tin_chi'],
      ['CNTT101', 'Nhập môn Công nghệ thông tin', 3],
      ['MATH101', 'Toán cao cấp 1', 3],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Hoc phan');
    XLSX.writeFile(workbook, 'mau-danh-sach-ma-hoc-phan.xlsx');
  };

  const readCourseFile = async (file?: File) => {
    setCourseRows([]);
    setCourseFileName('');
    setCourseImportResult(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File vượt quá 5 MB.');
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', sheetRows: 1002 });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('File không có sheet dữ liệu.');
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
        header: 1,
        defval: '',
        blankrows: false,
      });
      if (rows.length < 2) throw new Error('File cần có tiêu đề và ít nhất một mã học phần.');
      if (rows.length > 1001) throw new Error('Mỗi file chỉ được nhập tối đa 1.000 học phần.');

      const headers = rows[0].map(normalizeHeader);
      const codeColumn = headers.findIndex((header) =>
        ['mahocphan', 'coursecode', 'courseid', 'code'].includes(header),
      );
      if (codeColumn < 0) throw new Error('Thiếu cột mã học phần (ma_hoc_phan hoặc course_code).');
      const nameColumn = headers.findIndex((header) =>
        ['tenhocphan', 'coursename', 'name'].includes(header),
      );
      const creditsColumn = headers.findIndex((header) =>
        ['tinchi', 'credits'].includes(header),
      );

      const items = rows.slice(1).flatMap((row) => {
        const code = String(row[codeColumn] ?? '').trim();
        if (!code) return [];
        const rawName = nameColumn >= 0 ? String(row[nameColumn] ?? '').trim() : '';
        const rawCredits = creditsColumn >= 0 ? Number(row[creditsColumn]) : NaN;
        return [{
          code,
          name: rawName || code,
          ...(Number.isInteger(rawCredits) && rawCredits > 0 ? { credits: rawCredits } : {}),
        }];
      });
      if (items.length === 0) throw new Error('Không tìm thấy mã học phần hợp lệ trong file.');

      setCourseRows(items);
      setCourseFileName(file.name);
      toast.success(`Đã đọc ${items.length} học phần từ file.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không đọc được file học phần.');
    } finally {
      if (courseFileInputRef.current) courseFileInputRef.current.value = '';
    }
  };

  const importCourses = async () => {
    if (courseRows.length === 0) return;
    setIsImportingCourses(true);
    try {
      const result = await courseSectionsApi.importCourses(courseRows);
      setCourseImportResult(result);
      setCourseRows([]);
      setCourseFileName('');
      await loadCreationOptions();
      toast.success(`Đã nạp ${result.createdCodes.length} mã học phần mới.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không nạp được danh sách học phần.');
    } finally {
      setIsImportingCourses(false);
    }
  };

  const readFile = async (file?: File) => {
    setStudentRows([]);
    setFileName('');
    setImportResult(null);
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File vượt quá 5 MB.');
      return;
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), {
        type: 'array',
        sheetRows: MAX_STUDENTS_PER_IMPORT + 2,
      });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error('File không có sheet dữ liệu.');
      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: true,
      });
      if (rows.length < 2) throw new Error('File cần có dòng tiêu đề và ít nhất một mã sinh viên.');
      if (rows.length > MAX_STUDENTS_PER_IMPORT + 1) {
        throw new Error(`Mỗi lần chỉ nhập tối đa ${MAX_STUDENTS_PER_IMPORT} sinh viên.`);
      }

      const headers = rows[0].map(normalizeHeader);
      const codeColumn = headers.findIndex((header) =>
        ['mssv', 'masosv', 'masinhvien', 'studentcode', 'studentid', 'usercode', 'code'].includes(header),
      );
      if (codeColumn < 0) {
        throw new Error('Không tìm thấy cột mã sinh viên. Dùng tiêu đề “Mã sinh viên” hoặc “student_code”.');
      }

      const findColumn = (...names: string[]) =>
        headers.findIndex((header) => names.includes(header));
      const middleNameColumn = findColumn('holot', 'tenlot', 'middlename');
      const firstNameColumn = findColumn('ten', 'firstname', 'firstandlastname');
      const fullnameColumn = findColumn('hoten', 'fullname', 'studentname');
      const dobColumn = headers.findIndex((header) =>
        ['ngaysinh', 'ngaythangnamsinh', 'dateofbirth', 'birthdate', 'dob']
          .some((name) => header === name || header.startsWith(name)),
      );
      const genderColumn = findColumn('gioitinh', 'gender');
      const cohortColumn = findColumn('lop', 'cohort', 'class', 'program');
      if (dobColumn < 0) {
        throw new Error('Không tìm thấy cột Ngày sinh. Hãy đặt tiêu đề cột là “Ngày sinh” và nhập theo dạng dd/mm/yyyy.');
      }

      const students = rows.slice(1).flatMap((row, index): ImportSectionStudent[] => {
        const studentCode = cellText(row[codeColumn]);
        if (!studentCode) return [];
        const middleName = middleNameColumn >= 0 ? cellText(row[middleNameColumn]) : '';
        const firstName = firstNameColumn >= 0 ? cellText(row[firstNameColumn]) : '';
        const fullname = fullnameColumn >= 0 ? cellText(row[fullnameColumn]) : '';
        const dateOfBirth = dateCellToIso(row[dobColumn]);
        if (!dateOfBirth) {
          throw new Error(
            `Ngày sinh của sinh viên ${studentCode} ở dòng ${index + 2} bị trống hoặc không hợp lệ. Dùng dạng dd/mm/yyyy, ví dụ 31/07/2004.`,
          );
        }
        const gender = genderColumn >= 0 ? cellText(row[genderColumn]) : '';
        const cohort = cohortColumn >= 0 ? cellText(row[cohortColumn]) : '';
        return [{
          studentCode,
          username: studentCode,
          ...(fullname ? { fullname } : {}),
          ...(middleName ? { middleName } : {}),
          ...(firstName ? { firstName } : {}),
          ...(dateOfBirth ? { dateOfBirth } : {}),
          ...(gender ? { gender } : {}),
          ...(cohort ? { cohort } : {}),
        }];
      });
      if (students.length === 0) throw new Error('Không tìm thấy mã sinh viên trong file.');

      setStudentRows(students);
      setFileName(file.name);
      toast.success(`Đã đọc ${students.length} hồ sơ sinh viên từ file.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không đọc được file danh sách.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const importRoster = async () => {
    if (!selectedSectionId || studentRows.length === 0) return;
    setIsImporting(true);
    try {
      const result = await courseSectionsApi.importRoster(selectedSectionId, studentRows);
      setImportResult(result);
      if (result.capacityExceededCodes.length === 0) {
        setStudentRows([]);
        setFileName('');
      }
      await loadRoster(selectedSectionId);
      await loadSections();
      if (result.capacityExceededCodes.length > 0) {
        toast.success(
          `Đã ghi danh ${result.importedCodes.length} sinh viên. Nâng sức chứa rồi ghi danh lại để tiếp tục.`,
        );
      } else {
        toast.success(`Đã ghi danh ${result.importedCodes.length} sinh viên.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không nhập được danh sách sinh viên.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetSlotDraft = () => {
    setSlotDay('1');
    setSlotScheduleMode('weekly');
    setSlotDate('');
    setSlotStart('08:00');
    setSlotEnd('09:00');
    setSlotRoomId('');
    setEditingSlotId(null);
  };

  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatMinutes = (minutes: number) =>
    `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;

  const editTimetableSlot = (slot: TeachingSectionOption['timetable'][number]) => {
    setEditingSlotId(slot.id);
    setSlotDay(String(slot.dayOfWeek));
    setSlotScheduleMode(slot.scheduledDate ? 'specific' : 'weekly');
    setSlotDate(slot.scheduledDate ?? '');
    setSlotStart(formatMinutes(slot.startMinute));
    setSlotEnd(formatMinutes(slot.endMinute));
    setSlotRoomId(slot.room?.id ? String(slot.room.id) : '');
  };

  const expandCapacity = async () => {
    if (!selectedSectionId) return;
    setIsExpandingCapacity(true);
    try {
      await courseSectionsApi.expandCapacity(selectedSectionId);
      await loadRoster(selectedSectionId);
      toast.success('Đã nâng sức chứa lớp lên 300 sinh viên. Bạn có thể ghi danh lại danh sách.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể nâng sức chứa lớp.');
    } finally {
      setIsExpandingCapacity(false);
    }
  };

  const saveTimetableSlot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSectionId) return;

    const startMinute = toMinutes(slotStart);
    const endMinute = toMinutes(slotEnd);
    if (endMinute <= startMinute) {
      toast.error('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }
    if (slotScheduleMode === 'specific' && !slotDate) {
      toast.error('Chọn ngày cụ thể của buổi học.');
      return;
    }

    setIsSavingSlot(true);
    try {
      const roomId = slotRoomId ? Number(slotRoomId) : undefined;
      const scheduledDate = slotScheduleMode === 'specific' ? slotDate : null;
      const dayOfWeek = slotScheduleMode === 'specific'
        ? new Date(`${slotDate}T00:00:00Z`).getUTCDay() || 7
        : Number(slotDay);
      if (editingSlotId !== null) {
        await courseSectionsApi.updateTimetableSlot(selectedSectionId, editingSlotId, {
          dayOfWeek,
          scheduledDate,
          startMinute,
          endMinute,
          roomId: roomId ?? null,
        });
      } else {
        await courseSectionsApi.createTimetableSlot(selectedSectionId, {
          ...(slotScheduleMode === 'weekly' ? { dayOfWeek } : { scheduledDate: slotDate }),
          startMinute,
          endMinute,
          ...(roomId !== undefined ? { roomId } : {}),
        });
      }
      await loadSections();
      resetSlotDraft();
      toast.success(editingSlotId === null ? 'Đã thêm ca học.' : 'Đã cập nhật ca học.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không lưu được ca học.');
    } finally {
      setIsSavingSlot(false);
    }
  };

  const deleteTimetableSlot = async (slotId: number) => {
    if (!selectedSectionId) return;
    if (!window.confirm('Bạn có chắc muốn xóa ca học này?')) return;

    setSavingSlotId(slotId);
    try {
      await courseSectionsApi.deleteTimetableSlot(selectedSectionId, slotId);
      await loadSections();
      if (editingSlotId === slotId) resetSlotDraft();
      toast.success('Đã xóa ca học.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không xóa được ca học.');
    } finally {
      setSavingSlotId(null);
    }
  };

  const createSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sectionDraft.endDate < sectionDraft.startDate) {
      toast.error('Ngày kết thúc học kỳ phải từ ngày bắt đầu trở đi.');
      return;
    }
    const input: CreateCourseSectionInput = {
      courseCode: sectionDraft.courseCode.trim(),
      courseName: sectionDraft.courseName.trim(),
      sectionCode: sectionDraft.sectionCode.trim(),
      academicYear: sectionDraft.academicYear.trim(),
      semester: Number(sectionDraft.semester),
      termName: sectionDraft.termName.trim(),
      startDate: sectionDraft.startDate,
      endDate: sectionDraft.endDate,
      ...(sectionDraft.credits ? { credits: Number(sectionDraft.credits) } : {}),
      ...(sectionDraft.lecturerId ? { lecturerId: Number(sectionDraft.lecturerId) } : {}),
      ...(sectionDraft.roomId ? { roomId: Number(sectionDraft.roomId) } : {}),
      ...(sectionDraft.capacity ? { capacity: Number(sectionDraft.capacity) } : {}),
    };

    setIsCreating(true);
    try {
      const created = await courseSectionsApi.create(input);
      await loadSections();
      setSelectedSectionId(created.id);
      setSectionDraft(createInitialSectionDraft());
      setIsCreateFormOpen(false);
      toast.success(`Đã tạo lớp ${created.course.code} · ${created.code}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không tạo được lớp học phần.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <DashboardSidebar user={user} onLogout={handleLogout} />
      <main className="min-w-0 flex-1 overflow-y-auto p-6 md:p-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Danh sách học phần</h1>
            <p className="mt-1 text-sm text-slate-600">
              Xem roster và nhập sinh viên đã có tài khoản vào lớp học phần.
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setIsCourseImportOpen(true)}
                  className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                  ↑ Nạp mã học phần
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateFormOpen(true)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  + Tạo lớp học phần
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => void loadSections()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Tải lại
            </button>
          </div>
        </header>

        {isCourseImportOpen && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
            <section className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Nạp danh sách mã học phần</h2>
                  <p className="mt-1 text-sm text-slate-600">Chọn file Excel hoặc CSV để thêm nhiều môn học cùng lúc.</p>
                </div>
                <button type="button" onClick={() => setIsCourseImportOpen(false)} aria-label="Đóng" className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100">✕</button>
              </div>

              <button type="button" onClick={downloadCourseTemplate} className="mt-4 text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900">
                Tải file mẫu danh sách học phần
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Cột bắt buộc: mã học phần. Tên học phần và tín chỉ là tùy chọn; nếu thiếu tên, mã sẽ được dùng làm tên tạm.
              </p>
              <label htmlFor="course-file" className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50">
                <span className="text-sm font-medium text-slate-800">Chọn file danh sách mã học phần</span>
                <span className="mt-1 text-xs text-slate-500">.xlsx, .xls hoặc .csv · tối đa 5 MB · tối đa 1.000 dòng</span>
                <input ref={courseFileInputRef} id="course-file" type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={(event) => void readCourseFile(event.target.files?.[0])} />
              </label>

              {courseFileName && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="truncate text-sm font-medium">{courseFileName}</p>
                  <p className="mt-1 text-xs text-slate-600">Xem trước {Math.min(courseRows.length, 8)} / {courseRows.length} mã:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {courseRows.slice(0, 8).map((course, index) => <span key={`${course.code}-${index}`} className="rounded bg-white px-2 py-1 font-mono text-xs text-slate-700">{course.code}</span>)}
                    {courseRows.length > 8 && <span className="px-1 py-1 text-xs text-slate-500">+{courseRows.length - 8} mã</span>}
                  </div>
                </div>
              )}

              {courseImportResult && (
                <div className="mt-4 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-emerald-800">Đã thêm: {courseImportResult.createdCodes.length}</p>
                  <p className="text-slate-600">Đã tồn tại: {courseImportResult.existingCodes.length}</p>
                  {courseImportResult.duplicateCodes.length > 0 && <p className="text-amber-800">Mã trùng trong file: {courseImportResult.duplicateCodes.join(', ')}</p>}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCourseImportOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Đóng</button>
                <button type="button" onClick={() => void importCourses()} disabled={courseRows.length === 0 || isImportingCourses} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {isImportingCourses ? 'Đang nạp…' : `Nạp ${courseRows.length || ''} học phần`}
                </button>
              </div>
            </section>
          </div>
        )}

        {isCreateFormOpen && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
            <form
              onSubmit={createSection}
              className="my-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl md:p-7"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Tạo lớp học phần</h2>
                  <p className="mt-1 text-sm text-slate-600">Nhập thông tin môn học, lớp và học kỳ để đăng ký lớp mới.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateFormOpen(false)}
                  className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="Đóng biểu mẫu"
                >
                  ✕
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Mã môn học *
                  <input required list="course-code-options" maxLength={30} value={sectionDraft.courseCode} onChange={(event) => {
                    const courseCode = event.target.value;
                    const existingCourse = creationOptions.courses.find((course) => course.code === courseCode.trim());
                    setSectionDraft({
                      ...sectionDraft,
                      courseCode,
                      ...(existingCourse ? {
                        courseName: existingCourse.name,
                        credits: existingCourse.credits?.toString() ?? sectionDraft.credits,
                      } : {}),
                    });
                  }} placeholder="VD: CNTT101" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                  <datalist id="course-code-options">
                    {creationOptions.courses.map((course) => <option key={course.id} value={course.code}>{course.name}</option>)}
                  </datalist>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Tên môn học *
                  <input required maxLength={180} value={sectionDraft.courseName} onChange={(event) => setSectionDraft({ ...sectionDraft, courseName: event.target.value })} placeholder="VD: Nhập môn Công nghệ thông tin" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Mã lớp học phần *
                  <input required maxLength={50} value={sectionDraft.sectionCode} onChange={(event) => setSectionDraft({ ...sectionDraft, sectionCode: event.target.value })} placeholder="VD: CNTT101-01" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Số tín chỉ
                  <input type="number" min={1} max={30} value={sectionDraft.credits} onChange={(event) => setSectionDraft({ ...sectionDraft, credits: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Năm học *
                  <input required maxLength={20} value={sectionDraft.academicYear} onChange={(event) => setSectionDraft({ ...sectionDraft, academicYear: event.target.value })} placeholder="2026-2027" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Học kỳ *
                  <select required value={sectionDraft.semester} onChange={(event) => {
                    const semester = event.target.value;
                    setSectionDraft({
                      ...sectionDraft,
                      semester,
                      termName: `Học kỳ ${semester} năm học ${sectionDraft.academicYear}`,
                    });
                  }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500">
                    <option value="1">Học kỳ 1</option>
                    <option value="2">Học kỳ 2</option>
                    <option value="3">Học kỳ hè</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Tên học kỳ *
                  <input required maxLength={100} value={sectionDraft.termName} onChange={(event) => setSectionDraft({ ...sectionDraft, termName: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Ngày bắt đầu *
                  <input required type="date" max={sectionDraft.endDate} value={sectionDraft.startDate} onChange={(event) => setSectionDraft({ ...sectionDraft, startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Ngày kết thúc *
                  <input required type="date" min={sectionDraft.startDate} value={sectionDraft.endDate} onChange={(event) => setSectionDraft({ ...sectionDraft, endDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Giảng viên
                  <select value={sectionDraft.lecturerId} onChange={(event) => setSectionDraft({ ...sectionDraft, lecturerId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500">
                    <option value="">Chưa phân công</option>
                    {creationOptions.lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.fullname} ({lecturer.code})</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Phòng học
                  <select value={sectionDraft.roomId} onChange={(event) => setSectionDraft({ ...sectionDraft, roomId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500">
                    <option value="">Chưa chọn phòng</option>
                    {creationOptions.rooms.map((room) => <option key={room.id} value={room.id}>{room.code} · {room.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Sức chứa tối đa
                  <input type="number" min={1} max={300} value={sectionDraft.capacity} onChange={(event) => setSectionDraft({ ...sectionDraft, capacity: event.target.value })} placeholder="Tối đa 300" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
              </div>

              <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
                Môn học được dùng lại theo mã môn; học kỳ được dùng lại theo năm học và số học kỳ. Nếu chưa tồn tại, hệ thống sẽ tạo mới.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={isCreating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {isCreating ? 'Đang tạo…' : 'Tạo lớp học phần'}
                </button>
              </div>
            </form>
          </div>
        )}

        {!isAdmin ? (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Chức năng quản lý danh sách học phần chỉ dành cho quản trị viên.
          </p>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <section className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label htmlFor="course-section" className="mb-2 block text-sm font-medium text-slate-700">
                  Chọn lớp học phần
                </label>
                <select
                  id="course-section"
                  value={selectedSectionId ?? ''}
                  onChange={(event) => setSelectedSectionId(Number(event.target.value) || null)}
                  disabled={isLoadingSections || sections.length === 0}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {sections.length === 0 && <option value="">Không có học phần</option>}
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.course.code} · {section.course.name} — {section.code} ({section.term.name})
                    </option>
                  ))}
                </select>
                {selectedSection && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Năm học {selectedSection.term.academicYear}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">Học kỳ {selectedSection.term.semester}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{selectedSection.activeEnrollmentCount} sinh viên</span>
                  </div>
                )}
              </div>

              {selectedSection && (
                <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <h2 className="font-semibold">Thời khóa biểu</h2>
                    <p className="text-xs text-slate-500">
                      Tạo lịch lặp hằng tuần hoặc một buổi theo ngày cụ thể; giờ và phòng được cấu hình riêng cho từng ca.
                    </p>
                  </div>
                  <form onSubmit={(event) => void saveTimetableSlot(event)} className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-medium text-slate-600">
                      Kiểu lịch học
                      <select value={slotScheduleMode} onChange={(event) => setSlotScheduleMode(event.target.value as 'weekly' | 'specific')} className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="weekly">Lặp hằng tuần theo Thứ</option>
                        <option value="specific">Một buổi theo ngày cụ thể</option>
                      </select>
                    </label>
                    {slotScheduleMode === 'weekly' ? (
                      <label className="text-xs font-medium text-slate-600">
                        Thứ
                        <select value={slotDay} onChange={(event) => setSlotDay(event.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm text-slate-900">
                          <option value="1">Thứ 2</option>
                          <option value="2">Thứ 3</option>
                          <option value="3">Thứ 4</option>
                          <option value="4">Thứ 5</option>
                          <option value="5">Thứ 6</option>
                          <option value="6">Thứ 7</option>
                          <option value="7">Chủ nhật</option>
                        </select>
                      </label>
                    ) : (
                      <label className="text-xs font-medium text-slate-600">
                        Ngày học cụ thể
                        <input required type="date" min={selectedSection.term.startDate.slice(0, 10)} max={selectedSection.term.endDate.slice(0, 10)} value={slotDate} onChange={(event) => setSlotDate(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900" />
                      </label>
                    )}
                    <label className="text-xs font-medium text-slate-600">
                      Phòng học
                      <select value={slotRoomId} onChange={(event) => setSlotRoomId(event.target.value)} className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm text-slate-900">
                        <option value="">Dùng phòng mặc định của lớp</option>
                        {creationOptions.rooms.map((room) => (
                          <option key={room.id} value={room.id}>{room.code} — {room.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Bắt đầu
                      <input required type="time" value={slotStart} onChange={(event) => setSlotStart(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Kết thúc
                      <input required type="time" value={slotEnd} onChange={(event) => setSlotEnd(event.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm text-slate-900" />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="submit" disabled={isSavingSlot} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {isSavingSlot ? 'Đang lưu…' : editingSlotId === null ? 'Thêm ca học' : 'Lưu thay đổi'}
                      </button>
                      {editingSlotId !== null && (
                        <button type="button" onClick={resetSlotDraft} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                          Hủy sửa
                        </button>
                      )}
                    </div>
                  </form>
                  {selectedSection.timetable.length === 0 ? (
                    <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      Chưa có ca học. Thêm thời khóa biểu để lớp xuất hiện trong luồng tạo phiên điểm danh.
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {selectedSection.timetable.map((slot) => (
                        <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                          <div>
                            <span className="font-medium">
                              {slot.scheduledDate
                                ? `Ngày ${new Date(`${slot.scheduledDate}T00:00:00Z`).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
                                : slot.dayOfWeek === 7 ? 'Chủ nhật (hằng tuần)' : `Thứ ${slot.dayOfWeek + 1} (hằng tuần)`}
                            </span>
                            <span className="ml-2 text-slate-600">{formatMinutes(slot.startMinute)}–{formatMinutes(slot.endMinute)}</span>
                            <span className="ml-2 text-xs text-slate-500">
                              {slot.room ? `${slot.room.code} · ${slot.room.name}` : 'Phòng mặc định của lớp'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => editTimetableSlot(slot)} className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">Sửa</button>
                            <button type="button" disabled={savingSlotId === slot.id} onClick={() => void deleteTimetableSlot(slot.id)} className="rounded border border-rose-200 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                              {savingSlotId === slot.id ? 'Đang xóa…' : 'Xóa'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h2 className="font-semibold">Danh sách sinh viên</h2>
                    <p className="text-xs text-slate-500">
                      {roster
                        ? `${roster.students.length}/${roster.section.capacity ?? 300} sinh viên · tối đa 300`
                        : 'Sinh viên đang được ghi danh trong lớp này.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {roster?.section.capacity !== undefined &&
                      roster.section.capacity !== null &&
                      roster.section.capacity < 300 && (
                        <button
                          type="button"
                          onClick={() => void expandCapacity()}
                          disabled={isExpandingCapacity || isLoadingRoster}
                          className="rounded-lg border border-blue-300 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                        >
                          {isExpandingCapacity ? 'Đang cập nhật…' : 'Nâng lên 300'}
                        </button>
                      )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {roster?.students.length ?? 0}
                    </span>
                  </div>
                </div>
                {isLoadingRoster ? (
                  <p className="p-6 text-center text-sm text-slate-500">Đang tải danh sách…</p>
                ) : !roster?.students.length ? (
                  <p className="p-6 text-center text-sm text-slate-500">Lớp chưa có sinh viên. Nhập danh sách ở khung bên cạnh.</p>
                ) : (
                  <>
                    <div className="divide-y divide-slate-100 md:hidden">
                      {roster.students.map((student) => (
                        <article key={student.id} className="space-y-1.5 px-4 py-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <span className="font-mono text-xs text-slate-500">{student.code}</span>
                            <span className="font-medium text-slate-900">{formatDateOfBirth(student.dateOfBirth) || '—'}</span>
                          </div>
                          <p className="font-medium">{student.fullname}</p>
                          <p className="text-xs text-slate-500">
                            {[student.gender, student.cohort, student.email].filter(Boolean).join(' · ') || 'Chưa có thông tin bổ sung'}
                          </p>
                        </article>
                      ))}
                    </div>
                    <div className="hidden max-h-[560px] overflow-auto md:block">
                      <table className="min-w-[820px] w-full text-left text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                          <tr>
                            <th className="whitespace-nowrap px-4 py-3">Mã sinh viên</th>
                            <th className="px-4 py-3">Họ và tên</th>
                            <th className="whitespace-nowrap px-4 py-3">Ngày sinh</th>
                            <th className="whitespace-nowrap px-4 py-3">Giới tính</th>
                            <th className="px-4 py-3">Lớp</th>
                            <th className="px-4 py-3">Email</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {roster.students.map((student) => (
                            <tr key={student.id}>
                              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{student.code}</td>
                              <td className="px-4 py-3 font-medium">{student.fullname}</td>
                              <td className="whitespace-nowrap px-4 py-3">{formatDateOfBirth(student.dateOfBirth) || '—'}</td>
                              <td className="whitespace-nowrap px-4 py-3">{student.gender || '—'}</td>
                              <td className="px-4 py-3">{student.cohort || '—'}</td>
                              <td className="px-4 py-3 text-slate-500">{student.email || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Nạp danh sách sinh viên</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tải Excel/CSV có mã sinh viên, họ lót, tên, ngày sinh, giới tính và lớp. Tài khoản mới dùng MSSV làm tên đăng nhập nếu file không có User; mật khẩu tài khoản mới và tài khoản đã có trong danh sách được đồng bộ thành MSSV.
              </p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-4 text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-900"
              >
                Tải file mẫu Excel
              </button>
              <label
                htmlFor="roster-file"
                className="mt-4 flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-blue-400 hover:bg-blue-50"
              >
                <span className="text-sm font-medium text-slate-800">Chọn file danh sách</span>
                <span className="mt-1 text-xs text-slate-500">.xlsx, .xls hoặc .csv · tối đa 5 MB</span>
                <input
                  ref={fileInputRef}
                  id="roster-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={(event) => void readFile(event.target.files?.[0])}
                />
              </label>

              {fileName && (
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="truncate text-sm font-medium">{fileName}</p>
                  <p className="mt-1 text-xs text-slate-600">Đã đọc {studentRows.length} hồ sơ · xem trước tối đa 8 hồ sơ:</p>
                  <div className="mt-2 space-y-1.5">
                    {studentRows.slice(0, 8).map((student, index) => (
                      <div key={`${student.studentCode}-${index}`} className="rounded bg-white px-2 py-1.5 text-xs text-slate-700">
                        <p>
                          <span className="font-mono">{student.studentCode}</span>
                          {' · '}
                          {student.fullname || [student.middleName, student.firstName].filter(Boolean).join(' ') || 'Chưa có họ tên'}
                        </p>
                        <p className="mt-0.5 text-slate-500">
                          {formatDateOfBirth(student.dateOfBirth) || 'Chưa có ngày sinh'}
                          {' · '}
                          {student.gender || 'Chưa có giới tính'}
                          {' · '}
                          {student.cohort || 'Chưa có lớp'}
                          {' · '}
                          {student.studentCode}@dlu.edu.vn
                        </p>
                      </div>
                    ))}
                    {studentRows.length > 8 && <span className="px-1 py-1 text-xs text-slate-500">+{studentRows.length - 8} hồ sơ</span>}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void importRoster()}
                disabled={!selectedSectionId || studentRows.length === 0 || isImporting}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? 'Đang ghi danh…' : `Ghi danh ${studentRows.length || ''} sinh viên`}
              </button>

              {importResult && (
                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-emerald-800">Đã thêm: {importResult.importedCodes.length}</p>
                  {importResult.createdAccountCodes.length > 0 && <p className="text-emerald-800">Đã tạo tài khoản mới: {importResult.createdAccountCodes.join(', ')}</p>}
                  <p className="text-slate-600">Đã có trong lớp: {importResult.alreadyEnrolledCodes.length}</p>
                  {importResult.unknownCodes.length > 0 && <p className="text-amber-800">Không tìm thấy mã: {importResult.unknownCodes.join(', ')}</p>}
                  {importResult.missingAccountDataCodes.length > 0 && <p className="text-amber-800">Thiếu họ tên để tạo tài khoản: {importResult.missingAccountDataCodes.join(', ')}</p>}
                  {importResult.usernameConflictCodes.length > 0 && <p className="text-rose-800">User đã được tài khoản khác sử dụng hoặc trùng trong file: {importResult.usernameConflictCodes.join(', ')}</p>}
                  {importResult.conflictingCodes.length > 0 && <p className="text-rose-800">Mã đang thuộc tài khoản không phải sinh viên: {importResult.conflictingCodes.join(', ')}</p>}
                  {importResult.duplicateCodes.length > 0 && <p className="text-amber-800">Mã trùng trong file: {importResult.duplicateCodes.join(', ')}</p>}
                  {importResult.capacityExceededCodes.length > 0 && <p className="text-rose-800">Vượt sức chứa: {importResult.capacityExceededCodes.join(', ')}</p>}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default CourseSectionsPage;