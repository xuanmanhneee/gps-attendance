# Lộ trình hoàn thiện GPS Attendance

> Ảnh chụp hiện trạng: 2026-10-28. Đây là kế hoạch triển khai, chưa phải cam kết lịch phát hành. Mỗi file `phase-*.md` là một nhóm công việc có thể chia tiếp thành issue/PR. Khi bắt đầu một phase, xác nhận lại hiện trạng vì code có thể đã thay đổi.

## Mục tiêu hoàn thành

Một organizer tạo và quản lý phiên; participant đăng nhập, xem phiên, điểm danh bằng vị trí; hệ thống ghi nhận kết quả nhất quán qua Redis/PostgreSQL; admin quản trị người dùng và xem số liệu; ứng dụng được triển khai với kiểm soát truy cập, sao lưu, giám sát và quy trình khôi phục. `REVIEW` phải có trạng thái và luồng xử lý rõ ràng, không bị hiểu ngầm là đã điểm danh hợp lệ.

## Căn cứ từ repo

- Monorepo pnpm gồm NestJS/Prisma/PostgreSQL/Redis, dashboard React/Vite, mobile Expo và `packages/shared`; xem `README.md`, `docs/architecture.md`, `package.json`.
- Backend có login/refresh, tạo/sửa/hủy phiên, roster trong Redis, check-in và flush PostgreSQL; đã có unit test và một bài đo tải đường check-in (`server/attendance/perf/RESULTS-2026-10-23.md`). Kết quả tải đó **chỉ** đo hot path trên máy local, không chứng minh khả năng chịu tải của tạo phiên, roster hoặc môi trường triển khai.
- Kiểm tra trực tiếp ngày 2026-10-28: `UserController` có route danh sách/chi tiết/test-filter chưa guard; `UnitController` chưa guard; `AccountController.findById` chưa guard; `AttendanceSessionsController.findAll` và `getMySessions` chỉ yêu cầu JWT; `TagController` có JWT nhưng cần rà lại quyền đọc theo chủ sở hữu. Đây là các điểm phải xác minh theo ma trận quyền rồi xử lý ở Phase 1.
- `AuthService` cấp cặp access/refresh token; dashboard có refresh tự động, mobile hiện chỉ lưu access token và API refresh đang gửi body không khớp hợp đồng. Hai client hiện đăng xuất bằng xóa token phía client, server chưa có endpoint thu hồi phiên.
- `AttendanceCheckInService` giữ `REVIEW` ở trạng thái `absent` và chỉ `markPresent` khi `VALID`. Khi Play Integrity được bật, verdict hợp lệ có hệ số 1, verdict thiếu/sai có hệ số 0 nên mẫu GPS hợp lệ nhưng integrity không đạt đi vào `REVIEW`; khi chưa cấu hình verifier, hệ số 0.5 giữ hành vi local cũ.
- Criteria tạo roster đang lưu ở Redis; lịch job cũng ở Redis. Cần thiết kế khả năng khôi phục khi mất dữ liệu/job hoặc lỗi giữa ghi DB và Redis.
- Dashboard đã có trang phiên, chi tiết, bản ghi, đơn vị, tag và wizard tạo phiên. `/users` và `/statistics` là placeholder. `client/admin-dashboard/PLAN.md` ghi các việc nhỏ còn lại; các thay đổi chưa commit ở wizard tạo phiên đang tồn tại, vì vậy mỗi task liên quan phải kiểm tra code mới nhất khi triển khai.
- Mobile và server đã có luồng Android Play Integrity, nhưng còn cần package/signing, credential Google và kiểm thử thiết bị thật trước khi bật; iOS vẫn dùng adapter unsupported. `docker-compose.yml` dành cho local, `Dockerfile.perf` dành cho đo tải; chưa thấy pipeline CI hay cấu hình triển khai production trong repo.
- Một số tài liệu kiến trúc/README có mô tả cũ (ví dụ role `student` hoặc endpoint logout chưa tồn tại). Kế hoạch lấy **code và `docs/conventions/` hiện tại** làm căn cứ; task tài liệu sẽ đồng bộ lại sau khi chốt hợp đồng.

## Thứ tự triển khai

| Thứ tự | File | Trọng tâm | Điều kiện để chuyển phase |
|---|---|---|---|
| 0 | [phase-00-khao-sat-va-chot-hop-dong](phase-00-khao-sat-va-chot-hop-dong.md) | Baseline, quyết định nghiệp vụ, ma trận quyền | Hợp đồng trạng thái/quyền và tiêu chí phát hành được ghi rõ |
| 1 | [phase-01-bao-mat-va-phan-quyen](phase-01-bao-mat-va-phan-quyen.md) | Chặn truy cập trái phép, validation, cấu hình an toàn | Test quyền âm/dương cho mọi API quan trọng đạt |
| 2 | [phase-02-toan-ven-du-lieu](phase-02-toan-ven-du-lieu.md) | Roster, job, Redis→PostgreSQL, review/audit | Lỗi/restart không làm mất hoặc đổi nghĩa kết quả điểm danh |
| 3 | [phase-03-mobile-va-xac-thuc](phase-03-mobile-va-xac-thuc.md) | Refresh/logout, UX check-in, lịch sử | Participant đi hết luồng trên thiết bị thật |
| 4 | [phase-04-luong-organizer](phase-04-luong-organizer.md) | Tạo/sửa/hủy phiên, kết quả, duyệt, xuất dữ liệu | Organizer xử lý trọn một phiên không cần thao tác DB |
| 5 | [phase-05-quan-tri-va-thong-ke](phase-05-quan-tri-va-thong-ke.md) | Users, đơn vị, chỉ số thật, phân trang | Admin vận hành dữ liệu và số liệu có nguồn rõ ràng |
| 6 | [phase-06-chong-gian-lan](phase-06-chong-gian-lan.md) | Attestation, threat model, chính sách rủi ro | Không tuyên bố chống gian lận vượt khả năng kiểm chứng |
| 7 | [phase-07-chat-luong-va-van-hanh](phase-07-chat-luong-va-van-hanh.md) | CI, tích hợp, tải, quan sát, runbook | Có bằng chứng test và ngưỡng vận hành |
| 8 | [phase-08-trien-khai-va-pilot](phase-08-trien-khai-va-pilot.md) | Staging, backup, phát hành, pilot, rollback | Go/no-go đạt và pilot được nghiệm thu |

## Cách đọc mức ưu tiên

- **P0**: điều kiện bắt buộc trước khi dùng dữ liệu thật hoặc mở hệ thống cho người ngoài nhóm phát triển. Hoàn thành P0 theo thứ tự phụ thuộc, kể cả task P0 nằm ở phase cuối.
- **P1**: cần cho bản pilot có đủ nghiệp vụ và vận hành ổn định.
- **P2**: cải thiện quy mô, trải nghiệm hoặc bảo trì; có thể chuyển sau pilot nếu không vi phạm cổng nghiệm thu.

Ước lượng trong các phase là **ngày công kỹ thuật thô**, dùng để chia việc chứ không phải deadline; cần cập nhật sau Phase 0. Task trong cùng phase không nhất thiết làm tuần tự nếu không có phụ thuộc và đã thống nhất hợp đồng.

**Đường găng trước khi dùng dữ liệu thật:** P00-02/03/04/05 → P01-01/02/06/07 → P02-01/02/04/05/06/08 → P03-01/02/03/06 → P07-01/02/04/05 → P08-01 đến P08-05. Các việc UI P1 có thể làm song song sau khi hợp đồng Phase 0 được chốt; P2 không chặn pilot trừ khi kiểm thử cho thấy rủi ro cụ thể.

## Quy tắc thực hiện từng task

1. Đọc toàn bộ `docs/conventions/` trước khi sửa code. Ưu tiên quy ước ở đó khi tài liệu khác hoặc code cũ mâu thuẫn. Nếu trường hợp cụ thể chưa có quy ước, chốt trước khi áp dụng xuyên domain.
2. Tạo issue từ từng mã task; ghi người phụ trách, PR, trạng thái `todo / doing / blocked / done`, ngày bắt đầu và bằng chứng nghiệm thu. Một PR nên gắn một mục tiêu logic; branch theo `feature/<mo-ta-ngan>` hoặc `feature/<MA-TICKET>-<mo-ta>` như `docs/conventions/naming.md`.
3. Khi thay hợp đồng API, cập nhật `packages/shared`, backend, hai client liên quan, migration và test trong cùng đợt phát hành; giữ response `ApiResponse<T>` và error code namespaced theo quy ước.
4. Task có migration phải kèm cách nâng cấp dữ liệu hiện có, rollback hoặc forward-fix, và test với dữ liệu gần thực tế. Không dùng seed/demo credentials cho môi trường pilot.
5. Chỉ đánh dấu `done` khi tiêu chí nghiệm thu trong file phase đạt và có bằng chứng (test, ảnh màn hình, log, kết quả chạy thử). Cập nhật README/architecture/runbook liên quan.

## Các quyết định cần chốt sớm

Các quyết định trong Phase 0 là đầu vào bắt buộc, không tự suy đoán: chính sách `REVIEW`/`REJECTED` và quyền duyệt; phạm vi nhìn dữ liệu của admin/organizer/participant; quy tắc sửa tay `late/excused`; nơi triển khai/pilot, số người và mức tải; mức chống gian lận mong muốn và hỗ trợ Android/iOS. Nếu chưa chốt, vẫn có thể xử lý guard rõ ràng và thiết lập baseline, nhưng không xây schema/UI theo một nghĩa nghiệp vụ tự chọn.
