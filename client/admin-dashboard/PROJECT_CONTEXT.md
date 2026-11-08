# PROJECT_CONTEXT — GPS Attendance

> File ngữ cảnh để đính kèm khi bắt đầu chat mới về project. Viết dựa trên code
> thực tế, không chỉ dựa vào docs. Chỗ nào docs và code mâu thuẫn thì **code là đúng**.
> Cập nhật file này sau mỗi thay đổi lớn.
>
> **Snapshot: `f60d8c2`** (nhánh `feature/dashboard`, đã merge `origin/main` @ `3596e61`, 02/11/2026).
> Lần cập nhật sau: `git diff f60d8c2 HEAD --output=changes.patch` rồi gửi file đó.

## 1. Tổng quan

Hệ thống điểm danh GPS cho trường học (Đại học Đà Lạt). Organizer tạo phiên (toạ độ
tâm, bán kính, giờ mở/đóng, tiêu chí người tham gia) → participant mở app mobile,
gửi GPS + device + integrity → server chấm điểm → ghi nhận.

pnpm workspace monorepo:

| Package | Đường dẫn | Công nghệ |
|---|---|---|
| Backend | `server/attendance` | NestJS 11, Prisma 7 (PostgreSQL, adapter-pg, moduleFormat cjs), Redis (ioredis), Swagger tại `/api-docs` |
| Admin | `client/admin-dashboard` | React 19, Vite, Tailwind 4, react-router 7, react-hook-form, Leaflet, i18n tự viết (vi/en) |
| Mobile | `client/mobile-client` | Expo SDK 54, expo-router, React Native 0.81 |
| Shared | `packages/shared` | TS thuần: type, error code, `FetchHttpClient`. Server dùng bản build `dist/`, admin/mobile đọc thẳng `.ts` |

Role (đúng 3): `admin`, `organizer`, `participant`. (Docs cũ còn ghi `student`/`lecturer`, đã lỗi thời.)

Seed account (username = password): `admin01`, `organizer01-03`, `participant01-10`.

## 2. Backend — `server/attendance/src`

### Quy ước kiến trúc
- Mỗi domain: `module / controller / service / model / repository (interface) / repository.token / infra/{prisma,in-memory,redis}`.
- Service inject repository qua `Symbol` token, không phụ thuộc implementation.
- Path alias `#account`, `#user`, `#units`, `#tag`, `#common`, `#prisma`, `#redis`, `#job-scheduler`, `#attendance-*`, `#auth`, `#geo`.
- Transaction: `IUnitOfWork.runInTransaction(ctx)`; repo nhận `ctx?` rồi chọn `tx` hoặc `prisma` (`PrismaTransactionContext`).
- Response: `ResponseInterceptor` bọc `{success:true,data}`; `AllExceptionsFilter` trả `{success:false, code, message}`. Lỗi nghiệp vụ throw `HttpException` với `{code, message}` lấy từ `packages/shared/.../codes`.
- `ValidationPipe({whitelist:true, transform:true})` toàn cục.
- `userId` trong JWT là `User.id` (không phải `Account.id`).

### Module và route chính

| Module | Route | Ghi chú |
|---|---|---|
| auth | `POST /v0/admin/auth/login`, `/refresh` (admin + organizer); `POST /v0/user/auth/login`, `/refresh` (participant) | Access JWT 15 phút. Refresh token ngẫu nhiên, lưu hash SHA-256 trong `refresh_sessions`, sống 30 ngày, **rotate mỗi lần refresh**. Login qua `LocalAuthGuard` |
| account | `POST /v0/accounts` (admin), `GET /v0/accounts/:id` | Tạo user+account trong 1 transaction, bcrypt cost 10 |
| users | `GET /v0/users`, `/me`, `/:id`, `POST /test-filter` | `UserFilterService.resolveUserIds` resolve tiêu chí unit/tag/code |
| units | `GET/POST/PATCH /units`, `GET /units/tree` | Cây `UnitForest`; `level = parent.level+1`; có chống cycle. **Không có prefix `/v0`** |
| tags | `/tags` (JWT) | Tag thuộc về owner; gán/gỡ user qua bảng `user_tags`. **Không có prefix `/v0`** |
| attendance-sessions | `/v0/attendance-sessions` (create, update, cancel, list, `created-by-me`, `created-by?userId`, `me`, `:id`, `:id/criteria`) | Route tĩnh khai báo trước `:id`. `GET :id` (admin/organizer) nay truyền `viewer` vào `getDetail`: **organizer chỉ xem phiên do mình tạo, ngược lại 403 `ATTENDANCE_SESSION_FORBIDDEN`**, admin xem mọi phiên |
| attendance-check-in | `POST /v0/attendance/check-in` (JWT) | Xem mục 3 |
| attendance-record | (service nội bộ) | Buffer Redis + repository Postgres |
| job-scheduler | (nội bộ) | Scheduler tự viết trên Redis ZSET |

### Trạng thái phiên
DB chỉ lưu `cancelled` thật sự. `pending/open/closed` được **tính theo giờ** trong
`AttendanceSessionsService.withComputedStatus` (kiểm tra `cancelled` trước). `PrismaAttendanceSessionRepository.toDomain` map mọi thứ khác về `pending` rồi service ghi đè.

### Vòng đời phiên (Redis + job)
1. `create`: lưu session vào Postgres; criteria JSON vào Redis `attendance:session:{id}:criteria`.
2. Job `attendance:init-roster` chạy lúc `openAt - 5 phút` (hoặc chạy ngay nếu đã quá hạn): resolve criteria → `insertRecordIfAbsent` (HSETNX) record `absent` cho từng user vào Redis hash `attendance:buffer:{sessionId}` → set `...:roster-initialized` → xoá criteria.
3. Trước khi roster khởi tạo: sửa criteria được; `getDetail` trả `plannedParticipants` tính từ criteria.
4. Job `attendance:flush` chạy lúc `closeAt`: `beginSessionFlush` (set cờ flushing + lấy snapshot nguyên tử) → `bulkUpsert` xuống Postgres trong 1 transaction → `completeSessionFlush` (xoá buffer). Nếu lỗi Postgres, buffer còn nguyên để retry.
5. Đọc record: ưu tiên buffer, fallback Postgres (`getBySessionAndUser`, `findBySessionId`); `findByUser` gộp cả hai.
6. `cancel`: update status, huỷ 2 job, xoá criteria; nếu đang open thì `clearSessionBuffer`.
7. `update`: open → chỉ sửa `closeAt`; ended → 409; criteria bị khoá sau khi roster đến hạn khởi tạo; reschedule job khi đổi giờ.

### Job scheduler (`redis-job-scheduler.service.ts`)
Tick 10s (`@Interval`). Lua script: CLAIM (lease 120s, gia hạn mỗi 30s), ACK, RETRY (backoff 60s × min(attempts,5), không bỏ job), SCHEDULE, CANCEL. Job id cố định kiểu `flush:{sessionId}` nên reschedule = cancel + schedule. Handler đăng ký trong `onModuleInit` của service sở hữu domain.

## 3. Luồng check-in (lõi nghiệp vụ)

`AttendanceCheckInService.checkIn(dto, userId)`:

1. Chốt `checkedInAt = new Date()` trước mọi I/O.
2. **Guard**: session tồn tại → status `open` → user có record trong session (`USER_NOT_IN_SESSION`) → chưa `present` (`ALREADY_CHECKED_IN`, 409).
3. **Attempt limit** (`AttemptCheck` + Redis Lua ZSET): tối đa 3 lần / 2 phút / (session,user). Vượt → `REJECTED [TOO_MANY_ATTEMPTS]`. Lần thử được tính **trước** validate nên lần sai vị trí cũng tốn lượt.
4. **Validation** (`AttendanceValidationService`, đồng bộ):
   - `isMockLocation` → `REJECTED [MOCK_LOCATION]` ngay.
   - Tuổi mẫu GPS: `checkedInAt - location.timestamp` phải trong `[-30s, +2 phút]`, ngược lại `REJECTED [INVALID_LOCATION_TIMESTAMP]`.
   - Điểm = integrity×35 + mock×25 + location×40. Location hợp lệ khi `distance(Haversine) + accuracy <= radius` (hệ số 1/0).
   - `>= 80` VALID; `>= 60` REVIEW (+`LOW_CONFIDENCE_SCORE`); còn lại REJECTED (kèm `OUT_OF_RANGE` nếu ngoài vùng).
   - Integrity hiện là **mock**: token null → 0.5, có token → 0.7.
5. **Commit** `tryMarkPresentAndClaimDevice` (1 Lua script duy nhất): kiểm tra cờ flushing → record tồn tại → chưa present → device chưa dùng trong session → HSET record `present` + SET key `attendance:device:{session}:{deviceId}` với TTL. Kết quả map sang: `session-flushing`, `record-missing`, `already-present`, `device-used` (→ `REJECTED [DUPLICATE_DEVICE]`), `present`.
6. Trả `VALID` hoặc `REVIEW` (ghi `present` cho cả REVIEW).

Lưu ý: `DeviceCheck`, `RedisAttendanceCheckInDeviceUsageRepository`, `InMemoryAttendanceCheckInStore` hiện không nằm trong luồng chính (device claim đã gộp vào buffer script).

## 4. Database (Prisma schema)

`Account(1-1)User`, `User → Unit` (Restrict), `Unit` tự tham chiếu (parent/children), `Tag(ownerId)` ⟷ `UserTag` ⟷ `User`, `AttendanceSession(createdBy → User)`, `AttendanceRecord` unique `(sessionId,userId)`, `RefreshSession(accountId, tokenHash unique)`.
Enum: `AccountStatus`, `UserRole`, `SessionStatus`, `AttendanceStatus(absent|present|late|excused)`.
`AttendanceRecord` có cột `deviceId`, `distanceMeters` **chưa được ghi** (bulkUpsert không lưu).
Migration tới `20261024010000_add_refresh_sessions`.

## 5. Admin dashboard

- Provider: `BrowserRouter > Locale > Theme > Auth`. Tailwind 4 với token trong `@theme`; dark qua `data-theme`.
- Auth: `tokenService` — có `rememberMe` thì token + refresh vào `localStorage`, không thì access token vào `sessionStorage`.
- `api/http.ts`: GET có cache trong bộ nhớ (TTL 10s cho `/v0/attendance-sessions*`, 60s còn lại), clear cache sau mọi mutation; tự refresh 1 lần khi 401 (single-flight), thất bại thì phát `auth:expired`.
- Route/role: `admin` → `/dashboard`, `/users`, `/units`, `/tags`, `/attendance-records`; `organizer` → `/sessions`, `/sessions/new`, `/attendance-records`, `/statistics`; cả hai xem được `/sessions/:id`. `NAVIGATION_ITEMS` quyết định menu theo role. (`/sessions` và `/statistics` vẫn chỉ có menu cho organizer dù route cho cả admin.)
- Đã làm thật: Login, Overview (admin/organizer), danh sách phiên (nhóm theo ngày, lọc trạng thái, huỷ), tạo phiên, chi tiết phiên, Units (cây + sửa), Tags (CRUD + gán user), **Tra cứu bản ghi điểm danh**.
- **Wizard tạo phiên** (`SessionCreatePage`, 2 bước): bước 1 gồm tên, `SessionLocationFields` (nhập tay lat/lng/radius bằng `<input type=number>` + nút "Lấy vị trí hiện tại" + nút mở bản đồ `SessionLocationPickerModal`), thời gian, cột tóm tắt bên phải (`useWatch`); bước 2 `ParticipantCriteriaEditor` (include/exclude cho unit/tag/code). Footer nút nằm trong `PanelFooter` ngoài form (submit qua `form="create-session-form"`). **Không còn tự xin GPS khi mở trang** và đã bỏ `console.log`. Map chỉ mở khi lat/lng/radius hợp lệ (`canOpenMap`). `SessionFormLocationCard` giờ không còn được dùng (file vẫn còn).
- **`/attendance-records`** (`AttendanceRecordsPage`): chọn phiên (admin: `scope:'all'`, organizer: `'created-by-me'`, sắp theo `openAt` giảm dần), tải detail bằng hook `useAttendanceSessionDetail` (race guard theo `requestIdRef`, chỉ nhận detail đúng `sessionId`), tổng hợp theo trạng thái, tìm theo tên/mã + lọc trạng thái (`utils/attendance-records/attendance-record-list.ts`, có test), bảng `AttendanceRecordsTable`. Nếu `plannedParticipants !== null` (roster chưa khởi tạo) hiện `UnavailableState`. Chưa có phân trang/xuất file/duyệt.
- `parseParticipantCodes` (form) nay tách theo `[,;\s]+` (dấu phẩy, chấm phẩy, khoảng trắng, xuống dòng) thay vì chỉ `,`/xuống dòng.
- Test dashboard: 16 file / 115 case (`node:test`).
- Placeholder: `/users`, `/statistics`.
- Pattern lặp lại: hook giữ state + `toError`, `parse/isXxx` validate shape response, `request-scope`/`load-tracker` chống stale response, error map theo `ApiError.code` → translation key, test bằng `node:test` cho logic thuần (`*.test.ts`).
- i18n: `vi.ts` là nguồn key; `en.ts` bắt buộc đủ key. Một số UI vẫn hard-code tiếng Việt (Sidebar settings, LoginPage, ParticipantCriteriaEditor).

## 6. Mobile client

- expo-router: `index` (redirect theo auth) → `login` | `(tabs)/home`, `(tabs)/profile`, `dev` (trang ẩn).
- `AuthProvider` giữ `user/token`; token lưu SecureStore (web → localStorage) qua `services/storage.ts`.
- Check-in: `services/attendance.ts` gom song song location (expo-location, High accuracy) + device (deviceId = AndroidId/iOS vendorId/UUID) + integrity (stub null) → `POST /v0/attendance/check-in`.
- `home.tsx`: trạng thái phiên cho participant (`cancelled` xét trước), nút chỉ bật khi `absent`; `useNow` kích hoạt refetch đúng mốc `openAt/closeAt` và khi app về foreground (server là nguồn chân lý về giờ).
- Dev mode: công tắc ở Profile → trang `/dev` hiển thị payload, ép `isMockLocation=true`, đổi deviceId.

## 7. Vấn đề / nợ kỹ thuật đã thấy trong code

### Bảo mật & quyền (ưu tiên cao)
1. `UnitController` **không có guard nào**: ai cũng tạo/sửa được unit. Body dùng interface (`CreateUnitInput`) chứ không phải DTO class nên `ValidationPipe` không validate; `CreateUnitDto` có sẵn nhưng chưa dùng.
2. `UserController`: `GET /v0/users`, `GET /v0/users/:id`, `POST /v0/users/test-filter` không guard (lộ danh sách user + mã); `AccountController.findById` cũng không guard.
3. `TagController`: `GET /tags/:id` và `GET /tags/users/:userId/tags` không kiểm tra owner. Ngoài ra route `users/:userId/tags` khai báo sau `:tagId/users`... cần kiểm tra không bị match nhầm.
4. `GET /v0/attendance-sessions` cho mọi user đăng nhập (kể cả participant) xem toàn bộ phiên. *(Riêng `GET /:id` đã siết: organizer chỉ xem phiên của mình.)*
5. `app.enableCors()` mở hoàn toàn; admin lưu refresh token ở `localStorage`.

### Logic
6. **REVIEW gần như không thể xảy ra**: với integrity 0.5/0.7 và 2 check còn lại hệ số 0/1, điểm chỉ có thể là 42.5/49.5 (ngoài vùng) hoặc 82.5/89.5 (trong vùng). Cần tính lại trọng số khi có integrity thật.
7. `AttendanceStatus` `late` và `excused` chưa có đường nào được set (không có API sửa tay).
8. `UserFilterService`: include theo unit chỉ lấy **leaf**; user gắn trực tiếp vào unit không phải leaf sẽ không được chọn. Exclude unit áp dụng 2 lần (trong `resolveUnitFilter` và sau cùng).
9. `initializeForSession` insert tuần tự từng user (N round-trip Redis); roster lớn nên pipeline/batch.
10. `bulkUpsert` không lưu `deviceId`/`distanceMeters` dù schema có cột.
11. Redis default port ở `RedisModule` là `6370` (khác `6379` ở `redis-client.provider.ts` và chuẩn Redis) — nghi gõ nhầm; `redis-client.provider.ts` không được dùng.

### Rác / trùng lặp
12. `AttendanceRecordModule` đăng ký `ATTEMPT_REPOSITORY`, `DEVICE_USAGE_REPOSITORY`, `InMemoryAttendanceRecordStore` không dùng; `TAG_REPOSITORY` khai báo 2 nơi (`tag.service.ts`, `tag.repository.token.ts`); `AttendanceValidationReason` khai báo 2 nơi trong shared; `UnitModule` import `InMemoryUnitRepository` không dùng.
13. `Integrity/MockLocation Check` thiếu `@Injectable()` (đang chạy được vì không inject gì).

### Client
14. Admin: `paths.attendanceSessionEdit` + nút sửa trong `SessionCard` trỏ tới `/sessions/:id/edit` nhưng **không có route/page** → rơi vào NotFound. API `update/getCriteria` đã sẵn. *(Chưa sửa.)*
15. Admin: `ParticipantCriteriaEditor` nhận `onPreview` nhưng page chưa truyền (endpoint `test-filter` chỉ trả `userIds`, chưa có count/sample). *(`console.log` debug đã được gỡ.)*
16. Admin: `/sessions` và `/statistics` cho phép role `admin` ở route nhưng menu chỉ có organizer (admin không có link). *(`/attendance-records` đã sửa: menu và route đều admin + organizer.)*
17. Mobile: `authApi.refreshToken()` gọi không body và chỉ lưu `accessToken`, trong khi server cần `{refreshToken}` và trả cặp token → **chưa có auto-refresh**, chưa lưu refresh token. `logout()` gọi `/v0/user/auth/logout` không tồn tại ở server (đang tạm không gọi).
18. `docs/architecture.md` còn ghi `student`, `LocalAuthGuard (chỉ student)`, logout/refresh theo JWT — lỗi thời.

## 8. Cách chạy

```bash
pnpm install && pnpm build:shared
docker compose up -d                  # Postgres + Redis
cd server/attendance && cp .env.example .env
pnpm --filter @gps-attendance/attendance prisma migrate dev
pnpm --filter @gps-attendance/attendance prisma db seed
pnpm dev:server    # :3000
pnpm dev:admin     # :5173
pnpm dev:mobile    # Expo Go, cần thiết bị thật cho GPS
```
Sửa `packages/shared` khi server đang chạy: mở thêm terminal `pnpm dev:shared`.

## 9. Quy ước khi làm tính năng mới
- Đọc `AGENTS.md` và `docs/conventions/*` trước.
- Backend: đủ bộ `module/controller/service/model/repository/token/infra`; luôn inject qua token; controller route tĩnh trước `:id`; error code mới thêm vào `packages/shared/src/api/response/codes` (prefix theo domain).
- Thêm field/API → sửa `packages/shared` trước rồi `pnpm build:shared`.
- Admin: key i18n mới thêm vào cả `vi.ts` lẫn `en.ts`; logic thuần tách ra `utils/` kèm `*.test.ts`; không render `Error.message` ra UI, map theo `ApiError.code`.
- Comment nghiệp vụ tiếng Việt, tên biến/hàm tiếng Anh; file kebab-case.

## 10. Lộ trình `plans/` (mới, từ main)

Thư mục `plans/` chứa kế hoạch hoàn thiện, ảnh chụp hiện trạng 28/10/2026 (README + 9 file `phase-00` … `phase-08`). Đây là kế hoạch, chưa phải cam kết. Mỗi task có mã `Pxx-yy`, mức ưu tiên P0/P1/P2, ước lượng ngày công, tiêu chí nghiệm thu.

| Phase | Trọng tâm |
|---|---|
| 0 | Khảo sát baseline, chốt hợp đồng: trạng thái `REVIEW`, ma trận quyền, API versioning, phạm vi pilot |
| 1 | Bảo mật và phân quyền: guard cho route đang hở, DTO/validation, CORS/Swagger/secret, rate limit, logout và thu hồi phiên |
| 2 | Toàn vẹn dữ liệu: criteria/job bền vững (không chỉ Redis), reconciler job, roster batch, flush và đối soát, mô hình hoá `REVIEW`, audit khi sửa tay |
| 3 | Mobile: lưu và rotate cặp token, logout, đồng bộ trạng thái check-in, UX GPS, lịch sử, khoá công cụ dev khỏi bản phát hành |
| 4 | Organizer: hoàn thiện wizard, preview roster, sửa/huỷ, bảng kết quả gần thực, duyệt review, xuất file |
| 5 | Admin: quản lý user/account, unit/tag theo quyền, API thống kê thật, chính sách lưu giữ |
| 6 | Chống gian lận: threat model, nonce, Play Integrity, App Attest, hiệu chỉnh điểm rủi ro |
| 7 | CI, integration test, đo tải, giám sát/cảnh báo, runbook |
| 8 | Staging, backup/restore, đóng gói API/dashboard/mobile, pilot, go/no-go |

Kế hoạch này tự ghi nhận đúng các vấn đề ở mục 7 (route thiếu guard, mobile refresh sai body, `REVIEW` không đạt được và bị ghi `present`, criteria/job chỉ ở Redis). Nên bám theo mã task khi chọn việc tiếp theo.

Ghi chú từ plan, bổ sung cho mục 3: `AttendanceCheckInService` gọi `markPresent` cho cả `VALID` lẫn `REVIEW`, nên `REVIEW` hiện cũng thành `present`.

## 11. Tài liệu có sẵn trong repo (đã đọc từ docs-all.md, 02/11/2026)

| File | Nội dung | Độ tin cậy |
|---|---|---|
| `docs/architecture.md` | Kiến trúc tổng, nghiêng về mobile; luồng check-in, bảng API mobile | Một phần cũ: còn ghi login `chỉ student`, path `/v0/user/auth/*`, nhắc `lecturer/student`. Đối chiếu với code trước khi tin |
| `docs/conventions/api-response.md` | `ApiResponse<T>` là discriminated union; error code `<Domain>ErrorCode`, giá trị `DOMAIN_REASON`, file `<domain>-error.codes.ts`, `as const` | Tin được |
| `docs/conventions/auth-guards.md` | `JwtAuthGuard` không cần import `AuthModule`; `userId` trong JWT là `User.id`, khác `Account.id` | Tin được |
| `docs/conventions/module-structure.md` | Cấu trúc module NestJS; service inject repository qua interface + token; route tĩnh (`me`) khai báo trước `:id`; module phải khai báo đủ `controllers` | Tin được |
| `docs/conventions/naming.md` | File/folder kebab-case; comment nghiệp vụ tiếng Việt, tên biến/hàm tiếng Anh; nhánh `feature/<mo-ta>` | Tin được |
| `docs/conventions/roles.md` | Chỉ 3 role: `admin`, `organizer`, `participant`; admin tạo qua seed; không dùng union với role cũ `lecturer/student`; app ngoài (LMS) tự ánh xạ nhãn | Tin được |
| `client/admin-dashboard/ARCHITECTURE.md` | Kiến trúc admin: tầng, luồng, phân quyền 3 lớp, mẫu thiết kế (logic thuần, race guard, error code -> i18n), danh sách cải thiện P1-P3 | Viết 14/10, đã cập nhật một phần cho attendance-records |
| `client/admin-dashboard/PLAN.md` | Quyết định wizard `/sessions/new` (nhập mã participant tay vì DTO bắt buộc criteria; bước lưu bằng `useState`; `NumberInput` buffer text) | Một phần đã bị rewrite wizard thay thế |
| `client/mobile-client/STRUCTURE.md`, `README.md` | Cấu trúc mobile | Chưa đọc kỹ |
| `.github/` | Bộ rule/skill ECC cho Copilot (generic): bất biến, file nhỏ (<800 dòng, hàm <50 dòng), TDD, coverage 80%, conventional commits (`feat/fix/refactor/docs/test/chore/perf/ci`) | Chung chung, không riêng dự án |

### Nợ kỹ thuật phía admin (theo ARCHITECTURE.md mục 8-9)
- **P1.2 [ĐÃ XONG — P04-07.1]** Menu và route lệch quyền: `/sessions` đã thêm role `admin` vào `NAVIGATION_ITEMS` để admin mở `AdminSessionsView` từ sidebar. Hai hàm dead code `isPathAllowedForRole` và `isKnownPath` đã xoá; comment giải thích đúng vai trò của `RoleGuard`.
- **P1.3 [ĐÃ XONG — P04-07.2, P04-07.3]** `LoginPage.tsx` lệch design system: đã đưa về token màu hệ thống (xanh đồng bộ dashboard), i18n đầy đủ qua `t()`, xoá nút Google chết và bỏ nhận diện DLU.
- **P1.4 [ĐÃ XONG — P04-07.4, P04-07.5, P04-07.5b]** Đã có `ErrorBoundary` bọc `<Outlet />` trong `DashboardLayout` (reset theo `pathname`), lazy load cả `SessionCreatePage` và `SessionEditPage` để tách Leaflet ra chunk riêng (~163 kB).
- **P1.1** `SessionCreatePage` từng 748 dòng; đã rewrite với `SessionLocationFields`, cần kiểm tra lại kích thước hiện tại.
- **P3** Dọn dẹp: Đã xoá `createSession`/`isCreating`/`createInFlightRef` trong `useAttendanceSessions`, xoá `unitsApi.getById`, sửa comment "modal" (P04-07.6). Giữ `sessions.form.close` vì đang dùng (aria-label nút đóng bản đồ trong `SessionLocationPickerModal.tsx:208`). Đã thêm script `"typecheck": "tsc -b"` và `"lint": "eslint ."` (P04-07.7; ghi nhận 6 lỗi/cảnh báo lint ở file của đồng đội). Chưa có `STRUCTURE.md` cho admin. `AGENTS.md` trỏ tới `docs/conventions/naming.md`.

### Mâu thuẫn cần nhớ khi làm việc
- Thư mục error code: code thật nằm ở `packages/shared/src/api/response/codes/` (khớp `docs/architecture.md`). `docs/conventions/api-response.md` ghi `error_codes/` là cũ.
- Mobile docs vẫn ghi 401 chưa auto refresh và `logout` chưa gọi; khớp với nợ kỹ thuật ở mục 7.