# GPS Attendance

Monorepo cho hệ thống điểm danh theo GPS, gồm API NestJS, ứng dụng mobile Expo, admin dashboard và package TypeScript dùng chung. README này mô tả mã nguồn hiện có và các lần kiểm thử đã thực hiện; không xem kết quả local là cam kết SLA production.

## 1. Mục tiêu và vai trò

Hệ thống hỗ trợ mở phiên điểm danh theo lớp học phần, nhận check-in từ mobile, đánh giá vị trí/thiết bị, lưu kết quả và cung cấp công cụ quản lý/duyệt trên web.

| Vai trò trong hệ thống | Client chính | Nhiệm vụ |
|---|---|---|
| `participant` | Mobile Expo | Xem phiên được phân công, gửi check-in, xem lịch sử và hồ sơ |
| `organizer` | Admin dashboard | Quản lý phiên được phân quyền, theo dõi kết quả và duyệt trường hợp cần xem xét |
| `admin` | Admin dashboard | Quản trị người dùng, địa điểm, học vụ, roster, thiết bị và phiên |

`Role` hiện dùng ba giá trị trung tính `admin`, `organizer`, `participant`; không dùng `student` hoặc `lecturer` làm giá trị role trong schema hiện tại. Tên “sinh viên” và “giảng viên” vẫn xuất hiện trong giao diện/nghiệp vụ học vụ.

## 2. Cấu trúc và công nghệ

```text
client/
  admin-dashboard/     React + Vite dashboard
  mobile-client/       Expo Router / React Native
packages/
  shared/              API contracts, DTOs, error codes, HTTP client
server/
  attendance/          NestJS API, Prisma, PostgreSQL, Redis
```

| Thành phần | Công nghệ / trách nhiệm |
|---|---|
| Workspace | pnpm workspaces; Node.js `>=20`; pnpm `11.x` |
| Shared | TypeScript; `ApiResponse<T>`, DTO, error code, `FetchHttpClient` |
| API | NestJS 11, Passport/JWT, class-validator, Swagger, Winston |
| Lưu trữ | PostgreSQL, Prisma 7; Redis cho buffer điểm danh, rate/device/attempt và scheduler |
| Mobile | Expo SDK 54, React Native 0.81, Expo Router |
| Dashboard | React 19, Vite 8, React Router 7, Tailwind CSS 4 |
| Hiệu năng | Docker Compose stack riêng, Nginx, PostgreSQL, Redis, k6 |

Lệnh gốc được khai báo trong [package.json](./package.json):

```powershell
pnpm install
pnpm build:shared
pnpm build:attendance
pnpm build:admin
pnpm dev:attendance
pnpm dev:admin
pnpm dev:mobile
```

`pnpm dev:attendance` chạy script kiểm tra/khởi động ngrok trước khi chạy API. Nếu chỉ phát triển trong máy/mạng LAN, có thể chạy API trực tiếp:

```powershell
pnpm build:shared
pnpm --filter @gps-attendance/attendance dev
```

Root `pnpm build` build shared, backend và dashboard; không bao gồm build native mobile.

## 3. Thành phần hệ thống đang có

### 3.1 Shared package

- Chuẩn response API dạng `ApiResponse<T>` và mã lỗi dùng chung.
- Types/DTO cho xác thực, người dùng, phiên, check-in và attendance.
- `FetchHttpClient` gửi Bearer token nếu có, timeout 30 giây, chuyển lỗi API thành `ApiError`.

### 3.2 Backend API

- Đăng nhập user/admin, JWT access/refresh, logout/revoke theo service.
- Quản lý tài khoản/hồ sơ, units/tags và quyền theo role.
- Quản lý session, lớp học phần, lịch học, roster và attendance records.
- Location Registry: campus, building/facility và room; admin hiệu chuẩn/vận hành cấu hình địa điểm.
- Check-in gồm xác thực session/roster, attempt/device, GPS, mock-location, integrity, audit và quyết định `VALID`, `REVIEW` hoặc `REJECTED`.
- Redis write-behind attendance buffer; scheduler flush dữ liệu theo batch về PostgreSQL.
- Health endpoint, request ID, JSON logging, exception filter, Swagger và health/metrics.

API chạy với prefix `/v0`. Một số lệnh hữu ích:

| Method / path | Mục đích |
|---|---|
| `GET /v0/health` | Health API, database và runtime |
| `POST /v0/user/auth/login` | Đăng nhập participant |
| `POST /v0/admin/auth/login` | Đăng nhập organizer/admin |
| `GET/PATCH /v0/users/me` | Đọc/cập nhật hồ sơ hiện tại |
| `/v0/attendance-sessions` | Tạo, liệt kê, xem chi tiết, đóng/hủy phiên; course/roster/timetable |
| `POST /v0/attendance/check-in` | Gửi check-in |
| `/v0/attendance/records/...` | Lịch sử, summary và event điểm danh |
| `/v0/location-registry/...` | Đọc/quản lý cấu hình địa điểm |

Quyền cụ thể được áp dụng tại controller/service; xem Swagger tại `/api-docs` khi API đang chạy.

### 3.3 Mobile

Các tab hiện tại là Điểm danh, Lịch học, Lịch sử và Thông tin. Route điểm danh chính là `src/app/(tabs)/index.tsx`; các màn hình chi tiết phiên, vị trí, hồ sơ, thông báo và dev GPS nằm ở các route riêng. Không còn tab Home trùng danh sách phiên/luồng check-in với tab Điểm danh.

Mobile thu thập GPS, accuracy/mock flag, device ID và integrity payload; gọi API check-in và hiển thị kết quả. Native token storage dùng SecureStore; web dùng localStorage. GPS thực tế và quyền vị trí cần được kiểm tra trên thiết bị phù hợp.

### 3.4 Admin dashboard

Dashboard hiện có các trang tổng quan/phiên, chi tiết attendance và attempt, Location Registry, lớp học phần/roster/thời khóa biểu, thiết bị và các trang quản trị. Có thể nhập dữ liệu học vụ qua CSV/XLSX ở các luồng được hỗ trợ. UI không thay thế kiểm tra quyền ở backend.

### 3.5 Database và xử lý tải

- PostgreSQL/Prisma lưu accounts, refresh sessions, users, units, tags, sessions, records, audit, course/roster/timetable, registry location, registered devices và integrity evidence.
- Attendance record có tính duy nhất theo session/user; check-in đồng thời được bảo vệ ở luồng buffer/device.
- Redis Lua scripts thực hiện các thao tác buffer nguyên tử; job scheduler quản lý công việc flush/retry.
- Flush khóa/chụp buffer, upsert batch vào PostgreSQL rồi hoàn tất flush. Check-in và các thao tác nghiệp vụ khác vẫn có truy vấn/cập nhật database; không phải mọi thao tác đều chạy riêng trong Redis.

## 4. Luồng nghiệp vụ check-in

1. Người có JWT gửi `sessionId`, tọa độ/accuracy/timestamp/mock flag, device và integrity payload.
2. API kiểm tra session đang mở và người dùng đã được phân vào roster.
3. API ghi nhận attempt, kiểm tra giới hạn lần thử và thiết bị, đồng thời tạo audit/integrity evidence.
4. Validation đánh giá GPS theo geofence, mock signal, accuracy, integrity và vị trí giảng viên nếu có dữ liệu. Trường hợp không rõ có thể được chuyển `REVIEW`, không đồng nghĩa là đã được chấp nhận tự động.
5. Kết quả được ghi vào attendance buffer; API trả trạng thái/kết quả cho client.
6. Scheduler flush buffer sang PostgreSQL theo vòng đời phiên; API lịch sử hợp nhất dữ liệu đã persist và dữ liệu còn trong buffer.

Integrity hiện được kiểm tra theo logic ứng dụng/payload mà code nhận được. Không nên mô tả như xác minh online đầy đủ với provider Apple/Google nếu chưa triển khai xác minh provider tương ứng.

## 5. Thiết lập local

### 5.1 Cấu hình môi trường

Tạo `server/attendance/.env` dựa trên `.env.example`, sau đó điền `DATABASE_URL`, `JWT_SECRET` và `REFRESH_TOKEN_SECRET` bằng giá trị local riêng, không dùng placeholder. Không commit file `.env` hoặc secret thật.

Các biến quan trọng:

| Biến | Ý nghĩa |
|---|---|
| `PORT` | Port API; mặc định `3000` |
| `DATABASE_URL` | PostgreSQL URL |
| `REDIS_HOST`, `REDIS_PORT` | Redis connection |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | Secret riêng cho token |
| `CORS_ORIGIN` | Danh sách origin, phân cách dấu phẩy |
| `VITE_API_BASE_URL` | API URL cho dashboard |
| `EXPO_PUBLIC_API_URL` | API URL cho mobile |

Backend bật CORS cho các localhost origins dev mặc định và cộng thêm origin từ `CORS_ORIGIN`. Điện thoại thật phải dùng địa chỉ backend truy cập được từ mạng thiết bị, không dùng `127.0.0.1` của điện thoại. Khởi động lại Vite/Expo sau khi đổi biến `VITE_`/`EXPO_PUBLIC_`.

### 5.2 Chạy database và API

Từ thư mục gốc:

```powershell
docker compose up -d postgres redis
pnpm install
pnpm build:shared
pnpm --filter @gps-attendance/attendance exec prisma migrate deploy
pnpm --filter @gps-attendance/attendance dev
```

Nếu cần dữ liệu demo, kiểm tra database URL đang trỏ đúng database local rồi chạy `pnpm seed:attendance`. Seed chỉ dành cho development; không dùng tài khoản/mật khẩu seed ngoài local.

Mặc định compose root dùng PostgreSQL `5432`, Redis `6379`, API `3000` và dashboard container `8080`. Dashboard dev chạy bằng `pnpm dev:admin` (Vite); mobile chạy bằng `pnpm dev:mobile` (Expo). Docker compose root không chạy mobile.

## 6. Lịch sử Git và nội dung từ `main`

Thông tin dưới đây dựa trên Git refs/commit hiện có; “đã merge” chỉ áp dụng cho merge commit lịch sử, không suy ra từ một lần fetch.

### 6.1 Merge `origin/main` lịch sử đã có trong branch

Commit `1fb7f69` là merge commit có parent thứ hai `9c08eb3` trên lịch sử `origin/main`. Các commit từ `main` nằm trong nhánh đó bổ sung/đưa vào các phần sau:

| Thành phần được đưa vào từ chuỗi commit `main` | Nội dung cụ thể và dấu vết trong repository |
|---|---|
| Redis job scheduler | Thêm `server/attendance/src/job-scheduler/` với interface, Nest module/token, Redis provider, kiểu job và `redis-job-scheduler.service.ts`; có `scripts/test-scheduler.ts` để kiểm tra scheduler. Scheduler được dùng cho công việc flush session. |
| Redis service và cấu hình chạy | Mở rộng `server/attendance/src/redis/redis.service.ts` cùng `redis.module.ts`; thêm `ioredis` vào `server/attendance/package.json`/lockfile, chỉnh `server/attendance/tsconfig.json` và `docker-compose.yml` để hỗ trợ Redis. Các thao tác Redis được bổ sung gồm hash, sorted set và set-if-absent. |
| Check-in attempt/device tracking | Thêm `attendance-check-in/infra/redis/redis-attendance-checkin-attempt.repository.ts` và `redis-attendance-checkin-device-usage.repository.ts`; sửa module, repository interface và in-memory store để luồng check-in dùng repository tracking phù hợp. Mục tiêu của commit là chuyển attempt/device usage sang Redis và xử lý race condition. |
| Attendance write-behind buffer | Thêm `attendance-record/attendance-record.buffer.ts`, `infra/redis/redis-attendance-record-buffer.ts` và repository Redis/PostgreSQL; cập nhật `attendance-records.service.ts`, module, token, repository interface và in-memory repository. Luồng này ghi/đọc buffer Redis, flush theo session và upsert records về PostgreSQL. |
| Attendance session persistence và API | Thêm `attendance-sessions/infra/prisma/prisma-attendance-session.repository.ts`; cập nhật session repository, service, module và controller để dùng persistence PostgreSQL, hỗ trợ hủy session và các thay đổi API liên quan. |
| Tiêu chí chọn participant | Thêm `attendance-sessions/dto/user-filter-criteria.dto.ts`, cập nhật `create-attendance-session.dto.ts` và logic service để validate participant criteria lồng nhau; các kiểu filter tương ứng được cập nhật trong shared package. |
| Schema/migration và shared types | Cập nhật `server/attendance/prisma/schema.prisma`, thêm migration `20260927103055_update_session_status_enum`; cập nhật shared attendance record/session types và user filter types, gồm các trạng thái `late` và `cancelled`. |
| Dọn session seed cũ | Xóa `attendance-sessions/attendance-session.seeder.ts`; commit `9c08eb3` ghi nhận việc bỏ seed data session cũ. |

Danh sách trên mô tả phạm vi file của commit range từ merge-base `6fd913c` tới parent `main` `9c08eb3` (41 file thay đổi, khoảng 1.105 dòng thêm và 135 dòng xóa theo Git). Đây là những gì chuỗi commit `main` đã đóng góp vào merge lịch sử; không có nghĩa từng dòng code vẫn giữ nguyên hình thức hiện tại, vì các file tiếp tục được sửa/di chuyển trong các commit sau đó. Các commit nguồn đáng chú ý: `29e8d8b`, `6432c9c`, `d3bd3f3`, `018f050`, `4a1e03e` và `9c08eb3`.

Đây là các đóng góp lịch sử từ chuỗi commit đã được merge; code hiện tại đã tiếp tục thay đổi sau merge. Nguồn xác minh: merge commit `1fb7f69`, parent main `9c08eb3` và commit range từ merge-base `6fd913c`.

### 6.2 Trạng thái tip `origin/main` mới nhất

Đối chiếu reflog, cấu hình upstream và `.git/FETCH_HEAD` cho thấy cần phân biệt thao tác đồng bộ sáng 07/11/2026 với việc nhập code:

- Branch hiện tại: `2312718_PhamNguyenNgocPhuoc_KiemThu`, HEAD `5bb193f`.
- Ref `origin/main`: `77e238a`.
- HEAD hiện tại có 24 commit không nằm trên `origin/main`; `origin/main` có 48 commit không nằm trên HEAD.
- Reflog HEAD không có thao tác pull/merge nào trong sáng 07/11; HEAD vẫn ở commit `5bb193f` từ 05/11.
- `.git/FETCH_HEAD` được cập nhật lúc khoảng 11:55 ngày 07/11 và có dòng `origin/main` tại `77e238a` được đánh dấu `not-for-merge`. Dòng được chọn để merge là branch hiện tại `2312718_PhamNguyenNgocPhuoc_KiemThu` tại `5bb193f`; branch này cũng là upstream của branch đang checkout.
- Vì vậy, bằng chứng Git trong working copy cho thấy sáng nay đã fetch các ref, bao gồm `origin/main`, nhưng **không pull/merge code của `main` vào branch hiện tại**. Có thể kiểm tra bằng `git reflog`, `git branch -vv` và `.git/FETCH_HEAD`.
- Các lần nhập `main` có trong lịch sử trước đó: reflog ghi `pull origin main: Fast-forward` ngày 10/09 khi branch `main` được checkout; sau đó branch feature có các merge commit ngày 12/09, 27/09 và 02/10. Merge ngày 02/10 là `1fb7f69`, được liệt kê ở mục 6.1.

Kết luận: các thành phần được nhập qua merge lịch sử là những mục tại 6.1. Lần fetch sáng nay chỉ cập nhật thông tin ref; không có đối tượng code nào từ tip `77e238a` được nhập vào working branch. Không thực hiện merge trong lần cập nhật README này.

## 7. Những lỗi/vấn đề đã xử lý và giới hạn còn lại

### Đã có thay đổi trong source

- **Trạng thái role không đồng nhất:** schema hiện dùng `admin`/`organizer`/`participant`; migration `20261024000000_neutral_user_roles` và migration reconcile tiếp theo ánh xạ role cũ `lecturer`/`student`. Database đang chạy chỉ được chuyển đổi sau khi migration được áp dụng đúng database.
- **Ghi attendance burst:** Redis buffer/Lua và scheduler/flush được đưa vào luồng; các kiểm thử gần đây xác nhận record ở Redis trước flush và ở PostgreSQL sau flush.
- **Check-in hot path:** một số I/O độc lập trong service được chạy song song; `markPresent` không đọc lại record Redis sau khi buffer đã ghi thành công. Backend build và các test mục tiêu đã qua trong lần tối ưu gần nhất.
- **Tab mobile trùng chức năng:** route Home trùng luồng với tab Điểm danh đã được bỏ; tab chuyên biệt tiếp tục giữ lịch học, lịch sử và hồ sơ. Build Android thực tế không được kết luận chỉ từ việc TypeScript/web export thành công.
- **Dashboard AuthProvider:** `main.tsx` bọc `App` bên trong `AuthProvider`, để các trang dùng `useAuth` có context.
- **CORS dev:** `main.ts` có cấu hình preflight/origin mặc định và `CORS_ORIGIN`; URL client vẫn phải trỏ đúng backend đang chạy. Sai port/tunnel hoặc origin không có trong cấu hình vẫn có thể gây lỗi CORS.

### Chưa thể xem là đã giải quyết/xác nhận

- Migration role được tạo trong source không tự chạy trên database người dùng; cần xác minh đúng `DATABASE_URL`, backup theo quy trình dự án và áp dụng migration trước khi kết luận lỗi Prisma enum đã hết.
- Benchmark mới nhất chưa đạt ngưỡng p95 50 ms; xem mục 8. Không tuyên bố đã đạt capacity ổn định 313 VU.
- Không kết luận xác minh integrity phần cứng chỉ từ payload mock/test.
- Chưa xác nhận toàn bộ luồng Android trên thiết bị thật trong lần cập nhật tài liệu này.

## 8. Kiểm thử hiệu năng check-in bằng k6

### 8.1 Mục tiêu và phạm vi

Mục tiêu là đo latency/throughput check-in trên stack test cô lập, đồng thời xác nhận attendance không chỉ trả response mà còn được ghi vào Redis buffer rồi flush về PostgreSQL.

| Thành phần | Vai trò trong test |
|---|---|
| K6 | Phát request theo constant-arrival-rate và tổng hợp latency/error |
| Nginx | Load balance các API replicas |
| NestJS API | Xử lý check-in production path trong cấu hình test |
| PostgreSQL/Redis | Database và attendance buffer riêng, không dùng service compose mặc định |
| `prepare-load.ts` | Tạo fixture/session/user/device/token và roster buffer |
| `check-in.js` | Gửi một request check-in cho mỗi fixture |
| `verify-load.ts` | Đối chiếu trạng thái buffer trước/sau flush với PostgreSQL |

Stack nằm trong [docker-compose.perf.yml](./docker-compose.perf.yml); hướng dẫn chi tiết ở [server/attendance/perf/README.md](./server/attendance/perf/README.md). Nó publish load balancer trên `127.0.0.1:3100`, có volume/database riêng. API được khởi động với `NODE_ENV=test` và `LOAD_TEST_MODE=true`; bootstrap chỉ cho phép chế độ này khi database là `gps_attendance_loadtest`.

### 8.2 Input và output đo

**Input:** fixture gồm session đang mở, participant user/account, JWT, device ID riêng từng user, tọa độ GPS nằm trong geofence, accuracy 10m, timestamp hiện tại, `isMockLocation=false`, và integrity payload dành cho môi trường test. `prepare-load.ts` tạo sẵn session/Redis roster để cô lập check-in hot path; vì vậy bài đo không tính thời gian tạo session, nhập roster hoặc khởi tạo attendance roster qua các API đó.

**Output/tiêu chí trong script k6:**

- `http_req_duration{endpoint:check-in}`: p95 phải nhỏ hơn `P95_MS` (mặc định 50 ms).
- `http_req_failed`: dưới 1%; `checks` trên 99%.
- `dropped_iterations`: bằng 0; `check_in_sent` bằng số fixture.
- Mỗi response được xem là thành công trong check script khi HTTP 200 và `data.status === 'VALID'`.
- `verify-load.ts` trước flush yêu cầu mọi user có record `present` trong Redis và chưa có record ở PostgreSQL; sau flush yêu cầu Redis buffer rỗng và đủ record `present` trong PostgreSQL.

### 8.3 Quy trình chạy

Chạy từ root repo trong PowerShell. Cần Docker Compose và k6 service image; mỗi lượt dùng fixture/session mới.

```powershell
# Stack perf riêng; 3 API replicas và load balancer
docker compose -f docker-compose.perf.yml up --build -d --scale backend=3 load-balancer

# Ví dụ profile 313 check-in trong 10 giây
$env:LOAD_USERS = '313'
$env:LOAD_VUS = '313'
$env:LOAD_TIME_UNIT = '10s'
docker compose -f docker-compose.perf.yml run --rm prepare
docker compose -f docker-compose.perf.yml run --rm load

# Kiểm tra dữ liệu trong Redis trước flush
$env:VERIFY_PHASE = 'before-flush'
docker compose -f docker-compose.perf.yml run --rm verify

# Sau khi session đóng và scheduler chạy, xác minh PostgreSQL sau flush
$env:VERIFY_PHASE = 'after-flush'
docker compose -f docker-compose.perf.yml run --rm verify
```

`constant-arrival-rate` phát một iteration cho mỗi fixture trên `timeUnit`; 313 request trong 10 giây tương đương mục tiêu khoảng 31,3 request/giây. Con số này **không** có nghĩa là 313 kết nối đồng thời được duy trì. Nếu đặt session đóng sau 10 phút, cần đợi tới sau `closeAt` và scheduler flush trước bước `after-flush`. Sau khi kiểm thử có thể dừng stack bằng `docker compose -f docker-compose.perf.yml down`; không dùng lệnh xóa volume nếu cần giữ evidence.

### 8.4 Kết quả thực tế

Các kết quả dưới đây là những lượt benchmark đã chạy trong phiên làm việc gần nhất; chúng không cùng profile/phần cứng nên cần xem riêng, không gộp thành một cam kết capacity.

| Lượt | Fixture / tốc độ phát | Accepted | p95 | Lỗi kỹ thuật / dropped | Diễn giải |
|---|---:|---:|---:|---:|---|
| Trước tối ưu | 1.000 / 10 giây (~100 req/s) | 1.000 | 14,18 giây | 0 / 0 | Hoàn tất request nhưng trượt xa ngưỡng 50 ms |
| Trước tối ưu | 313 / 10 giây (~31,3 req/s) | 313 | 768,81 ms | 0 / 0 | Đủ kết quả nghiệp vụ, p95 không đạt |
| Sau tối ưu, lượt sạch mới nhất | 313 / 10 giây (~31,3 req/s) | 313 | 301,99 ms | 0 / 0 | Đã xác minh 313 record present; vẫn không đạt 50 ms |

Các lượt khác có p95 dao động đáng kể, gồm một lượt 313 fixture đo được 57,62 ms và một lượt chịu nhiễu khi nhiều session flush cùng thời điểm. Kết quả 57,62 ms cũng vượt ngưỡng mặc định 50 ms, và không thay thế lượt sạch mới nhất. Một số lượt 100 fixture/10 giây trước tối ưu đo được p95 516 ms. Điều này cho thấy latency phụ thuộc tải nền, trạng thái database/session, tài nguyên và thời điểm flush.

Ở lượt sạch mới nhất, stack test chạy với giới hạn tài nguyên thấp hơn mặc định do năng lực máy khả dụng: mỗi API replica khoảng 1 CPU/512 MB, PostgreSQL 1,5 CPU/512 MB, Redis 0,5 CPU/256 MB. Đây không phải cấu hình production và không tương đương cấu hình mặc định trong compose. Các lần chạy đã dừng stack test nhưng giữ lại volume/evidence; không xóa dữ liệu attendance để làm sạch kết quả.

**Kết luận kiểm thử:** 313/313 request được xử lý thành công về nghiệp vụ và không có HTTP failure/dropped iteration trong lượt cuối, nhưng p95 301,99 ms cao hơn target 50 ms. Bằng chứng hiện tại **không chứng minh hệ thống đạt SLA p95 50 ms hoặc chịu được 313 VU đồng thời**. Cần profile CPU/DB/Redis, xác nhận pool/concurrency và lặp benchmark trên cấu hình cố định trước khi đưa ra ngưỡng tải an toàn.

## 9. Kiểm thử và xác minh code

Backend có Jest unit tests dưới `server/attendance/src/**/*.spec.ts` và E2E tests dưới `server/attendance/test`.

```powershell
pnpm --filter @gps-attendance/attendance test
pnpm --filter @gps-attendance/attendance test:e2e
pnpm build:attendance
pnpm build:admin
```

Các E2E cần database/test environment riêng. Không chạy test hiệu năng vào database production. Benchmark phải xem đồng thời p95, tỷ lệ lỗi kỹ thuật, business rejection, 429/dropped iteration, health và dữ liệu sau flush; “đủ request” không đồng nghĩa đạt latency target.

## 10. Tài liệu liên quan

- [Backend README](./server/attendance/README.md)
- [Mobile README](./client/mobile-client/README.md)
- [Admin dashboard README](./client/admin-dashboard/README.md)
- [Shared README](./packages/shared/README.md)
- [System overview](./docs/SYSTEM.md)
- [Performance test README](./server/attendance/perf/README.md)
