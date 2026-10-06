# Presentation — GPS Attendance System

Workspace Slidev độc lập chứa slide trình bày đồ án hệ thống điểm danh GPS. Nội dung và giao diện slide nằm trong workspace `presentation/`; workspace này **không** nằm trong pnpm workspace ở thư mục gốc.

## Nội dung trình bày

Slide deck tại [`slides.md`](./slides.md) gồm:

1. Bối cảnh, vấn đề và mục tiêu/phạm vi.
2. Giải pháp geofencing, phiên điểm danh và phân quyền.
3. Luồng điểm danh, cơ chế xác thực vị trí và vòng đời phiên.
4. Mô hình dữ liệu, đơn vị và thẻ.
5. Kiến trúc hệ thống và công nghệ.
6. Giao diện web/mobile, phân công nhóm, kết quả và hướng phát triển.

Danh tính nhóm, ngày trình bày và nội dung demo được khai báo trực tiếp trong `slides.md`.

## Công nghệ và cấu trúc

- Slide framework: Slidev (`@slidev/cli`), Vue 3.
- Theme dependencies: `@slidev/theme-default`, `@slidev/theme-seriph`.
- Entry deck: `slides.md`.
- Tài nguyên tĩnh: `public/` (đường dẫn sử dụng trong slide bắt đầu bằng `/`).
- Style dùng chung: `style.css`; component bổ trợ: `components/`; trang hỗ trợ: `pages/`; nội dung mẫu: `snippets/`.
- Workspace riêng có `pnpm-lock.yaml`, `pnpm-workspace.yaml` và cấu hình hosting riêng.

## Yêu cầu

- Node.js tương thích với phiên bản pnpm được cài tại máy.
- pnpm.
- Với xuất PDF/ảnh/PPTX, cài đặt trình duyệt Chromium mà Slidev export yêu cầu; workspace đã cho phép build script `playwright-chromium`.

## Cài đặt và chạy

Chạy các lệnh trong thư mục `presentation/`, không chạy từ workspace root:

```bash
cd presentation
pnpm install
pnpm dev
```

Mở URL Slidev in ra trong terminal (mặc định `http://localhost:3030`). Sửa `slides.md`; Slidev tự reload khi lưu.

## Build và export

```bash
pnpm build       # build bản tĩnh vào dist/
pnpm export      # export slide (mặc định PDF; xem tùy chọn Slidev để chọn định dạng)
```

Không commit thư mục build hoặc file export nếu quy trình nộp bài không yêu cầu. Cấu hình Netlify/Vercel nằm tại `netlify.toml` và `vercel.json`.

## Liên kết

- Slidev: <https://sli.dev/>
- README monorepo: [../README.md](../README.md)
- Tài liệu sản phẩm và kiến trúc: [../docs/SYSTEM.md](../docs/SYSTEM.md)
