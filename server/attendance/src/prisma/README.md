# Prisma — schema, migrations và seed

README này mô tả **persistence của `server/attendance`**. Dù file README nằm trong `src/prisma/`, schema và migration thật nằm ở package-level `prisma/`.

## Nguồn cấu hình

- Schema: [`../../prisma/schema.prisma`](../../prisma/schema.prisma)
- Prisma config: [`../../prisma.config.ts`](../../prisma.config.ts)
- Migrations: [`../../prisma/migrations/`](../../prisma/migrations/)
- Seed được cấu hình: [`../../prisma/seed.ts`](../../prisma/seed.ts)
- Runtime Prisma module/service: [`./prisma.module.ts`](./prisma.module.ts), [`./prisma.service.ts`](./prisma.service.ts)

`prisma.config.ts` dùng `DATABASE_URL`, nạp dotenv và đặt migration directory/seed command. Prisma Client được generate từ schema package này.

## Model domains

Schema chứa các nhóm sau; field, relation, enum, index và delete behavior cụ thể phải xem trực tiếp trong `schema.prisma`:

- Identity: `Account`, `User`, `Role`, `AccountStatus`.
- Tổ chức: `Unit`, `Tag`, `UserTag`.
- Học vụ: `Course`, `AcademicTerm`, `CourseSection`, `ClassEnrollment`, `TimetableSlot`.
- Địa điểm: `Campus`, `Building`, `Room` và các enum trạng thái/loại địa điểm.
- Điểm danh: `AttendanceSession`, `AttendanceRecord`, `AttendanceAttempt`, `AttendanceHistoryEvent`, `LecturerLocationVerification`.
- Vận hành/bảo mật: `Notification`, `UserNotificationState`, `PushToken`, `RegisteredDevice`, `DeviceIntegrityCheck`, `AuditLog`.

Prisma model có thể map sang tên bảng/cột snake_case bằng `@map`/`@@map`; khi đổi mapping cần migration tương ứng. Không sửa migration đã áp dụng lên môi trường chia sẻ.

## Yêu cầu trước khi chạy

- Chạy lệnh tại `server/attendance/` hoặc dùng `pnpm --filter @gps-attendance/attendance exec ...` từ root.
- Database PostgreSQL phải tồn tại và `DATABASE_URL` trong `server/attendance/.env` phải trỏ đúng môi trường.
- Không in hoặc commit `.env`, database credentials hay secret.

```bash
cd server/attendance
pnpm exec prisma generate
pnpm exec prisma migrate status
```

## Vòng đời migration

### Phát triển local

Sau khi sửa `prisma/schema.prisma`, tạo migration có tên mô tả:

```bash
pnpm exec prisma migrate dev --name add_descriptive_change
```

Kiểm tra migration SQL sinh trong `prisma/migrations/<timestamp>_add_descriptive_change/`, review thay đổi rồi chạy test/build.

### Môi trường đã deploy

Chỉ apply migration đã review và commit:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
```

`migrate deploy` áp các migration pending, không tạo migration mới. Kiểm tra target `DATABASE_URL` trước khi chạy.

### Reset database — destructive

```bash
pnpm exec prisma migrate reset
```

Lệnh này **xóa dữ liệu trong database**, chạy lại toàn bộ migration và gọi seed. Chỉ dùng với database development có thể tái tạo; không chạy trên dữ liệu cần giữ/production. Nếu database có dữ liệu quan trọng, dừng và dùng migration được review thay vì reset.

## Seed hiện hành

`prisma.config.ts` cấu hình `prisma/seed.ts` làm seed mặc định. Chạy tại `server/attendance/`:

```bash
pnpm exec prisma db seed
```

Seed mặc định chỉ chạy khi `NODE_ENV=development` (nếu chưa đặt, script hiểu là development) và upsert users/accounts demo; account passwords lấy từ `SEED_*_PASSWORD` environment variables. Seed này **không** tạo course, academic term, class section, room, Building hay class enrollments; các dữ liệu đó cần được tạo qua chức năng admin/API tương ứng.

`src/prisma/prisma.seed.ts` là một seed file khác, gọi unit/user/account/tag seed helpers, nhưng **không** phải seed mà `prisma.config.ts` đang cấu hình. Không chạy song song/đổi seed mặc định nếu chưa review tác động và idempotency.

## Quy trình đề xuất

1. Xác nhận environment/database đích và backup nếu cần.
2. Cập nhật Prisma schema.
3. Chạy `migrate dev` trên database local để tạo migration.
4. Review SQL migration, đặc biệt với `DROP`, `ALTER TYPE`, data backfill và constraint.
5. Chạy backend tests, build và `migrate status`.
6. Commit schema + migration; deploy bằng `migrate deploy`.
7. Xác minh health endpoint `GET /v0/health` và các luồng nghiệp vụ liên quan.

Backend usage/API: [../../README.md](../../README.md).
