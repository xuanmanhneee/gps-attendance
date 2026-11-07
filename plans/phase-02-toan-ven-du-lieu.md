# Phase 2 — Toàn vẹn dữ liệu và vòng đời phiên

**Ưu tiên:** P0 · **Phụ thuộc:** quyết định trạng thái P00-03 và failure mode P00-05. **Mục tiêu:** tạo roster, điểm danh và flush có thể khôi phục, đối soát; kết quả không đổi nghĩa khi restart. **Ước lượng:** 12–20 ngày công.

## Task theo thứ tự

### P02-01 — Lưu criteria và lịch chuyển trạng thái bền vững (P0, 2–3 ngày)

- **Làm:** chuyển `participantCriteria` đang chỉ ở Redis sang dữ liệu bền vững (schema PostgreSQL hoặc outbox theo quyết định P00-05), có phiên bản và thời điểm khóa roster. Khi tạo/sửa/hủy phiên, cập nhật DB và kế hoạch job theo cơ chế có thể retry; tránh phiên đã tạo trong DB nhưng mất criteria/job nếu Redis lỗi. Migration cần xử lý phiên pending hiện có.
- **Nghiệm thu:** kill API/Redis ở từng bước tạo phiên rồi khởi động lại; không có phiên pending không thể dựng roster mà không có cảnh báo/khôi phục; dữ liệu cũ được migrate hoặc liệt kê để xử lý.

### P02-02 — Reconciler cho job roster/flush (P0, 1–2 ngày)

- **Làm:** đối soát định kỳ phiên pending/open/closed từ DB với job/index Redis; tạo lại job thiếu, nhận biết job quá hạn, tránh chạy roster cho phiên cancelled. Đặt khóa/idempotency để nhiều instance không nhân đôi. Giới hạn retry và cơ chế báo lỗi tồn đọng thay vì lặp vô hạn yên lặng.
- **Nghiệm thu:** xóa thử scheduler index/job rồi restart; roster/flush được tái lập; cancelled không sinh record; metric số job quá hạn và job lỗi có thể quan sát.

### P02-03 — Khởi tạo roster an toàn với dữ liệu lớn (P0, 2–3 ngày)

- **Làm:** hiện `initializeForSession` lặp từng user và log từng record. Chuyển sang batch có giới hạn, checkpoint/progress, idempotent khi retry; chốt snapshot membership tại thời điểm khóa, xử lý thay đổi unit/tag cùng lúc. Nếu roster rỗng, hiển thị lý do và cho organizer xử lý trước khi mở.
- **Nghiệm thu:** test roster 0/1/1.000/N người, crash giữa batch rồi retry không trùng/mất record; thời gian chuẩn bị đạt mục tiêu P00-04.

### P02-04 — Chốt ranh giới check-in và hủy/đóng phiên (P0, 1–2 ngày)

- **Làm:** kiểm tra race giữa `cancel`, `closeAt`, begin flush và Lua `markPresent`; một check-in hoặc được ghi bền vững theo chính sách, hoặc nhận lỗi rõ, không trả `VALID` rồi bị xóa. Dùng thời gian server nhất quán; xác định xử lý khi Redis mất kết nối giữa các bước và khi device claim TTL hết hạn.
- **Nghiệm thu:** test đồng thời check-in/close/cancel, restart và Redis failure; trạng thái trả cho mobile khớp record cuối và không có double check-in.

### P02-05 — Flush và đối soát Redis → PostgreSQL (P0, 2–3 ngày)

- **Làm:** giữ flush idempotent, kiểm tra `bulkUpsert` theo batch/transaction giới hạn; chỉ xóa buffer sau khi xác nhận đủ record; đo và đối chiếu tổng roster/present/absent trước và sau flush. Viết công cụ đối soát và sửa chữa có audit, không xóa dữ liệu gốc khi phát hiện lệch; lập chính sách Redis persistence/backup.
- **Nghiệm thu:** mô phỏng DB lỗi giữa flush, retry và restart; số lượng/trạng thái trong PostgreSQL bằng snapshot đã chốt; dashboard không đọc sai trong lúc chuyển nguồn.

### P02-06 — Mô hình hóa `REVIEW` và bằng chứng (P0, 2–4 ngày)

- **Làm:** theo quyết định P00-03, thêm trạng thái/bảng attempt hoặc review phù hợp; ghi reason, thời điểm, độ chính xác/khoảng cách, thiết bị, kết quả xác minh và người duyệt ở mức dữ liệu tối thiểu. Sửa `AttendanceCheckInService` để `REVIEW` không tự động trở thành `present`; xác định chính sách điểm danh lại và migration các record cũ không đủ thông tin.
- **Nghiệm thu:** `VALID`, `REVIEW`, `REJECTED`, duplicate device và retry có record/response nhất quán; API đọc phiên và mobile hiển thị đúng; migration không tự suy diễn các record cũ thành review nếu không có bằng chứng.

### P02-07 — Cập nhật thủ công có audit (P1, 1–2 ngày)

- **Làm:** xây service/repository và API cho organizer có quyền sửa bản ghi theo chính sách đã chốt (duyệt review, `late`, `excused`); ghi trước/sau, lý do, `updatedBy`, thời gian; khóa thao tác với phiên không thuộc owner và định nghĩa ngưỡng thời gian cho phép sửa.
- **Nghiệm thu:** không thể sửa bản ghi người khác/phiên khác; mọi chỉnh sửa có audit; API và dashboard nhận trạng thái mới đồng nhất sau flush.

### P02-08 — Bộ test lỗi và migration (P0, 2 ngày)

- **Làm:** integration test với PostgreSQL/Redis thật cho tạo-sửa-hủy, roster, check-in, review, flush; fault injection ở các ranh giới DB/Redis; test nâng cấp dữ liệu và replay job. Dùng dữ liệu ẩn danh giống pilot.
- **Nghiệm thu:** chạy lại nhiều lần không tạo trạng thái khác nhau; có tài liệu khôi phục khi test phát hiện phiên/record lệch.

## Cổng hoàn thành

Không còn dữ liệu thiết yếu chỉ tồn tại trong job/criteria Redis mà không thể dựng lại. Kết quả mobile, Redis, PostgreSQL và dashboard nhất quán qua restart, retry, hủy và đóng phiên; review có ý nghĩa nghiệp vụ được kiểm chứng.
