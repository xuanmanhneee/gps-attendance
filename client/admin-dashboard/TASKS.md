# TASKS — Phần việc của tôi (admin-dashboard)

> Phạm vi: chỉ `client/admin-dashboard`. Không sửa `server/`, `client/mobile-client`, `packages/shared`.
> Nguồn: `plans/` (mã task `Pxx-yy`). Ngữ cảnh dự án: `client/admin-dashboard/PROJECT_CONTEXT.md`.
> File này viết cho cả NGƯỜI lẫn AI (Kilo Code). AI chỉ đọc **Phần 0** và **đúng một thẻ**.

Đánh dấu: `[ ]` chưa làm, `[~]` đang làm, `[x]` xong (kèm bằng chứng: output build/test dán nguyên văn).

## Tổng quan

| # | Task | Số thẻ | Ưu tiên | Trạng thái |
|---|---|---|---|---|
| 1 | P04-07 Dọn điều hướng, Login, ErrorBoundary, lazy load | 9 | P2 | [x] — hoàn thành toàn bộ 9 thẻ (.1 đến .8) |
| 2 | P04-01 Hoàn thiện wizard tạo phiên | 7 | P1 | [~] — main đã làm một phần; chỉ rà và bù phần thiếu |
| 3 | P04-03 Sửa/huỷ phiên (`/sessions/:id/edit`) | 7 | P1 | [~] — xuanmanhneee đã làm trang sửa; còn .2 .3 .4 .6 |
| 4 | P07-03 Test UI theo rủi ro | 5 | P1 | [ ] — chờ quyết định |
| 5 | P07-07 Rà bảo mật phía dashboard | 7 | P1 | [ ] |
| 6 | P03-02 Đăng xuất thu hồi phiên | 4 | P0 | [ ] — chờ backend P01-06 |
| 7 | P05-02 / P05-05 `/users` và `/statistics` thật | 5 | P1 | [ ] — chờ backend P05-01, P05-04 |
| 8 | P04-04 / 05 / 06 Kết quả gần thực, duyệt `REVIEW`, xuất file | 5 | P1 | [ ] — backend duyệt REVIEW đã có; P04-05.1 cần đối chiếu (có thể đã có UI) |

Thứ tự khuyên làm (cập nhật 06/11): 1 (làm .4 khôi phục trước, rồi .1, .5b, .6, .7, .8) → 3 → 2 → 8 (P04-05.1, sau khi đối chiếu) → 5 → 4 (sau khi quyết định). Task 6, 7 chỉ làm khi backend xong và hợp đồng API đã được điền.

## Đối chiếu với main (06/11)
Nguồn: `sync-report.txt`, `commits-stat.txt` và báo cáo ĐỐI CHIẾU của Kilo tại `c80be75` (build xanh, test 120/120). Người làm song song: xuanmanhneee.

| Phát hiện | Hệ quả |
|---|---|
| `61947aa` thêm `SessionEditPage` (route, form, `buildUpdateSessionRequest`, test) | P04-03.1 coi như xong; .3 chỉ còn bù; .2 .4 .6 vẫn thiếu |
| `77e238a` viết lại `DashboardLayout`, `Topbar`, `Brand`, `LogoMark`, đụng `SessionCreatePage`, `SessionDetailPage`, `SessionsPage` | `ErrorBoundary` của P04-07.4 bị đè (xem thẻ .4); nhiều file cần tránh (luật 0.2 mục 13) |
| `session-form.ts` và test đã có validation, `isCloseAfterOpen`, geolocation, `parseParticipantCodes` | P04-01 chỉ rà và bù, không làm lại |
| Backend duyệt `REVIEW` và audit đã có (`77e238a`) | P04-05.1 hết bị chặn về API, nhưng phải kiểm tra UI đã có chưa |
| `navigation.ts` chưa ai đụng | P04-07.1 vẫn mở |
| Entry chunk `index-*.js` 630 kB, chunk `SessionCreatePage` chỉ 32 kB | Nghi Leaflet quay lại entry (xem P04-07.5b) |

Việc cần chốt với xuanmanhneee: ai giữ `SessionEditPage`, `SessionDetailPage`, UI duyệt `REVIEW`; ai sửa `DashboardLayout` và `AppRoutes`.

---

# PHẦN 0 — LUẬT CHUNG (AI phải đọc trước mọi thẻ)

## 0.1 Cách dùng
- Mỗi lần chạy làm ĐÚNG MỘT THẺ (mã dạng `P04-07.1`). Chỉ đọc Phần 0 và thẻ đó. Bỏ qua các thẻ khác.
- Thẻ có `Trạng thái` khác `SẴN SÀNG` thì từ chối làm và nói rõ lý do (chờ backend, chờ quyết định, thiếu hợp đồng API).
- Thẻ là nguồn duy nhất về phạm vi. Việc không có trong thẻ thì không làm, kể cả khi thấy lỗi khác. Ghi lỗi đó vào mục "Phát hiện thêm" của báo cáo.
- Mỗi task có mục **Gợi ý triển khai**. Đọc nó cùng với thẻ của task đó. Gợi ý chỉ là hướng làm, KHÔNG phải sự thật đã xác minh: tên file, hàm trong gợi ý vẫn phải mở hoặc grep thấy rồi mới dùng. Gợi ý mâu thuẫn với code hoặc với Phần 0 thì làm theo code và Phần 0, rồi báo lại.

## 0.2 Luật chống bịa (cứng, không ngoại lệ)
1. Không bịa đường dẫn, tên file, tên hàm, props, key i18n, endpoint, error code, tên token màu. Muốn dùng thứ gì thì phải mở file hoặc `grep` thấy tận mắt, và nêu nguồn dạng `đường/dẫn/file.ts:dòng`.
2. Không tìm thấy bằng grep, hoặc không chắc, thì DỪNG và hỏi. Không đoán, không "tạm thời", không viết giả định như thật.
3. Tài liệu có thể lỗi thời, code mới là sự thật. Nếu thẻ nói X mà code là Y thì báo lại, đừng làm theo thẻ một cách mù quáng.
4. Không tự tạo: dependency, file cấu hình, token màu, route, role, key i18n ngoài danh sách của thẻ.
5. Chỉ SỬA trong `client/admin-dashboard` (và `TASKS.md` khi thẻ yêu cầu tick). Được ĐỌC `server/` và `packages/shared` để đối chiếu, không được sửa.
6. Không refactor, không đổi tên, không format lại file ngoài phạm vi. Diff nhỏ nhất có thể.
7. Không báo "xong" khi chưa chạy lệnh ở mục Nghiệm thu. Dán output nguyên văn, không tóm tắt kiểu "build pass".
8. Không sửa test cho khớp code sai. Không xoá hay skip test đang đỏ.
9. Không sửa `package.json` và `pnpm-lock.yaml`, trừ khi thẻ ghi rõ.
10. Không `console.log` dữ liệu nhạy cảm (token, vị trí, deviceId).
11. Chỉ được tick `[x]` ở Bước F, sau khi người dùng trả lời `duyệt`. Không tự tick ngay khi vừa xong Bước D.
12. Mỗi thẻ phải MỞ LẠI file từ đĩa, không dựa vào trí nhớ của lần chạy trước (nhánh có thể vừa merge từ main). Đầu báo cáo ghi kết quả `git status --short` và `git log -1 --format=%h`.
13. File do người khác làm (`SessionEditPage.tsx`, `SessionDetailPage.tsx`, `Topbar.tsx`, `Brand.tsx`, `LogoMark.tsx`, `page-action-bar.tsx`, `DashboardLayout.tsx`, `AppRoutes.tsx`, `navigation.ts`, phần review/audit): chỉ sửa khi thẻ gọi đích danh file đó, sửa tối thiểu, và ghi rõ trong "Phát hiện thêm" để người dùng báo đồng đội. Thẻ cần sửa file này mà thẻ không nêu thì DỪNG và hỏi.

## 0.3 Quy trình mỗi thẻ

**Bước 0 — Nạp ngữ cảnh.** Đọc `AGENTS.md`, `client/admin-dashboard/PROJECT_CONTEXT.md`, `client/admin-dashboard/ARCHITECTURE.md`. Chưa tìm thấy file nào thì nói rõ, đừng tự tạo.

**Bước A — BÁO CÁO ĐỌC.** Mở các file ở mục "Đọc trước" của thẻ và viết báo cáo theo mẫu 0.5.1. Chưa được sửa gì.

**Bước B — Cổng dừng.**
- Thẻ `Chế độ: DỪNG SAU BÁO CÁO ĐỌC`: đăng báo cáo rồi DỪNG. Chỉ sửa khi người dùng trả lời "OK" (hoặc "OK, nhưng đổi X").
- Thẻ `Chế độ: CHẠY THẲNG`: đăng báo cáo rồi làm tiếp ngay.

**Bước C — Sửa.** Chỉ làm đúng "Việc cần làm", tôn trọng "Không được làm".

**Bước D — Nghiệm thu.** Chạy từng lệnh ở mục "Nghiệm thu" và dán output nguyên văn. Lệnh đỏ thì sửa, chạy lại. Vẫn đỏ thì dừng và báo cáo, không giấu.

**Bước E — BÁO CÁO HOÀN THÀNH** theo mẫu 0.5.2. Không tự commit. Chỉ đề xuất message.

**Bước F — Tự đánh dấu (CHỈ sau khi người dùng trả lời `duyệt`).** Trong `TASKS.md`: đổi ô `Xong: [ ]` của ĐÚNG thẻ vừa làm thành `[x]` và thêm một dòng ngay dưới thẻ: `- Bằng chứng: <ngày> · build xanh · test xanh (N test) · file đã sửa: <danh sách>`. Khi mọi thẻ của một task đều đã `[x]` thì mới đổi ô trạng thái của task đó trong bảng Tổng quan. Chưa có chữ `duyệt` thì tuyệt đối không tick. Không sửa nội dung nào khác của `TASKS.md`.

## 0.4 Quy ước code của dự án
- Component React (`.tsx`) đặt tên PascalCase (ví dụ `ErrorBoundary.tsx`); hook, util, service, config dùng kebab-case hoặc theo file cùng thư mục (mở một file cạnh bên để xem). Comment nghiệp vụ tiếng Việt, tên biến/hàm tiếng Anh.
- Chuỗi giao diện đi qua `t()`. Key mới thêm vào CẢ `vi.ts` và `en.ts` (`vi.ts` là nguồn key).
- Màu dùng token trong `@theme`, không hard-code (`#...`, `rgb(...)`). Không có token phù hợp thì báo lại.
- Không render `Error.message` ra UI. Lỗi map theo `ApiError.code` sang key i18n.
- Logic thuần để trong `utils/` kèm `*.test.ts` (`node:test`). Không mutate state. File < 400 dòng.
- Mẫu có sẵn nên theo: hook giữ state + `toError`; `parse/isXxx` kiểm tra shape response; `request-scope` / `load-tracker` chống stale response.
- Lệnh chuẩn: `pnpm --filter @gps-attendance/admin-dashboard build` và `pnpm --filter @gps-attendance/admin-dashboard test`.
- Commit: conventional commits (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`).

## 0.5 Mẫu báo cáo

### 0.5.1 BÁO CÁO ĐỌC
```
BÁO CÁO ĐỌC — <mã thẻ>
1. File đã mở (đường dẫn thật):
2. Trích đoạn code liên quan (nguyên văn, mỗi đoạn <= 15 dòng, kèm file:dòng):
3. Chỗ thẻ nói KHÔNG khớp với code:
4. Kế hoạch sửa (file nào, sửa gì, tối đa 5 dòng):
5. Điều chưa chắc / cần tôi quyết:
```

### 0.5.2 BÁO CÁO HOÀN THÀNH
```
BÁO CÁO HOÀN THÀNH — <mã thẻ>
1. File đã sửa/tạo/xoá (liệt kê hết):
2. Lệnh đã chạy + output nguyên văn:
3. Việc trong thẻ KHÔNG làm được hoặc làm một phần, và lý do:
4. Phát hiện thêm (ngoài phạm vi, không sửa):
5. Đề xuất commit message:
```

---

# PHẦN 1 — CÁC THẺ

Mỗi thẻ gồm: Trạng thái, Chế độ, Đọc trước, Việc cần làm, Không được làm, Nghiệm thu.

---

## 1. P04-07 — Dọn điều hướng và chất lượng UI
Nghiệm thu cả task: menu khớp route, Login dùng token và i18n, không còn control chết, lỗi render không làm trắng app.

#### Gợi ý triển khai P04-07 (không ràng buộc, phải xác minh với code)
- **Thứ tự:** .1 → .2 → .3 (cùng đụng `LoginPage`, làm xoá nút Google trước rồi mới sửa màu/chuỗi để diff dễ đọc) → .4 → .5 → .6 → .7 → .8.
- **Menu (.1):** mỗi mục trong `NAVIGATION_ITEMS` có mảng `roles`; thêm `'admin'` vào mảng của mục `/sessions` là đủ, không cần đụng cấu trúc.
- **Map lỗi login (.3):** theo mẫu dự án: một object `mã lỗi → key i18n` và một key mặc định cho mã lạ. Nhìn một trang đã làm thật để bắt chước đúng cách đặt tên key, đừng tự nghĩ ra kiểu mới.
- **Màu (.3):** nhiều khi màu hard-code có token gần đúng trong `@theme`. Chọn token gần nhất về ý nghĩa (màu chữ chính, nền, viền), không cố khớp từng mã hex. Màu nào không có token thì liệt kê lại cho người quyết.
- **ErrorBoundary (.4):** error boundary bắt buộc là class component (`getDerivedStateFromError`, có thể thêm `componentDidCatch`). Nên truyền `resetKey={location.pathname}` cho boundary (component hiện có dùng prop `resetKey`, không dùng `key`) để chuyển sang trang khác thì lỗi cũ tự xoá (không bị kẹt màn hình lỗi).
- **Lazy (.5):** `React.lazy` cần `export default`. Nếu `SessionCreatePage` đang export tên, dùng `lazy(() => import('...').then(m => ({ default: m.SessionCreatePage })))` thay vì đổi kiểu export. Kiểm tra thêm CSS của Leaflet được import ở đâu: nếu import ở file gốc (`main`) thì vẫn nằm trong entry.
- **Code chết (.6):** grep với tên đầy đủ, cả trong test và file `.d.ts`. Key i18n còn dùng ở chỗ gọi bằng chuỗi ghép (`t(\`sessions.form.${x}\`)`) thì grep thường sẽ bỏ sót: kiểm tra cả dạng này trước khi xoá.
- **typecheck (.7):** nếu script `build` đang là `tsc -b && vite build` thì `typecheck` có thể dùng đúng phần `tsc -b`; nếu tsconfig dùng project references thì xem file `tsconfig.app.json`. Chỉ đọc `package.json` rồi quyết định, đừng cài gì.
- **Bẫy hay gặp:** xoá import xong mà quên xoá biến còn lại gây lỗi build; sửa file `vi.ts` mà quên `en.ts`.

### P04-07.1 — Menu khớp route
- **Trạng thái:** ĐÃ XONG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · file đã sửa: `navigation.ts`, `PLAN.md`
- **Đối chiếu 06/11:** chưa ai làm. `navigation.ts:62-68` `/sessions` còn `roles: ['organizer']`; `isKnownPath`/`isPathAllowedForRole` (`navigation.ts:120-129`) không có nơi gọi. Main không đổi file này.
- **Đọc trước:** `config/navigation.ts` (`NAVIGATION_ITEMS`, `isPathAllowedForRole`, `isKnownPath`); file khai báo route (`AppRoutes.tsx`); nơi gọi hai hàm trên (grep).
- **Quyết định đã chốt:** admin có menu `/sessions` (`AdminSessionsView` đã có). `/statistics` vẫn là placeholder nên GIỮ menu chỉ organizer; ghi một dòng quyết định này vào `PLAN.md`.
- **Việc cần làm:**
  1. Thêm mục menu `/sessions` cho role `admin`.
  2. Nếu `isPathAllowedForRole` / `isKnownPath` không có nơi nào gọi (grep xác nhận) thì xoá; sửa hoặc xoá comment "menu và route không thể lệch nhau".
- **Không được làm:** đổi route, đổi role, đổi tên key menu hiện có, đụng `LoginPage`.
- **Nghiệm thu:** `grep -rn "isPathAllowedForRole\|isKnownPath" client/admin-dashboard/src` không còn kết quả (hoặc còn đúng nơi gọi nếu giữ); `build` và `test` xanh.
- **Commit gợi ý:** `fix(admin): thêm menu sessions cho admin, dọn code chết ở navigation`

### P04-07.1b — Mô tả trang Phiên điểm danh trung tính theo vai trò
- **Trạng thái:** ĐÃ XONG · **Chế độ:** CHẠY THẲNG · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · file đã sửa: `vi.ts`, `en.ts`
- **Đối chiếu 07/11:** `sessions.page.description` ở `vi.ts:155` và `en.ts:160` viết cho organizer ("do bạn tạo" / "you created"), nhưng admin cũng có menu `/sessions` sau P04-07.1.
- **Đọc trước:** `git grep -n "sessions.page.description" -- client/admin-dashboard/src`; hai dòng key trong `vi.ts`, `en.ts`.
- **Việc cần làm:** đổi nội dung hai key này thành câu trung tính (vi: "Quản lý và theo dõi các phiên điểm danh GPS."; en: "Manage and track GPS attendance sessions."). Chỉ sửa giá trị, không đổi tên key, không đụng `Topbar`.
- **Không được làm:** thêm key mới, sửa file khác.
- **Nghiệm thu:** `build`, `test` xanh; hai file có cùng key; `git diff` chỉ 2 dòng.
- **Commit gợi ý:** `fix(admin): mô tả trang phiên điểm danh phù hợp cả admin lẫn organizer`


### P04-07.2 — Xoá nút Google
- **Trạng thái:** ĐÃ XONG · **Chế độ:** CHẠY THẲNG · **Xong:** [x]
- Bằng chứng: 06/11 · commit 36976a7, đã merge c80be75 · build xanh · test xanh (120 test) · `LoginPage.tsx` không còn Google, `public/google-icon.png` đã xoá
- **Đọc trước:** `LoginPage.tsx`; `grep -rn "google-icon" client/admin-dashboard`.
- **Quyết định đã chốt:** nhóm trưởng đồng ý bỏ nút Google (05/11).
- **Việc cần làm:** xoá nút Google, khối phân cách "Hoặc đăng nhập bằng" nằm ngay trên nó, và import liên quan (`FcGoogle`, và `toast` nếu thành thừa). Xoá `public/google-icon.png` chỉ khi grep cho thấy không còn nơi nào dùng.
- **Không được làm:** đổi màu, đổi chuỗi, đổi logic đăng nhập (để thẻ .3).
- **Nghiệm thu:** `grep -in "google" LoginPage.tsx` không còn kết quả; `build` xanh.
- **Commit gợi ý:** `chore(admin): xoá nút đăng nhập Google không có chức năng`

### P04-07.3 — LoginPage dùng token và i18n
- **Trạng thái:** ĐÃ XONG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [x]
- Bằng chứng: 06/11 · commit 36976a7, đã merge c80be75 · build xanh · test xanh (120 test) · `LoginPage.tsx` dùng `t()`, token, map `AuthErrorCode`; không còn mã hex. Ghi chú: `Brand`, `LogoMark`, `favicon.svg`, `index.html` do xuanmanhneee đổi ở `77e238a`, KHÔNG sửa; `index.html:19` title còn tiếng Anh `GPS Attendance — Dashboard` (báo đồng đội).
- **Đọc trước:** `LoginPage.tsx`; `vi.ts`, `en.ts` (cách đặt tên key hiện có); file `@theme` (danh sách token màu); nơi định nghĩa `AuthErrorCode` (grep); cách trang khác trong dự án map lỗi sang key (xem một ví dụ).
- **Việc cần làm:**
  1. Thay màu hard-code bằng token CÓ SẴN trong `@theme`. Không có token phù hợp thì liệt kê màu nào thiếu, đừng tự tạo.
  2. Chuyển mọi chuỗi tiếng Việt sang `t()`, key mới ở cả `vi.ts` và `en.ts`.
  3. Lỗi đăng nhập map theo `ApiError.code` / `AuthErrorCode` sang key, có key mặc định cho lỗi lạ.
  4. **Quyết định của nhóm trưởng (05/11):** bỏ mọi nhận diện Đại học Đà Lạt trên `LoginPage` (tên trường, logo trường, `@dlu.edu.vn`, địa chỉ...). Thương hiệu chỉ ghi "Hệ thống điểm danh GPS" (vi) và "GPS Attendance System" (en), qua `t()`. Liệt kê trong báo cáo mọi chỗ còn nhắc "Đà Lạt" / "DLU" / `dlu` / logo trường trong `LoginPage`, nếu có.
  5. **Màu:** chuyển sang xanh dương GIỐNG dashboard. Mở `DashboardLayout` / `Sidebar` để biết dashboard đang dùng token nào cho màu chủ đạo (nút chính, màu nhấn, nền), rồi dùng đúng token đó cho `LoginPage`. Màu xanh lá/xám xanh lá hiện có (ví dụ `#2a3729`, `#7d8d77`) phải thay bằng token của dashboard, không giữ lại.
- **Không được làm:** đổi layout (ngoại trừ gỡ phần nhận diện trường ở mục 4), thêm tính năng, tạo token mới, render `Error.message`. Nhận diện trường ở NƠI KHÁC (tiêu đề `index.html`, favicon, `Sidebar`...) chỉ báo trong "Phát hiện thêm", không sửa ở thẻ này.
- **Nghiệm thu:** grep chuỗi tiếng Việt có dấu và mã màu `#` trong `LoginPage.tsx` không còn; `vi.ts` và `en.ts` có cùng key mới; `build`, `test` xanh.
- **Commit gợi ý:** `refactor(admin): LoginPage dùng design token và i18n`

### P04-07.4 — ErrorBoundary (KHÔI PHỤC sau merge)
- **Trạng thái:** ĐÃ XONG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · file đã sửa: `DashboardLayout.tsx`
- **Đối chiếu 06/11:** `components/layout/ErrorBoundary.tsx` còn nguyên (có `resetKey`), nhưng `DashboardLayout.tsx` hiện KHÔNG import và KHÔNG bọc `<Outlet />` (xuanmanhneee viết lại file ở `77e238a`, merge `c80be75` giữ bản của main). Lỗi render ở trang con lại làm trắng app.
- **Đọc trước:** `DashboardLayout.tsx` bản trên đĩa (vị trí `<Outlet />`, `PageActionBarProvider`, đã có `useLocation` chưa); `ErrorBoundary.tsx` (props); `git grep -n "ErrorBoundary" -- client/admin-dashboard/src`.
- **Việc cần làm:** chỉ bọc `<Outlet />` trong `DashboardLayout.tsx` bằng `<ErrorBoundary resetKey={location.pathname}>`, giữ nguyên mọi thứ khác của file. Chưa có `useLocation` thì thêm import tối thiểu.
- **Không được làm:** tạo lại `ErrorBoundary.tsx`, đổi key i18n, sửa `Topbar`, `page-action-bar`, bố cục, bọc cả App.
- **Nghiệm thu:** `git grep -n ErrorBoundary -- client/admin-dashboard/src` thấy ở `DashboardLayout.tsx`; `git --no-pager diff --stat` chỉ có `DashboardLayout.tsx`; `build`, `test` xanh; cách tự kiểm tra tay (ném lỗi tạm trong một trang, thấy fallback, xoá đoạn ném và xác nhận bằng `git diff`).
- **Phối hợp:** báo xuanmanhneee trước vì cùng file (luật 0.2 mục 13).
- **Commit gợi ý:** `fix(admin): khôi phục ErrorBoundary quanh Outlet sau khi merge main`

### P04-07.5 — Lazy load SessionCreatePage
- **Trạng thái:** ĐÃ XONG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [x]
- Bằng chứng: 06/11 · `AppRoutes.tsx:23,90-97` dùng `lazy` + `Suspense`; build có chunk riêng `SessionCreatePage-*.js` 32.06 kB. Lưu ý: chunk này quá nhỏ để chứa Leaflet, xem P04-07.5b.
- **Đọc trước:** `AppRoutes.tsx` (cách import `SessionCreatePage`); component loading dùng sẵn (grep `Loading`/`Spinner`).
- **Việc cần làm:** `React.lazy` + `Suspense` cho `SessionCreatePage`, fallback dùng component loading có sẵn. Chạy build và báo chunk Leaflet có nằm trong entry chunk không.
- **Không được làm:** lazy cho trang khác, đổi vite config.
- **Nghiệm thu:** `build` xanh; dán nguyên danh sách chunk từ output build; nói rõ chunk nào chứa Leaflet.
- **Commit gợi ý:** `perf(admin): lazy load SessionCreatePage để tách Leaflet khỏi entry`

### P04-07.5b — Leaflet có thể đã quay lại entry chunk
- **Trạng thái:** ĐÃ XONG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · file đã sửa: `AppRoutes.tsx`
- **Đối chiếu 06/11:** build cho `index-*.js` 630.47 kB và `SessionCreatePage-*.js` chỉ 32.06 kB. GIẢ THUYẾT (chưa kiểm chứng): `SessionEditPage` (import thường, từ `61947aa`) dùng `SessionLocationFields` → `SessionLocationPickerModal` → Leaflet nên bị kéo vào entry.
- **Đọc trước:** `AppRoutes.tsx` (cách import `SessionEditPage`); `git grep -n "leaflet" -- client/admin-dashboard/src`; chuỗi import từ `SessionEditPage` tới Leaflet; output `build`.
- **Việc cần làm:** báo cáo chuỗi import và chunk nào đang chứa Leaflet (PowerShell: `Select-String -Path client/admin-dashboard/dist/assets/*.js -Pattern "leaflet" -List`). Chỉ khi giả thuyết đúng: `lazy` + `Suspense` cho `SessionEditPage` giống cách đã làm với `SessionCreatePage`.
- **Không được làm:** đổi vite config, lazy trang khác, sửa nội dung `SessionEditPage`.
- **Nghiệm thu:** dán danh sách chunk trước và sau; `index-*.js` giảm rõ rệt; `build`, `test` xanh.
- **Phối hợp:** `AppRoutes.tsx` dùng chung với xuanmanhneee (luật 0.2 mục 13).
- **Commit gợi ý:** `perf(admin): lazy load SessionEditPage để tách Leaflet khỏi entry`

### P04-07.6 — Dọn code chết
- **Trạng thái:** ĐÃ XONG · **Chế độ:** CHẠY THẲNG · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · file đã sửa: `useAttendanceSessions.ts`, `units.api.ts`, `attendance-session.ts`, `session-form.ts`
- **Đối chiếu 06/11:** cả 4 mục có vẻ còn: `useAttendanceSessions.ts:46,163,172,183,204,205` (`isCreating`, `createSession`); `sessions.form.close` ở `vi.ts:239`, `en.ts:240`; `units.api.ts:69` (`getById`); comment "modal" chưa kiểm tra. Vẫn phải grep lại, kể cả key gọi bằng chuỗi ghép, vì main có thể đã dùng.
- **Đọc trước:** grep từng mục: `createSession` / `isCreating` trong `useAttendanceSessions`; `sessions.form.close`; `unitsApi.getById`; comment nhắc "modal".
- **Việc cần làm:** chỉ xoá mục nào grep xác nhận không còn nơi dùng. Mục còn dùng thì giữ và báo lại. Xoá key i18n ở CẢ vi và en.
- **Không được làm:** xoá thứ ngoài 4 mục này; xoá `SessionFormLocationCard` hay file khác.
- **Nghiệm thu:** `build`, `test` xanh; liệt kê mục đã xoá và mục giữ lại kèm lý do.
- **Commit gợi ý:** `chore(admin): dọn code chết (createSession, key i18n, unitsApi.getById)`

### P04-07.7 — Script lint và typecheck
- **Trạng thái:** ĐÃ XONG · **Chế độ:** CHẠY THẲNG · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · file đã sửa: `package.json`
- **Đọc trước:** `package.json` của admin; tìm cấu hình eslint và các `tsconfig*.json`.
- **Việc cần làm:** thêm script `typecheck` (`tsc --noEmit` theo tsconfig có sẵn) và `lint` (chỉ khi đã có cấu hình eslint). Chạy thử và dán kết quả.
- **Không được làm:** cài dependency, tạo cấu hình eslint mới, sửa hàng loạt lỗi (chỉ báo số lượng).
- **Nghiệm thu:** script chạy được; nếu có lỗi sẵn thì liệt kê, không sửa.
- **Commit gợi ý:** `chore(admin): thêm script typecheck và lint`

### P04-07.8 — Cập nhật tài liệu và chốt task
- **Trạng thái:** ĐÃ XONG · **Chế độ:** CHẠY THẲNG · **Xong:** [x]
- Bằng chứng: 07/11 · build xanh · test xanh (120 test) · typecheck xanh · file đã sửa: `ARCHITECTURE.md`, `PLAN.md`, `PROJECT_CONTEXT.md`
- **Việc cần làm (chỉ sửa tài liệu):**
  1. `ARCHITECTURE.md` (mục 5 và 8, kể cả các dòng nhắc `isKnownPath` / `isPathAllowedForRole`, P1.2, P1.3, P1.4, code chết): ghi menu và route đã khớp (admin có `/sessions`), hai hàm chết đã xoá, `LoginPage` đã dùng token và i18n và không còn Google/DLU, có `ErrorBoundary` bọc `<Outlet />` trong `DashboardLayout`, `SessionCreatePage` và `SessionEditPage` lazy load (Leaflet tách thành chunk riêng), `createSession`/`isCreating`/`unitsApi.getById` đã xoá, script `typecheck` và `lint` đã có, `lint` hiện còn 6 vấn đề (4 lỗi, 2 cảnh báo) ở file của người khác.
  2. `ARCHITECTURE.md` và `PROJECT_CONTEXT.md` của admin: sửa chỗ ghi `sessions.form.close` là code chết thành "đang dùng (aria-label nút đóng bản đồ trong `SessionLocationPickerModal`)".
  3. `PROJECT_CONTEXT.md` của admin (mục nợ kỹ thuật P1.2, P1.3, P1.4, P3): đánh dấu các mục đã xong.
  4. `PLAN.md`: thêm mục "Đã xong P04-07" liệt kê các thẻ .1 đến .7 và quyết định đã chốt (bỏ Google, bỏ nhận diện trường, xanh như dashboard).
  5. Chạy `build`, `test` và `typecheck` toàn bộ; ghi kết quả vào bằng chứng; tick task 1 trong bảng Tổng quan.
  6. Ghi vào mục "Phát hiện thêm" của `PLAN.md`: `applySessionCreated` thành hàm chết (còn test); `SessionLocationMap.tsx`, `SessionFormLocationCard.tsx` là file chết; nhãn `sessions.form.close` cần đổi thành "Đóng bản đồ"; `PrimaryButton` tương phản thấp ở dark mode; 6 lỗi lint sẵn có.
- **Không được làm:** sửa code (`src/`), sửa `package.json`, xoá file chết.
- **Nghiệm thu:** `build`, `test`, `typecheck` xanh; `git --no-pager diff --stat` chỉ gồm các file `.md` và `TASKS.md`; tài liệu không còn mô tả code chết đã xoá.
- **Commit gợi ý:** `docs(admin): cập nhật ARCHITECTURE, PLAN và PROJECT_CONTEXT sau P04-07`
---

## 2. P04-01 — Hoàn thiện wizard tạo phiên
Nghiệm thu cả task: build/test xanh; tạo phiên bằng bản đồ và nhập tay đều đúng toạ độ, giờ, criteria ở API; Back/refresh có hành vi được ghi rõ. **Tiếp tục từ code hiện có, không viết lại.**

**Đối chiếu 06/11:** main (`61947aa`, `77e238a`) đã thêm vào `session-form.ts` (+51 dòng) và test (+29), `SessionCreatePage.tsx` (+14, gắn page action bar). Kết quả Kilo: validation, `isCloseAfterOpen`, geolocation, chặn gửi lặp bằng `isSubmitting`, map lỗi API đều ĐÃ CÓ. Các thẻ dưới đây chỉ là RÀ VÀ BÙ phần thiếu, không viết lại.

Tên file liên quan (theo tài liệu, xác nhận bằng `find`): `SessionCreatePage.tsx`, `SessionLocationFields.tsx`, `session-form.ts`, `ParticipantCriteriaEditor`, `SessionLocationPickerModal`, `PanelFooter`.

#### Gợi ý triển khai P04-01 (không ràng buộc, phải xác minh với code)
- **Thứ tự:** .1 → .2 → .3 → .5 → .6 → .4 → .7 → .8. Làm .4 (chỉ ghi tài liệu) sau khi hành vi đã ổn định.
- **Validation (.1):** viết hàm thuần trả về `null` nếu hợp lệ hoặc key lỗi i18n nếu sai (không throw). Ô nhập số dùng buffer text nên giá trị có thể là chuỗi rỗng.
- **Bẫy `Number('')`:** `Number('')` bằng `0`, nên chuỗi rỗng dễ bị coi là toạ độ hoặc bán kính 0 hợp lệ. Kiểm tra `trim() !== ''` rồi mới `Number(...)` và `Number.isFinite(...)`.
- **Giờ (.2):** ô `datetime-local` cho chuỗi dạng `YYYY-MM-DDTHH:mm` KHÔNG có múi giờ; `new Date(chuỗi)` hiểu là giờ máy, `.toISOString()` ra UTC. Test không nên phụ thuộc múi giờ máy: tạo ngày mong đợi bằng `new Date(năm, tháng, ngày, giờ, phút)` thay vì chuỗi UTC cứng.
- **So sánh giờ (.2):** so sánh bằng `getTime()` sau khi parse, không so sánh chuỗi.
- **Gửi lặp (.3):** nút submit nằm ngoài form (`form="create-session-form"`) vẫn kích hoạt sự kiện submit của form, nên chặn bằng cờ trong hàm submit (một `ref` hoặc `formState.isSubmitting`). Chỉ disable nút thì chưa đủ nếu hai lần bấm rơi vào cùng một tick.
- **Lỗi geolocation (.3):** `GeolocationPositionError.code`: 1 từ chối quyền, 2 không có vị trí, 3 hết thời gian. Mỗi loại một key i18n.
- **Preview (.5):** tạo MỘT hàm dựng dữ liệu (kiểu `buildCreatePayload(values)`) dùng cho cả preview lẫn gửi API, để hai thứ không lệch nhau.
- **Back/refresh (.4):** `PLAN.md` ghi bước lưu bằng `useState`, nhiều khả năng refresh sẽ mất dữ liệu; nhưng chỉ ghi điều xác nhận được trong code hiện tại.
- **Test (.7):** với `parseParticipantCodes`, các ca nên thử: chuỗi rỗng, nhiều khoảng trắng liên tiếp, xuống dòng lẫn dấu phẩy, dấu `;`, mã trùng nhau.
- **Bẫy hay gặp:** sửa thông điệp lỗi hiện có làm hỏng test cũ; đổi cách `NumberInput` giữ text làm mất khả năng gõ số thập phân.

### P04-01.1 — Validation toạ độ và bán kính
- **Trạng thái:** SẴN SÀNG (chỉ bù) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** đã có `validateRange` (`session-form.ts:118-174`), lat/lng/radius, NaN. Còn thiếu: test biên (lat 90/-90/90.0001, lng 180/-180/180.0001, radius âm, chuỗi rỗng); radius không có trần (`Number.MAX_SAFE_INTEGER`), chưa đối chiếu DTO server. Chỉ bổ sung test và đối chiếu DTO, không viết lại hàm.
- **Đọc trước:** `session-form.ts` và test của nó; `SessionLocationFields.tsx`; DTO tạo phiên ở `server/` (CHỈ ĐỌC; tìm bằng grep trong thư mục attendance-sessions, đừng đoán tên); type request trong `packages/shared` (chỉ đọc).
- **Việc cần làm:**
  1. Báo cáo rule hiện có cho lat, lng, radius dưới dạng bảng.
  2. So với DTO server: rule nào server có mà form thiếu.
  3. Chỉ thêm rule còn thiếu. Lat trong [-90, 90], lng trong [-180, 180], radius phải là số hữu hạn và lớn hơn 0. Nếu muốn đặt radius tối đa mà server không quy định thì KHÔNG tự đặt, hãy hỏi tôi.
  4. Validate là hàm thuần có test.
- **Không được làm:** đổi layout, đổi thông điệp lỗi hiện có, đổi cách `NumberInput` giữ text trong lúc gõ.
- **Nghiệm thu:** test mới phủ biên: lat 90 / -90 / 90.0001, lng 180 / -180 / 180.0001, radius 0 / âm / NaN / chuỗi rỗng; `build`, `test` xanh.
- **Commit gợi ý:** `fix(admin): bổ sung validation toạ độ và bán kính khi tạo phiên`

### P04-01.2 — Giờ, timezone và closeAt > openAt
- **Trạng thái:** SẴN SÀNG (chỉ bù) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** đã có `combineLocalDateTime`, `isCloseAfterOpen` và test (`session-form.ts:106-116,176-185`). Còn thiếu: báo cáo cách chuyển giờ/múi giờ, xác nhận test không phụ thuộc múi giờ máy (so sánh bằng `Date.parse` trên chuỗi không có múi giờ). Không thêm rule openAt quá khứ nếu server không có.
- **Đọc trước:** nơi chuyển giá trị ô nhập giờ sang chuỗi gửi API (grep `openAt` trong `session-form.ts` và page); DTO server (chỉ đọc) xem định dạng giờ yêu cầu.
- **Việc cần làm:**
  1. Báo cáo cách giờ đang được chuyển đổi (có theo múi giờ máy người dùng không, ISO dạng nào).
  2. Đảm bảo điều kiện `closeAt > openAt` được kiểm tra bằng hàm thuần và hiện lỗi qua `t()`.
  3. Chỉ thêm rule "openAt không được ở quá khứ" nếu server DTO có rule đó. Nếu không thì báo lại, đừng tự thêm.
- **Không được làm:** đổi định dạng ô nhập, thêm thư viện ngày giờ.
- **Nghiệm thu:** test cho hàm chuyển giờ và so sánh giờ, không phụ thuộc múi giờ máy chạy test (nếu không làm được thì nói rõ); `build`, `test` xanh.
- **Commit gợi ý:** `fix(admin): kiểm tra closeAt > openAt và chuẩn hoá chuyển đổi giờ`

### P04-01.3 — Gửi lặp, loading, lỗi API, lỗi geolocation
- **Trạng thái:** SẴN SÀNG (chỉ bù, ưu tiên thấp) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** đã có `isSubmitting` disable (`SessionCreatePage.tsx:613-617`), map lỗi qua `resolveSessionErrorKey` (`:239-250`), geolocation 3 mã (`resolveGeolocationErrorKey`). Còn thiếu: cờ `ref` chặn hai lần submit cùng tick. Thử tay bấm nhanh hai lần; nếu chỉ một request được gửi thì ghi nhận và bỏ qua thẻ này.
- **Đọc trước:** `SessionCreatePage.tsx` (nút submit nằm trong `PanelFooter` ngoài form, gắn qua `form="create-session-form"`); `SessionLocationFields.tsx` (nút "Lấy vị trí hiện tại"); cách trang khác map `ApiError.code` sang key.
- **Việc cần làm:**
  1. Nút gửi bị disable và hiện loading trong lúc đang gửi; gửi lần hai không tạo yêu cầu thứ hai.
  2. Lỗi API map theo `ApiError.code` sang key i18n, hiển thị rõ; không báo thành công khi API lỗi.
  3. Lỗi geolocation (từ chối quyền, không có vị trí, hết thời gian) có thông báo riêng qua `t()`.
- **Không được làm:** thêm tự xin GPS khi mở trang (đã bỏ có chủ đích); render `Error.message`.
- **Nghiệm thu:** liệt kê từng code lỗi đã map và key tương ứng; vi/en đủ key; `build`, `test` xanh; nêu cách tự kiểm tra tay (bấm gửi hai lần nhanh, tắt mạng, từ chối quyền vị trí).
- **Commit gợi ý:** `fix(admin): chặn gửi lặp và hiển thị lỗi API/geolocation khi tạo phiên`

### P04-01.4 — Ghi hành vi Back/refresh
- **Trạng thái:** SẴN SÀNG (chưa có mục trong `PLAN.md`) · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Đọc trước:** `SessionCreatePage.tsx` (nơi giữ bước hiện tại và dữ liệu form); `client/admin-dashboard/PLAN.md`.
- **Việc cần làm:** chỉ ĐỌC code và ghi vào `PLAN.md` mục "Hành vi Back/refresh của wizard": bấm Quay lại giữa bước 1 và 2 thì dữ liệu còn hay mất, refresh trang thì sao, nút Back của trình duyệt thì sao. Chỉ ghi điều thấy trong code, kèm `file:dòng`.
- **Không được làm:** sửa code. Thấy hành vi chưa hợp lý thì ghi vào "Đề xuất", không tự đổi.
- **Nghiệm thu:** `PLAN.md` có mục mới; `git diff --stat` chỉ có `PLAN.md`.
- **Commit gợi ý:** `docs(admin): ghi hành vi Back/refresh của wizard tạo phiên`

### P04-01.5 — Preview giá trị cuối trước khi gửi
- **Trạng thái:** SẴN SÀNG (chưa làm) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** payload đã dựng bằng `buildCreateSessionRequest(values)` (`SessionCreatePage.tsx:240`) nhưng bước 2 chưa có khu vực xem lại. Tái dùng chính hàm đó cho preview. File này `77e238a` vừa sửa 14 dòng: mở lại bản trên đĩa.
- **Đọc trước:** `SessionCreatePage.tsx` (cột tóm tắt dùng `useWatch`); hàm dựng payload gửi API (grep).
- **Việc cần làm:** ở bước 2 (trước khi gửi) hiển thị bản xem lại gồm tên, toạ độ, bán kính, `openAt`/`closeAt` (kèm múi giờ) và số tiêu chí đã chọn. Preview và payload PHẢI dùng chung một hàm dựng dữ liệu để không lệch nhau.
- **Không được làm:** thêm gọi API preview roster (endpoint `test-filter` chưa đủ dữ liệu, thuộc task khác).
- **Nghiệm thu:** nêu rõ hàm dùng chung; test cho hàm đó (nếu là logic thuần); `build`, `test` xanh.
- **Commit gợi ý:** `feat(admin): xem lại thông tin phiên trước khi gửi`

### P04-01.6 — Giữ map kéo điểm và nhập toạ độ bàn phím (kiểm tra hồi quy)
- **Trạng thái:** SẴN SÀNG · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Đọc trước:** `SessionLocationFields.tsx`, `SessionLocationPickerModal`; chỗ tính `canOpenMap`.
- **Việc cần làm:** đọc code và xác nhận: (1) có kéo điểm trên bản đồ cập nhật lat/lng; (2) gõ toạ độ bằng bàn phím cập nhật bản đồ; (3) map chỉ mở khi lat/lng/radius hợp lệ. Viết danh sách bước kiểm tra tay cho tôi. CHỈ sửa nếu phát hiện lỗi rõ ràng và sửa dưới 10 dòng; còn lại chỉ báo cáo.
- **Không được làm:** viết lại component, đổi thư viện bản đồ.
- **Nghiệm thu:** báo cáo xác nhận ba điểm trên kèm `file:dòng`; `build`, `test` xanh.
- **Commit gợi ý:** (không cần nếu không sửa gì)

### P04-01.7 — Bổ sung test cho session-form.ts
- **Trạng thái:** SẴN SÀNG (chỉ bù) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** đã có test cho `isCloseAfterOpen`, `parseParticipantCodes`, `validateSessionForm`, `buildCreateSessionRequest`, `buildUpdateSessionRequest`, `createDefaultSessionFormValues`, `resolveGeolocationErrorKey`, `combineLocalDateTime`. Số test hiện tại: 120. Còn thiếu: `parseParticipantCodes` với chuỗi rỗng; liệt kê hàm export chưa có test (`snapRadius`, ...).
- **Đọc trước:** `session-form.ts` và file test hiện có; `parseParticipantCodes`.
- **Việc cần làm:** liệt kê hàm nào chưa có test, rồi thêm test cho các hàm đó. `parseParticipantCodes` tách theo `[,;\s]+` (dấu phẩy, chấm phẩy, khoảng trắng, xuống dòng): test hành vi HIỆN TẠI. Gặp hành vi lạ (ví dụ trùng mã) thì báo lại, đừng sửa code để khớp suy đoán của mình.
- **Không được làm:** sửa code sản phẩm; xoá test cũ.
- **Nghiệm thu:** số test tăng, nêu số trước và sau; `test` xanh.
- **Commit gợi ý:** `test(admin): bổ sung test cho session-form`

### P04-01.8 — Chốt task
- **Trạng thái:** SẴN SÀNG (sau .1 đến .7) · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** chạy `build` + `test`; tick task 2 trong bảng tổng quan kèm output. Không sửa code.
- **Nghiệm thu:** `build`, `test` xanh.

---

## 3. P04-03 — Sửa/huỷ phiên
Nghiệm thu cả task: UI và server đều từ chối thao tác không hợp lệ; phiên đã huỷ không hiện như đang mở; API lỗi không báo thành công giả.

**Đối chiếu 06/11:** xuanmanhneee đã làm `SessionEditPage.tsx` (route `/sessions/:id/edit` bọc `RoleGuard` chỉ organizer, khoá field khi phiên đang mở, chặn phiên `closed`/`cancelled`, `buildUpdateSessionRequest`, toast sau API, map lỗi). Thẻ .1 coi như xong. Chưa có: hàm thuần 5 trạng thái có test, cảnh báo huỷ phiên đang mở, xử lý xung đột, thông báo "không có thay đổi". Trang sửa HIỆN KHÔNG có ô sửa criteria (chỉ ghi chú `sessions.edit.participantsUnchanged`). `SessionEditPage.tsx` thuộc người khác: sửa đúng phạm vi thẻ (luật 0.2 mục 13).

Sự thật về server (từ PROJECT_CONTEXT, AI phải xác minh lại ở code server trước khi dựa vào): phiên đang mở chỉ sửa được `closeAt`; phiên đã kết thúc thì server trả 409; criteria bị khoá sau khi roster đến hạn khởi tạo (`openAt` trừ 5 phút); huỷ phiên đang mở sẽ xoá buffer bản ghi điểm danh; `GET :id` của organizer chỉ xem được phiên của mình (403 `ATTENDANCE_SESSION_FORBIDDEN`). Hiện nút sửa trong `SessionCard` trỏ tới `/sessions/:id/edit` nhưng chưa có route.

#### Gợi ý triển khai P04-03 (không ràng buộc, phải xác minh với code)
- **Thứ tự:** .1 → .2 → .3 → .4 → .5 → .6 → .7. Thẻ .2 (hàm thuần) làm trước form để form chỉ việc dùng kết quả.
- **Bảng hành vi (theo PROJECT_CONTEXT, xác minh lại ở service update của server):**

| Phiên | Cho sửa | Giao diện |
|---|---|---|
| Chưa mở, trước mốc roster (`openAt` trừ 5 phút) | Field server cho phép, gồm cả criteria | Form đầy đủ |
| Chưa mở, đã qua mốc roster | Như trên, trừ criteria | Criteria khoá, có lời giải thích |
| Đang mở | Chỉ `closeAt` | Các field khác khoá |
| Đã kết thúc | Không | Chỉ đọc, không có nút lưu |
| Đã huỷ | Không | Hiện rõ "đã huỷ", chỉ đọc |

- **Hàm thuần (.2):** nhận `now` làm tham số (không gọi `new Date()` bên trong) để test được. Test dạng bảng, mỗi dòng một trạng thái, gồm cả hai mép của mốc roster (ví dụ `openAt` trừ 6 phút và trừ 4 phút).
- **Hằng số 5 phút:** tìm hằng số tương ứng ở server (grep) và ghi chú nguồn trong comment; không tự suy ra con số.
- **Route (.1):** `useParams` trả `string | undefined`, xử lý trường hợp thiếu `id`. Người dùng gõ tay URL của phiên đã đóng hoặc đã huỷ vẫn phải thấy trang chỉ đọc, không phải form (server cũng từ chối, nhưng UI không nên mời họ sửa).
- **Payload (.3):** chỉ gửi field được phép sửa; so với giá trị ban đầu, nếu không đổi gì thì không gọi API và báo "không có thay đổi".
- **Lỗi (.3, .6):** map theo `ApiError.code`, không dựa vào mã HTTP. Server trả 409 cho phiên đã kết thúc; kiểm tra danh sách code trong `packages/shared` (chỉ đọc).
- **Huỷ (.4):** dùng lại hook hoặc hàm huỷ đang có ở danh sách phiên; chỉ thêm hộp xác nhận. Nội dung cảnh báo chỉ nói "dữ liệu điểm danh sẽ mất" khi server xác nhận đúng như vậy.
- **Làm mới (.5):** `api/http.ts` xoá cache GET sau mutation, nhưng state trong hook vẫn giữ dữ liệu cũ cho tới khi gọi tải lại. Sau khi lưu thành công: gọi tải lại hoặc điều hướng về danh sách (trang này tải mới khi mount).
- **Bẫy hay gặp:** gửi cả field đang bị khoá lên server; báo "Đã lưu" trước khi API trả về; quên `en.ts`.

### P04-03.1 — Route và trang khung
- **Trạng thái:** ĐÃ CÓ (xuanmanhneee, `61947aa`) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [x]
- Bằng chứng: 06/11 · `AppRoutes.tsx:86-102`, `SessionEditPage.tsx:124-153,266-305` · build xanh · test xanh (120 test). Tồn đọng chuyển sang .2: (a) guard chỉ `organizer`, chưa xác minh server cho `admin` update không; (b) lỗi tải detail hiển thị cố định `sessionDetail.loadError`, chưa phân biệt 403.
- **Đọc trước:** `AppRoutes.tsx` (cách khai báo route và `RoleGuard`); `grep -rn "attendanceSessionEdit"`; `SessionCard` (nút sửa); hook `useAttendanceSessionDetail`; controller attendance-sessions ở `server/` (CHỈ ĐỌC: role nào được gọi update).
- **Việc cần làm:**
  1. Thêm route `/sessions/:id/edit` đặt đúng chỗ so với `/sessions/:id` và `/sessions/new`, guard role đúng với role mà server cho phép update (không rõ thì hỏi).
  2. Trang khung: tải detail bằng hook có sẵn; hiển thị loading, lỗi (map `ApiError.code`, có trường hợp 403), và tên phiên ở dạng chỉ đọc. CHƯA có form.
- **Không được làm:** viết form, gọi API update, đổi `SessionCard`.
- **Nghiệm thu:** `build`, `test` xanh; mở `/sessions/<id>/edit` không còn rơi vào NotFound; `grep attendanceSessionEdit` khớp route mới.
- **Commit gợi ý:** `feat(admin): thêm route /sessions/:id/edit và trang khung`

### P04-03.2 — Hàm thuần xác định field được sửa
- **Trạng thái:** CẦN QUYẾT ĐỊNH · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** chưa có hàm thuần; `SessionEditPage` đang tự tính `isOpen`. Cần tôi quyết: có thêm ô sửa criteria vào trang sửa không? Có thì hàm cần mốc roster (`ROSTER_INIT_BUFFER_MS` = 5 phút ở `attendance-sessions.service.ts:37`, `isRosterInitDue`); không thì hàm chỉ cần theo trạng thái và thẻ thu nhỏ. Cũng đọc: server cho role nào gọi update (để chốt guard admin).
- **Đọc trước:** service `update` của attendance-sessions ở `server/` (CHỈ ĐỌC; lấy chính xác quy tắc theo trạng thái và thời điểm); kiểu `AttendanceSession` và detail ở client (`plannedParticipants !== null` nghĩa là roster chưa khởi tạo, xác nhận lại bằng code).
- **Việc cần làm:** tạo hàm thuần trong `utils/` (ví dụ nhận session và `now`, trả về field nào sửa được) kèm test dạng bảng: pending trước giờ roster, pending sau giờ roster, open, closed, cancelled. Quy tắc phải khớp server; chỗ nào server không rõ thì hỏi.
- **Không được làm:** làm UI; tự suy ra quy tắc không thấy trong code server.
- **Nghiệm thu:** test phủ cả 5 trạng thái; `test` xanh.
- **Commit gợi ý:** `feat(admin): hàm xác định field được sửa theo trạng thái phiên`

### P04-03.3 — Form sửa và gọi API update
- **Trạng thái:** CHỈ BÙ (sau .2) · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** form, khoá field, `isDirty`/`isSubmitting`, map lỗi, toast sau API đã có (`SessionEditPage.tsx:203-243,468-477`). Còn thiếu: khi payload rỗng hàm `return` im lặng (`:226`), cần báo "không có thay đổi"; phần khoá criteria chỉ làm nếu .2 quyết có ô criteria.
- **Đọc trước:** API `update` và `getCriteria` ở client `api/`; DTO update ở server (chỉ đọc; update toàn phần hay một phần?); `session-form.ts`, `SessionLocationFields`, `ParticipantCriteriaEditor` để dùng lại.
- **Việc cần làm:** form sửa dùng lại component và validate sẵn có; field bị khoá (theo hàm ở .2) hiển thị disabled kèm giải thích; nút lưu chặn gửi lặp; lỗi map theo `ApiError.code`; thành công chỉ báo khi API thật sự thành công.
- **Không được làm:** gửi field bị khoá lên server; viết lại validate; render `Error.message`.
- **Nghiệm thu:** nêu payload thực tế gửi đi cho 2 trường hợp (phiên pending, phiên open); `build`, `test` xanh; vi/en đủ key.
- **Commit gợi ý:** `feat(admin): form sửa phiên điểm danh`

### P04-03.4 — Huỷ phiên có cảnh báo tác động
- **Trạng thái:** SẴN SÀNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đối chiếu 06/11:** huỷ chỉ thấy ở `SessionsPage.tsx:41-52` với `window.confirm(t('sessions.card.cancelConfirm'))`, một câu chung cho mọi trạng thái. Kilo CHƯA kiểm tra `SessionDetailPage.tsx` (main sửa 223 dòng): grep `cancel` trên toàn `src` trước khi sửa để khỏi làm trùng.
- **Đọc trước:** nơi gọi `cancel` hiện có (danh sách phiên, grep); service `cancel` ở server (chỉ đọc, xác nhận tác động lên phiên đang mở).
- **Việc cần làm:** dùng lại API cancel. Hộp xác nhận có nội dung khác nhau theo trạng thái: phiên đang mở thì cảnh báo rõ dữ liệu điểm danh đã ghi sẽ mất (chỉ viết nếu server xác nhận đúng như vậy), phiên chưa mở thì cảnh báo nhẹ. Chặn bấm lặp.
- **Không được làm:** thêm API mới; huỷ không qua xác nhận.
- **Nghiệm thu:** `build`, `test` xanh; vi/en đủ key; nêu `file:dòng` ở server làm căn cứ cho nội dung cảnh báo.
- **Commit gợi ý:** `feat(admin): xác nhận huỷ phiên kèm cảnh báo tác động`

### P04-03.5 — Làm mới danh sách và chi tiết sau sửa/huỷ
- **Trạng thái:** GỘP VÀO .4 (kiểm lại sau khi .4 xong) · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Đối chiếu 06/11:** sửa xong thì `navigate(buildSessionDetailPath(...))` (detail tải lại khi mount); huỷ ở `SessionsPage` gọi `refreshSessions()`. Chưa có bằng chứng `cancelled` hiển thị đúng; chỉ kiểm tra lại sau .4.
- **Đọc trước:** `api/http.ts` (cache GET xoá sau mọi mutation, xác nhận); `useAttendanceSessions`, `useAttendanceSessionDetail`.
- **Việc cần làm:** sau sửa hoặc huỷ thành công, danh sách và chi tiết hiển thị dữ liệu mới (không dính cache cũ); phiên `cancelled` hiển thị là đã huỷ, không như đang mở.
- **Không được làm:** thêm thư viện state hoặc cache.
- **Nghiệm thu:** nêu cơ chế làm mới đang dùng với `file:dòng`; `build`, `test` xanh; cách tự kiểm tra tay.
- **Commit gợi ý:** `fix(admin): làm mới danh sách và chi tiết sau khi sửa/huỷ phiên`

### P04-03.6 — Xung đột khi hai người sửa cùng lúc
- **Trạng thái:** CẦN QUYẾT ĐỊNH · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC (cần tôi quyết) · **Xong:** [ ]
- **Đối chiếu 06/11:** `session-errors.ts` map `CommonErrorCode.CONFLICT` sang `sessions.error.conflict` chung; không gửi version, không có nút tải lại. Chưa xác minh server có cơ chế version (Kilo chưa báo bằng chứng).
- **Đọc trước:** service và DTO update ở server (có `updatedAt` / version kiểm tra không); danh sách error code liên quan trong `packages/shared` (grep `ATTENDANCE_SESSION`).
- **Việc cần làm:** báo cáo server có cơ chế phát hiện xung đột hay không. Nếu có (version/409): map code sang thông báo và nút "Tải lại dữ liệu mới". Nếu KHÔNG có: DỪNG, đề xuất phương án (ví dụ tải lại detail ngay trước khi gửi và so sánh), đợi tôi chọn. Không tự phát minh cơ chế mà server không hỗ trợ.
- **Không được làm:** sửa server.
- **Nghiệm thu:** báo cáo nêu rõ có/không; nếu có làm thì `build`, `test` xanh, vi/en đủ key.
- **Commit gợi ý:** `fix(admin): xử lý xung đột khi sửa phiên đồng thời`

### P04-03.7 — Kiểm tra i18n và chốt task
- **Trạng thái:** SẴN SÀNG (sau .1 đến .6) · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** đối chiếu key mới của task giữa `vi.ts` và `en.ts` (kiểu TS đã buộc đủ key chưa? đọc `en.ts` để biết); grep chuỗi tiếng Việt hard-code trong các file mới; chạy `build` + `test`; tick task 3 trong bảng tổng quan kèm output.
- **Không được làm:** sửa logic.
- **Nghiệm thu:** `build`, `test` xanh; liệt kê key mới và xác nhận có ở cả hai file.

---

## 4. P07-03 — Test UI theo rủi ro
Nghiệm thu cả task: lỗi từng gây thành công giả, lộ menu, gửi lặp hoặc sai giờ có test tái hiện; chạy được trong CI.

### P07-03.1 — Chọn cách test
- **Trạng thái:** CHỜ QUYẾT ĐỊNH (người điền, AI không được tự chọn) · **Chế độ:** CHẠY THẲNG sau khi điền · **Xong:** [ ]
- **Lựa chọn:**
  - A. Chỉ `node:test` cho logic thuần (đang dùng, không thêm dependency).
  - B. Component test (cần thêm thư viện test, ví dụ Vitest + Testing Library).
  - C. E2E (ví dụ Playwright, nặng hơn, cần môi trường chạy).
- **Quyết định của tôi:** `____` (điền A, B hoặc C và lý do)
- **Việc cần làm (sau khi điền):** ghi quyết định và lý do vào `PLAN.md`. Chỉ cài thư viện nếu quyết định là B hoặc C VÀ tôi cho phép rõ trong chat.
- **Nghiệm thu:** `PLAN.md` có mục quyết định.

### P07-03.2 đến P07-03.5 — Các test theo rủi ro
- **Trạng thái:** CHỜ P07-03.1 · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ] (mỗi thẻ một ô: .2 [ ] .3 [ ] .4 [ ] .5 [ ])
- **Đọc trước:** theo cách test đã chọn ở .1; code đối tượng test.
- **Việc cần làm (mỗi thẻ làm một mục):**
  - .2 Wizard bước 1 và 2; nút gửi bị disable khi cần.
  - .3 Menu hiển thị đúng theo role (admin, organizer).
  - .4 Luồng login và tự refresh token khi gặp 401 (single-flight, thất bại thì phát `auth:expired`).
  - .5 Không báo "thành công giả" khi API lỗi.
- **Không được làm:** test chi tiết hiện thực (class CSS, cấu trúc DOM); sửa code sản phẩm để test qua.
- **Nghiệm thu:** test mới đỏ khi cố ý phá hành vi tương ứng (nêu cách đã thử), xanh khi bình thường; `test` xanh; chạy được bằng lệnh duy nhất ở 0.4.

---

## 5. P07-07 — Rà bảo mật phía dashboard
Nghiệm thu cả task: không có credential/demo secret trong artifact; vấn đề nghiêm trọng được xử lý hoặc có quyết định chấp nhận rủi ro; build lặp lại từ lockfile. Các thẻ rà soát (.1, .2, .4, .5, .6) chỉ ĐỌC và ghi báo cáo vào `client/admin-dashboard/SECURITY-REVIEW.md` (tạo mới nếu chưa có, mỗi thẻ thêm một mục).

#### Gợi ý triển khai P07-07 (không ràng buộc, phải xác minh với code)
- **Cách ghi báo cáo:** mỗi phát hiện gồm: mô tả ngắn, `file:dòng`, mức độ (cao/trung bình/thấp), đề xuất. Không in bí mật, token hay giá trị biến môi trường vào báo cáo.
- **Token (.1):** xem cả hai nơi lưu (`localStorage`, `sessionStorage`) và nơi xoá khi đăng xuất. Rủi ro cốt lõi: script chạy được trên trang (XSS) đọc được `localStorage`, còn `sessionStorage` chỉ sống trong một tab.
- **VITE_* (.2):** mọi biến `VITE_*` đều bị nhúng thẳng vào bundle gửi cho trình duyệt, nên bí mật không bao giờ được đặt ở đó. Kiểm tra cả `.env`, `.env.example` và file cấu hình Vite.
- **Thư viện thừa (.3):** grep thêm dạng import động (`import('xlsx')`) và `require`. `xlsx` có thể cần lại cho task xuất file P04-06, nên hỏi người trước khi gỡ.
- **Audit (.6):** `pnpm audit --prod` giảm nhiễu từ thư viện chỉ dùng khi phát triển. Chạy không được vì mạng thì ghi rõ, đừng suy đoán kết quả.
- **CSP (.5):** liệt kê nguồn thực tế dashboard cần: API origin, tile bản đồ của Leaflet, font, ảnh. CSP mẫu chỉ là đề xuất cho nhóm backend, chưa kiểm thử, và Vite ở chế độ dev có thể cần nới lỏng.

### P07-07.1 — Token lưu ở đâu
- **Trạng thái:** SẴN SÀNG · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Đọc trước:** `tokenService`; `api/http.ts`.
- **Việc cần làm:** ghi lại token nào lưu ở `localStorage` / `sessionStorage` / bộ nhớ, theo từng trường hợp `rememberMe`; mô tả rủi ro nếu có XSS; liệt kê nơi đọc/ghi token (`file:dòng`).
- **Không được làm:** sửa code.
- **Nghiệm thu:** mục mới trong `SECURITY-REVIEW.md`.

### P07-07.2 — Biến VITE_*
- **Trạng thái:** SẴN SÀNG · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** `grep -rn "VITE_" client/admin-dashboard` (gồm `.env*`, `vite.config`); với mỗi biến nêu mục đích và có phải bí mật không. Bí mật thật (khoá, mật khẩu) thì ghi mức nghiêm trọng cao.
- **Không được làm:** in giá trị bí mật ra báo cáo; chỉ ghi tên biến.
- **Nghiệm thu:** mục mới trong `SECURITY-REVIEW.md`.

### P07-07.3 — Thư viện thừa xlsx và axios
- **Trạng thái:** SẴN SÀNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đọc trước:** `package.json` admin; `grep -rn "from 'xlsx'\|from 'axios'\|require('xlsx')\|require('axios')" client/admin-dashboard/src`.
- **Việc cần làm:** báo cáo thư viện nào không có nơi dùng. Sau khi tôi OK mới gỡ bằng `pnpm --filter @gps-attendance/admin-dashboard remove <tên>`. **Thẻ này ĐƯỢC PHÉP đổi `package.json` và `pnpm-lock.yaml`**, nhưng chỉ cho thư viện đã xác nhận không dùng. Lưu ý `xlsx` có thể cần cho task xuất file P04-06, nhắc tôi trước khi gỡ.
- **Nghiệm thu:** `build`, `test` xanh; `git diff --stat` chỉ gồm `package.json` và lockfile.
- **Commit gợi ý:** `chore(admin): gỡ dependency không dùng`

### P07-07.4 — Rà console.* và log
- **Trạng thái:** SẴN SÀNG · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** `grep -rn "console\." client/admin-dashboard/src`; với mỗi chỗ nói có thể lộ vị trí, token, thiết bị hay không. Chỉ báo cáo.
- **Không được làm:** xoá hàng loạt; sửa code.
- **Nghiệm thu:** mục mới trong `SECURITY-REVIEW.md` với danh sách `file:dòng`.

### P07-07.5 — Đề xuất CSP và CORS cho backend
- **Trạng thái:** SẴN SÀNG · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Đọc trước:** `index.html`; `vite.config`; nơi dashboard gọi API và tải tài nguyên ngoài (tile bản đồ Leaflet, font).
- **Việc cần làm:** liệt kê các nguồn dashboard thực sự cần (API origin, tile bản đồ, font...) rồi đề xuất mẫu CSP và danh sách origin CORS cho nhóm backend. Ghi rõ đây là đề xuất, chưa kiểm thử. Backend hiện `enableCors()` mở hoàn toàn.
- **Không được làm:** sửa `server/`; thêm thẻ CSP vào `index.html`.
- **Nghiệm thu:** mục mới trong `SECURITY-REVIEW.md`, mỗi nguồn kèm `file:dòng` căn cứ.

### P07-07.6 — pnpm audit
- **Trạng thái:** SẴN SÀNG · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** chạy `pnpm audit` (có thể giới hạn `--filter @gps-attendance/admin-dashboard`), dán output, tóm tắt số lượng theo mức độ. Không chạy được (mạng) thì nói rõ, đừng bịa kết quả.
- **Không được làm:** `pnpm audit --fix`, `pnpm update`.
- **Nghiệm thu:** output dán nguyên văn trong báo cáo.

### P07-07.7 — Tổng hợp báo cáo
- **Trạng thái:** SẴN SÀNG (sau .1 đến .6) · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** thêm phần tóm tắt đầu `SECURITY-REVIEW.md` (tối đa 1 trang): phát hiện chính xếp theo mức độ, quyết định đã/chưa xử lý, việc cần nhóm backend. Tick task 5 kèm bằng chứng.
- **Không được làm:** sửa code.
- **Nghiệm thu:** file đọc được độc lập, mỗi phát hiện có nguồn `file:dòng`.

---

## 6. P03-02 — Đăng xuất thu hồi phiên (phần dashboard)
**CHỜ BACKEND P01-06.** Thẻ chỉ chuyển SẴN SÀNG khi người điền xong hợp đồng dưới đây. AI KHÔNG được tự điền.

```
HỢP ĐỒNG API LOGOUT (người điền)
- Method + path:
- Request (body/header):
- Response (shape):
- Error code:
- Ngày chốt / commit backend:
```

Nghiệm thu cả task: sau logout không refresh được bằng token cũ; dữ liệu tài khoản trước không hiện chớp nhoáng; test cả logout khi offline.

### P03-02.1 — Gọi endpoint thu hồi
- **Trạng thái:** CHỜ HỢP ĐỒNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đọc trước:** hợp đồng ở trên; `tokenService`; `api/http.ts`; nơi gọi logout hiện có (grep `logout`).
- **Việc cần làm:** thêm hàm gọi endpoint theo đúng hợp đồng, gửi refresh token hiện có.
- **Không được làm:** đoán path hoặc body khi hợp đồng còn trống.
- **Nghiệm thu:** `build`, `test` xanh; test cho hàm xử lý kết quả.

### P03-02.2 — Luôn xoá token cục bộ, kể cả khi mạng lỗi
- **Trạng thái:** CHỜ .1 · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Việc cần làm:** token (localStorage và sessionStorage) luôn bị xoá dù API logout lỗi hay offline; trạng thái đăng nhập chuyển sang đã thoát.
- **Nghiệm thu:** test cho cả đường thành công và đường lỗi mạng; `test` xanh.

### P03-02.3 — Xoá cache GET khi đổi tài khoản và thông báo
- **Trạng thái:** CHỜ .1 · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Đọc trước:** cache GET trong `api/http.ts`.
- **Việc cần làm:** xoá cache GET khi logout / đổi tài khoản; hiển thị thông báo phù hợp qua `t()` (vi + en), ví dụ "đã đăng xuất" và khi thu hồi không thành công thì "đã đăng xuất trên máy này".
- **Nghiệm thu:** test cache bị xoá; vi/en đủ key; `build`, `test` xanh.

### P03-02.4 — Test logout offline
- **Trạng thái:** CHỜ .2 · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** test mô phỏng API logout thất bại: token cục bộ vẫn bị xoá, không còn dữ liệu tài khoản cũ.
- **Nghiệm thu:** `test` xanh; tick task 6 kèm output.

---

## 7. P05-02 và P05-05 — `/users` và `/statistics`
**CHỜ BACKEND P05-01 (quản lý user) và P05-04 (thống kê).** Điền hợp đồng trước khi giao Kilo.

```
HỢP ĐỒNG API USERS (người điền): list/filter/phân trang, create, update, khoá. Mỗi endpoint: method + path, request, response, error code.

HỢP ĐỒNG API STATISTICS (người điền): endpoint, tham số lọc (thời gian, đơn vị, organizer), response, có trả thời điểm dữ liệu không.
```

### P05-02.1 — `/users`: bảng, tìm kiếm, lọc, phân trang server
- **Trạng thái:** CHỜ HỢP ĐỒNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đọc trước:** hợp đồng API USERS; trang placeholder `/users`; một trang bảng đã làm thật để theo mẫu (ví dụ `AttendanceRecordsTable`, `useAttendanceSessionDetail`).
- **Việc cần làm:** bảng có tìm kiếm, lọc role/unit/status, phân trang phía server; hook theo mẫu có sẵn (race guard, `toError`, error map).
- **Không được làm:** lọc/phân trang phía client khi hợp đồng nói phía server; đoán shape response.
- **Nghiệm thu:** `build`, `test` xanh; test cho hàm parse response và dựng query.

### P05-02.2 — `/users`: form tạo, sửa, khoá
- **Trạng thái:** CHỜ .1 · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Việc cần làm:** form tạo/sửa dùng `react-hook-form` theo mẫu dự án; khoá tài khoản có hộp xác nhận (hành động nhạy cảm); chặn gửi lặp; lỗi map theo `ApiError.code`.
- **Nghiệm thu:** `build`, `test` xanh; vi/en đủ key.

### P05-02.3 — `/users`: loading, lỗi, rỗng, thử lại
- **Trạng thái:** CHỜ .1 · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** bốn trạng thái hiển thị rõ ràng (theo cách `UnavailableState` / các trang hiện có), nút "Thử lại".
- **Nghiệm thu:** `build`, `test` xanh; vi/en đủ key.

### P05-05.1 — `/statistics`: biểu đồ, bảng, lọc, thời điểm dữ liệu
- **Trạng thái:** CHỜ HỢP ĐỒNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Việc cần làm:** biểu đồ và bảng, lọc theo thời gian/đơn vị/organizer, hiển thị thời điểm dữ liệu. KHÔNG dùng số demo. Thư viện biểu đồ: dùng cái dự án đã có; nếu chưa có thì hỏi tôi, đừng tự cài.
- **Nghiệm thu:** `build`, `test` xanh; `grep` không còn số demo hard-code.

### P05-05.2 — Đồng bộ menu và route
- **Trạng thái:** CHỜ P05-02.1 và P05-05.1 · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** cập nhật `config/navigation.ts` và route cho khớp (ví dụ mở `/statistics` cho admin nếu đã quyết); gỡ placeholder; cập nhật `PROJECT_CONTEXT.md` mục 5. Tick task 7.
- **Nghiệm thu:** `build`, `test` xanh; menu và route khớp nhau (liệt kê bảng role x đường dẫn).

---

## 8. P04-04, P04-05, P04-06 — Kết quả, duyệt, xuất file
**Cập nhật 06/11:** backend duyệt `REVIEW` và audit đã có (`77e238a`). Danh sách phân trang vẫn chưa có (P04-04.1 và P04-06.1 còn chờ). Điền/đối chiếu hợp đồng với `docs/api.md` trước khi giao Kilo.

```
HỢP ĐỒNG API (từ PROJECT_CONTEXT mục 12, CHƯA đối chiếu với docs/api.md; AI phải xác minh ở controller và shared):
- POST /v0/attendance/review-requests (participant): { sessionId, note? } (note <= 300 ký tự)
- GET /v0/attendance/sessions/:sessionId/review-requests (organizer tạo phiên): [{ sessionId, userId, student{code, role, fullname}, reasons[], note? }]
- PATCH /v0/attendance/sessions/:sessionId/review-requests/:userId (organizer tạo phiên): { decision: 'approve' | 'reject', reason? } (reason <= 500 ký tự). approve -> present, reject -> giữ absent; cả hai khoá record và ghi audit.
- Cửa sổ chốt: từ openAt đến closeAt + 10 phút. Dữ liệu review chỉ ở Redis.
- Mã lỗi (AttendanceReviewErrorCode): COOLDOWN, USER_NOT_IN_SESSION, ALREADY_CHECKED_IN, RECORD_LOCKED, NOT_ELIGIBLE, REQUEST_NOT_FOUND, RESOLUTION_WINDOW_CLOSED.
- Chưa có: danh sách bản ghi phân trang, trạng thái nguồn dữ liệu (buffer hay Postgres).
```

### P04-04.1 — Làm mới gần thực và thời điểm tải
- **Trạng thái:** CHỜ HỢP ĐỒNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Đọc trước:** `AttendanceRecordsPage`, `useAttendanceSessionDetail`, `request-scope` / `load-tracker`.
- **Việc cần làm:** nút làm mới thủ công; polling nhẹ chỉ cho phiên đang mở và dừng khi tab ẩn (`document.visibilityState`); hiển thị thời điểm tải gần nhất và trạng thái nguồn dữ liệu (nếu hợp đồng có). Giữ race guard hiện có.
- **Không được làm:** polling cho phiên đã đóng; polling khi tab ẩn.
- **Nghiệm thu:** `build`, `test` xanh; test cho logic quyết định có polling hay không.

### P04-05.1 — Duyệt `REVIEW`
- **Trạng thái:** CẦN ĐỐI CHIẾU TRƯỚC · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Lưu ý 06/11:** `77e238a` sửa `SessionDetailPage.tsx` 223 dòng và `SessionsPage.tsx`; có thể xuanmanhneee đã làm một phần UI duyệt. `PROJECT_CONTEXT` ghi "chưa có UI duyệt" là từ commit message, CHƯA xác minh bằng code. Bước đầu tiên: `git grep -n -i "review" -- client/admin-dashboard/src`. Nếu UI đã có thì thẻ này thành "rà và bù".
- **Đọc trước:** `docs/api.md` (mục review); controller review ở `server/attendance/src/attendance-check-in/attendance-check-in.controller.ts` (CHỈ ĐỌC); `packages/shared/src/api/response/codes/attendance-review.codes.ts`; types review trong `packages/shared` (CHỈ ĐỌC); `AttendanceRecordsPage`, `useAttendanceSessionDetail`; `api/` hiện có (đã có hàm gọi review chưa).
- **Việc cần làm (nếu chưa có):** client API cho GET và PATCH review; trong màn kết quả điểm danh của organizer tạo phiên: danh sách yêu cầu (mã, họ tên, lý do hệ thống `reasons`, ghi chú), nút duyệt/từ chối, ô lý do, chặn double-submit, hiển thị người sửa và thời điểm nếu API trả, lỗi map theo `ApiError.code` (bảng mã ở hợp đồng), không báo thành công khi API lỗi, tải lại sau khi xử lý. `reasons` map sang nhãn i18n, mã lạ có nhãn mặc định.
- **Cần tôi quyết:** lý do khi từ chối có bắt buộc không (hợp đồng: `reason?` tối đa 500 ký tự; kế hoạch ghi bắt buộc); admin có xem được không (backend: chỉ organizer tạo phiên).
- **Không được làm:** sửa `server/` hoặc `packages/shared`; hiện lỗi thô; viết lại `AttendanceRecordsPage`.
- **Nghiệm thu:** `build`, `test` xanh; vi/en đủ key; test cho hàm validate lý do (nếu có).
- **Phối hợp:** hỏi xuanmanhneee ai làm UI này trước khi bắt đầu.

### P04-06.1 — Xuất CSV/XLSX
- **Trạng thái:** CHỜ HỢP ĐỒNG · **Chế độ:** DỪNG SAU BÁO CÁO ĐỌC · **Xong:** [ ]
- **Việc cần làm:** xuất CSV/XLSX từ dữ liệu đang xem; ghi múi giờ và thời điểm xuất vào file; tên file có mã phiên và thời điểm. Hỏi tôi trước nếu cần thư viện mới (`xlsx` có thể đã có trong `package.json`, xem thẻ P07-07.3).
- **Nghiệm thu:** `build`, `test` xanh; mở thử file xuất và mô tả nội dung.

### P04-06.2 — Chống CSV injection
- **Trạng thái:** CHỜ P04-06.1 · **Chế độ:** CHẠY THẲNG · **Xong:** [ ]
- **Việc cần làm:** hàm thuần escape ô bắt đầu bằng `=`, `+`, `-`, `@` (và tab/CR đầu ô) trước khi ghi file; áp dụng cho MỌI ô văn bản; test.
- **Nghiệm thu:** test phủ từng ký tự nguy hiểm, giá trị bình thường không đổi; `test` xanh. Tick task 8.

---

# PHẦN 2 — DÀNH CHO NGƯỜI (AI không cần đọc)

## Prompt dán vào Kilo (chỉ đổi mã thẻ)
```
Đọc TASKS.md: Phần 0 và đúng thẻ P04-07.1. Làm đúng quy trình 0.3. Không đọc các thẻ khác.
```
Với thẻ `DỪNG SAU BÁO CÁO ĐỌC`, Kilo sẽ dừng sau BÁO CÁO ĐỌC. Dán báo cáo đó cho Claude để kiểm tra rồi trả lời Kilo "OK" hoặc "OK, nhưng đổi X".

## Vòng làm việc
1. Tạo nhánh `feature/<mo-ta>`. KHÔNG commit từng thẻ: sau mỗi thẻ được duyệt thì `git add` (stage) các file của thẻ đó; commit MỘT lần khi xong cả task (gộp các "Commit gợi ý" của các thẻ thành một message).
2. Giao thẻ cho Kilo bằng prompt trên.
3. Thẻ chế độ DỪNG: gửi BÁO CÁO ĐỌC cho Claude kiểm tra, rồi trả lời Kilo.
4. Sau khi Kilo xong: chạy `git status` và `git diff --stat`. Vì các thẻ cũ đã được stage, `git diff` (không có `--staged`) chỉ cho thấy thay đổi của thẻ vừa làm. File nào ngoài danh sách của thẻ là dấu hiệu Kilo làm lố, dừng lại và hỏi. Trên PowerShell dùng `git --no-pager diff` và `Select-String` thay cho `grep`.
5. Gửi Claude: `git diff`, BÁO CÁO HOÀN THÀNH, output build/test (Claude không truy cập được repo).
6. Claude review theo checklist: đúng phạm vi thẻ, i18n đủ vi/en, không hard-code màu, không báo thành công giả, lỗi qua `ApiError.code`, không file thừa. Đạt thì bạn trả lời Kilo `duyệt` để nó tự tick `[x]` kèm bằng chứng (Bước F), rồi bạn `git add` các file của thẻ (stage, chưa commit).
7. Xong cả task: commit một lần, rồi push.

## Trước mỗi thẻ và sau mỗi lần merge
1. Trước khi giao thẻ: `git fetch --all --prune`, rồi `git log --oneline HEAD..origin/main -- client/admin-dashboard`. Có commit mới thì xem `git --no-pager diff --stat HEAD...origin/main -- client/admin-dashboard` xem có chạm file của thẻ không; có thì nhắn xuanmanhneee hoặc merge trước.
2. Merge (không rebase) khi xong một task, rồi chạy `build`, `test`.
3. Kiểm tra hồi quy sau merge (đã có một lần mất `ErrorBoundary`): `git grep -n "ErrorBoundary" -- client/admin-dashboard/src` phải thấy ở `DashboardLayout.tsx`; `git grep -n "t('login\." -- client/admin-dashboard/src/pages/LoginPage.tsx` còn kết quả; `git grep -nE "#[0-9a-fA-F]{6}" -- client/admin-dashboard/src/pages/LoginPage.tsx` rỗng. Với file hai người cùng sửa, xem `git show --cc <mã-merge>` (không dùng `--output`).

## Phát hiện thêm đã ghi nhận (chưa có thẻ)
- `PrimaryButton` ở dark mode: chữ trắng trên nền accent nhạt, độ tương phản thấp.
- File chết: `SessionLocationMap.tsx`, `SessionFormLocationCard.tsx` (không ai import).
- `services/preference.service.ts` còn key trạng thái sidebar sau khi sidebar thu gọn bị revert.
- `index.html:19` title tiếng Anh khác thương hiệu mới.
- Tên một số test hiện mojibake trong output (`session-form.test.ts`, vài file khác): kiểm tra `git grep -n "Ä‘" -- client/admin-dashboard/src` xem file nguồn có bị lỗi mã hoá không hay chỉ là console.
- Cảnh báo chunk > 500 kB còn nguyên (xem P04-07.5b).

## Khi Kilo làm sai
- Bịa tên file/hàm/key: trả lời "Sai. Mở file thật và trích nguyên văn, đừng đoán", rồi bắt chạy lại Bước A.
- Làm lố phạm vi: `git checkout -- <file thừa>`, nhắc luật 0.2 mục 5 và 6.
- Báo "xong" khi chưa chạy lệnh: bắt chạy Bước D và dán output.
- Sai hai lần liên tiếp ở cùng một thẻ: chia thẻ nhỏ hơn thay vì lặp lại prompt.