# GPS Attendance System

Hệ thống điểm danh tự động sử dụng định vị GPS thời gian thực, kết hợp các cơ chế chống gian lận (giả mạo vị trí, trùng thiết bị) và kiến trúc đảm bảo chịu tải khi nhiều sinh viên điểm danh cùng lúc.

## Mục tiêu

- Cho phép sinh viên điểm danh bằng ứng dụng di động dựa trên vị trí GPS thực tế.
- Phát hiện và ngăn chặn các hành vi gian lận phổ biến:
  - **Giả mạo vị trí (location spoofing / mock location)**
  - **Trùng thiết bị** — một thiết bị được dùng để điểm danh hộ nhiều tài khoản
- Đảm bảo hệ thống hoạt động ổn định khi có lượng lớn yêu cầu điểm danh đến cùng lúc (đầu giờ học, đầu sự kiện).

> Lưu ý: hệ thống không hướng đến việc chặn tuyệt đối mọi hình thức gian lận, mà tập trung chặn các kịch bản phổ biến, nâng cao chi phí gian lận ở mức hợp lý cho một hệ thống quy mô trường học.

## Cấu trúc repo

```
gps-attendance/
├── server/                       # Backend API (NestJS)
├── client/
│   ├── admin-dashboard/          # Web dashboard cho giảng viên/quản trị (React + Vite)
│   └── mobile-client/            # Ứng dụng di động cho sinh viên (Expo / React Native)
└── packages/
    └── shared-types/             # Type/DTO dùng chung giữa server, admin, mobile
```

Đây là **pnpm workspace monorepo** — 3 project (`server`, `admin-dashboard`, `mobile-client`) và `shared-types` được quản lý cùng nhau qua **1** `pnpm-lock.yaml` duy nhất ở root, không cài dependency riêng lẻ từng thư mục.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | NestJS |
| Admin Dashboard | React + Vite + TypeScript |
| Mobile Client | Expo SDK 54 (React Native) |
| Package manager | pnpm workspace |

## Yêu cầu môi trường

- **Node.js** >= 20.x (khuyến nghị dùng qua [nvm](https://github.com/nvm-sh/nvm))
- **pnpm** — bật qua corepack (đã có sẵn từ Node 16.13+):
  ```bash
  corepack enable
  ```
  Repo đã pin sẵn version pnpm trong `package.json` (`packageManager`), corepack sẽ tự dùng đúng version, không cần cài thủ công.
- App **Expo Go** trên điện thoại (Android/iOS) để chạy thử `mobile-client` mà không cần build native
  > Dự án đang dùng **Expo SDK 54** để đảm bảo tương thích với bản Expo Go hiện có trên CH Play/App Store. Nếu bản Expo Go trên máy bạn không khớp SDK, vào store cập nhật Expo Go lên bản mới nhất hoặc kiểm tra lại version SDK của project trong `client/mobile-client/package.json`.
- (Tuỳ chọn, cho giai đoạn sau) Docker — dùng khi cần chạy database hoặc chuẩn bị deploy

## Cài đặt

Chỉ cài đặt **1 lần duy nhất ở root**, không `cd` vào từng project để `pnpm install` riêng (sẽ phá vỡ liên kết workspace).

```bash
git clone <repo-url>
cd gps-attendance
pnpm install
pnpm build:shared
```

Sau khi cài xong, chạy từng project bằng script ở root:

### 1. Server (NestJS)

```bash
pnpm dev:server
```
Mặc định chạy tại `http://localhost:3000`. Lệnh này tự build `shared-types` trước khi khởi động.

### 2. Admin Dashboard (React)

```bash
pnpm dev:admin
```
Mặc định chạy tại `http://localhost:5173`.

### 3. Mobile Client (Expo)

```bash
pnpm dev:mobile
```
Quét mã QR hiện trên terminal bằng app **Expo Go** để chạy thử trên điện thoại thật (khuyến nghị dùng thiết bị thật thay vì emulator, vì tính năng GPS/anti-spoofing cần thiết bị thật để hoạt động và kiểm thử chính xác).

> Nếu điện thoại và máy tính không cùng mạng WiFi, dùng `expo start --tunnel` (chạy trong `client/mobile-client`), hoặc kết nối qua USB bằng `adb reverse tcp:8081 tcp:8081`.

## Build & dọn cache

```bash
pnpm build          # build shared-types, server, admin-dashboard
pnpm clean           # dọn cache/output khi gặp lỗi build lạ
```

### Lưu ý khi sửa `packages/shared-types`

Server dùng bản đã build sẵn (`dist/`) của `shared-types`, không đọc trực tiếp file `.ts` nguồn. Nếu sửa `shared-types` trong lúc `server` đang chạy dev, mở thêm terminal chạy:
```bash
pnpm dev:attendance
```
để tự động build lại mỗi khi lưu file. (Admin dashboard và mobile không cần bước này — 2 project đó dùng bundler nên đọc thẳng file `.ts` nguồn, thay đổi có hiệu lực ngay khi lưu.)

## Cách hoạt động (tổng quan)

1. Giảng viên/quản trị tạo một **phiên điểm danh** (attendance session) qua admin dashboard, gồm: thời gian, vị trí trung tâm (toạ độ GPS), bán kính cho phép.
2. Sinh viên mở mobile app trong khung thời gian của phiên, ứng dụng lấy vị trí GPS hiện tại của thiết bị.
3. Server nhận yêu cầu điểm danh, kiểm tra:
   - Khoảng cách giữa vị trí sinh viên và tâm điểm phiên có nằm trong bán kính cho phép không.
   - Vị trí có dấu hiệu bị giả lập (mock location) không.
   - Thiết bị này đã dùng để điểm danh cho tài khoản khác trong cùng phiên chưa.
4. Kết quả điểm danh (hợp lệ / nghi ngờ gian lận) được ghi nhận và hiển thị trên admin dashboard để giảng viên xem xét.

## Trạng thái phát triển

Dự án đang trong giai đoạn phát triển ban đầu. Cấu trúc và API có thể thay đổi.

## Đóng góp

Repo dùng chung cho các thành viên trong nhóm đồ án. Khi thêm tính năng mới:
- Tạo branch riêng, không push trực tiếp lên `main`.
- Đặt tên commit rõ ràng, mô tả đúng thay đổi.
- Cập nhật README này nếu có thay đổi về cấu trúc hoặc cách chạy dự án.