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
  const [studentCodes, setStudentCodes] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<RosterImportResult | null>(null);
  const [isLoadingSections, setIsLoadingSections] = useState(true);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sectionDraft, setSectionDraft] = useState(createInitialSectionDraft);
  const [isCourseImportOpen, setIsCourseImportOpen] = useState(false);
  const [courseFileName, setCourseFileName] = useState('');
  const [courseRows, setCourseRows] = useState<ImportCourseItem[]>([]);
  const [courseImportResult, setCourseImportResult] = useState<CourseImportResult | null>(null);
  const [isImportingCourses, setIsImportingCourses] = useState(false);

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
      ['ma_sinh_vien'],
      ['2312686'],
      ['2312716'],
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
    setStudentCodes([]);
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
      });
      if (rows.length < 2) throw new Error('File cần có dòng tiêu đề và ít nhất một mã sinh viên.');
      if (rows.length > MAX_STUDENTS_PER_IMPORT + 1) {
        throw new Error(`Mỗi lần chỉ nhập tối đa ${MAX_STUDENTS_PER_IMPORT} sinh viên.`);
      }

      const headers = rows[0].map(normalizeHeader);
      const codeColumn = headers.findIndex((header) =>
        ['mssv', 'masinhvien', 'studentcode', 'studentid', 'usercode', 'code'].includes(header),
      );
      if (codeColumn < 0) {
        throw new Error('Không tìm thấy cột mã sinh viên. Dùng tiêu đề “Mã sinh viên” hoặc “student_code”.');
      }

      const codes = rows
        .slice(1)
        .map((row) => row[codeColumn])
        .filter((value): value is string | number =>
          typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)),
        )
        .map((value) => String(value).trim())
        .filter(Boolean);
      if (codes.length === 0) throw new Error('Không tìm thấy mã sinh viên trong file.');

      setStudentCodes(codes);
      setFileName(file.name);
      toast.success(`Đã đọc ${codes.length} mã sinh viên từ file.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không đọc được file danh sách.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const importRoster = async () => {
    if (!selectedSectionId || studentCodes.length === 0) return;
    setIsImporting(true);
    try {
      const result = await courseSectionsApi.importRoster(selectedSectionId, studentCodes);
      setImportResult(result);
      setStudentCodes([]);
      setFileName('');
      await loadRoster(selectedSectionId);
      await loadSections();
      toast.success(`Đã ghi danh ${result.importedCodes.length} sinh viên.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không nhập được danh sách sinh viên.');
    } finally {
      setIsImporting(false);
    }
  };

  const createSection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
                  <input required type="date" value={sectionDraft.startDate} onChange={(event) => setSectionDraft({ ...sectionDraft, startDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Ngày kết thúc *
                  <input required type="date" value={sectionDraft.endDate} onChange={(event) => setSectionDraft({ ...sectionDraft, endDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
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
                  <input type="number" min={1} max={1000} value={sectionDraft.capacity} onChange={(event) => setSectionDraft({ ...sectionDraft, capacity: event.target.value })} placeholder="Không giới hạn" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500" />
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

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <h2 className="font-semibold">Danh sách sinh viên</h2>
                    <p className="text-xs text-slate-500">Sinh viên đang được ghi danh trong lớp này.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {roster?.students.length ?? 0}
                  </span>
                </div>
                {isLoadingRoster ? (
                  <p className="p-6 text-center text-sm text-slate-500">Đang tải danh sách…</p>
                ) : !roster?.students.length ? (
                  <p className="p-6 text-center text-sm text-slate-500">Lớp chưa có sinh viên. Nhập danh sách ở khung bên cạnh.</p>
                ) : (
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Mã sinh viên</th>
                          <th className="px-4 py-3">Họ và tên</th>
                          <th className="px-4 py-3">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roster.students.map((student) => (
                          <tr key={student.id}>
                            <td className="px-4 py-3 font-mono text-xs">{student.code}</td>
                            <td className="px-4 py-3 font-medium">{student.fullname}</td>
                            <td className="px-4 py-3 text-slate-500">{student.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">Nạp danh sách sinh viên</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tải file Excel/CSV có cột mã sinh viên. Chỉ các tài khoản sinh viên đã có trong hệ thống mới được ghi danh.
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
                  <p className="mt-1 text-xs text-slate-600">Đã đọc {studentCodes.length} mã · xem trước tối đa 8 mã:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {studentCodes.slice(0, 8).map((code, index) => (
                      <span key={`${code}-${index}`} className="rounded bg-white px-2 py-1 font-mono text-xs text-slate-700">{code}</span>
                    ))}
                    {studentCodes.length > 8 && <span className="px-1 py-1 text-xs text-slate-500">+{studentCodes.length - 8} mã</span>}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => void importRoster()}
                disabled={!selectedSectionId || studentCodes.length === 0 || isImporting}
                className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isImporting ? 'Đang ghi danh…' : `Ghi danh ${studentCodes.length || ''} sinh viên`}
              </button>

              {importResult && (
                <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-emerald-800">Đã thêm: {importResult.importedCodes.length}</p>
                  <p className="text-slate-600">Đã có trong lớp: {importResult.alreadyEnrolledCodes.length}</p>
                  {importResult.unknownCodes.length > 0 && <p className="text-amber-800">Không tìm thấy mã: {importResult.unknownCodes.join(', ')}</p>}
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