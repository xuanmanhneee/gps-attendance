# Phase 6 — Chống gian lận có thể kiểm chứng

**Ưu tiên:** P1; mức attestation thực tế phụ thuộc phạm vi P00-04. **Phụ thuộc:** hợp đồng review P00-03/P02-06 và bản build mobile P03-06. **Mục tiêu:** nâng độ tin cậy của bằng chứng vị trí/thiết bị, có chính sách xử lý khi không xác minh được. **Ước lượng:** 9–16 ngày công, chưa tính thời gian cấp quyền dịch vụ nền tảng.

## Task theo thứ tự

### P06-01 — Threat model và giới hạn tuyên bố (P1, 1 ngày)

- **Làm:** liệt kê gian lận khả thi: app giả/request trực tiếp, sửa timestamp/accuracy, mock GPS, root/jailbreak, đổi installation ID, một thiết bị cho nhiều tài khoản, replay token, proxy/vị trí sai do indoor. Phân loại tín hiệu tin được từ OS/server và tín hiệu do client tự khai; xác định rủi ro chấp nhận của pilot.
- **Nghiệm thu:** bảng threat→tín hiệu→xử lý→giới hạn; README/sản phẩm không tuyên bố chặn tuyệt đối spoofing hoặc thiết bị trùng khi chỉ dựa trên `deviceId` do app gửi.

### P06-02 — Challenge gắn với lần điểm danh (P1, 1–2 ngày)

- **Làm:** server cấp nonce ngắn hạn gắn user/session/thời hạn; mobile lấy challenge trước khi tạo attestation; server xác minh một lần và chặn replay. Chốt API, TTL, giới hạn request, lỗi khi challenge hết hạn và tương thích với thiết bị chưa hỗ trợ.
- **Nghiệm thu:** token dùng cho session/user khác hoặc lặp lại bị từ chối; challenge hết hạn có hướng dẫn retry; không log token thô.

### P06-03 — Android Play Integrity (P1, 2–3 ngày)

- **Làm:** chuyển `src/services/integrity.ts` khỏi stub trong build Android phù hợp, tích hợp native qua development/production build thay vì giả định Expo Go hỗ trợ; server xác minh chữ ký/verdict, package/app identity, nonce và thời gian theo tài liệu nền tảng ở thời điểm thực hiện. Cấu hình key/credential qua secret manager.
- **Nghiệm thu:** thiết bị hợp lệ, app sửa đổi, token sai/chết hạn/replay có kết quả phân biệt; không coi sự hiện diện của một chuỗi `integrityToken` là xác minh (server hiện chấm 0.7 nếu chuỗi bất kỳ).

### P06-04 — iOS App Attest hoặc chính sách thay thế (P1, 2–3 ngày)

- **Làm:** nếu pilot có iOS, tích hợp App Attest và xác minh server-side với challenge, app identity và counter/replay; nếu thiết bị/OS không hỗ trợ, áp chính sách fallback đã chốt (`REVIEW`, hạn chế hoặc từ chối), không mặc định coi là hợp lệ. Chạy trên thiết bị iOS thật.
- **Nghiệm thu:** verdict iOS hợp lệ/sai/hết hạn/không hỗ trợ đi theo chính sách; lỗi không bị nuốt thành `VALID`.

### P06-05 — Chính sách device và GPS (P1, 1–2 ngày)

- **Làm:** rà `DeviceDto` đang nhận `deviceId` client tự cung cấp và Expo Web chuyển platform `web` thành `android`; quyết định có cho check-in từ web hay không. Giữ chống trùng thiết bị ở server nhưng gắn mức tin cậy thấp cho installation ID tự khai; không dùng model/platform làm bằng chứng định danh. Kiểm tra độ chính xác, mẫu cũ, biên bán kính và trường hợp mock flag vắng mặt.
- **Nghiệm thu:** test request giả bằng HTTP client cho thấy server không dựa vào platform/model tự khai để nâng trust; web theo chính sách riêng; device claim không thể bị race trong cùng phiên.

### P06-06 — Hiệu chỉnh điểm rủi ro và quyết định review (P1, 1–2 ngày)

- **Làm:** thay hệ số integrity tạm (`0.7` có token, `0.5` không token) bằng kết quả verify thật và ngưỡng dựa trên tập test; kiểm tra vì các hệ số nhị phân hiện tại khiến nhánh 60–79 điểm của `REVIEW` không đạt được trong luồng thực. Tách hard reject (mock/replay/dữ liệu sai rõ) khỏi review (độ chính xác thấp/không hỗ trợ). Ghi reason có thể giải thích và số liệu false positive/false negative trong pilot.
- **Nghiệm thu:** test ma trận tín hiệu cho `VALID/REVIEW/REJECTED`; thay ngưỡng có version/config và có thể rollback; không lặng lẽ thay đổi ý nghĩa record cũ.

### P06-07 — Diễn tập gian lận và quyền riêng tư (P1, 1–2 ngày)

- **Làm:** thử vị trí giả, token bị copy, deviceId đổi, hai account một máy, app bị sửa, mạng yếu; kiểm tra log và dữ liệu export không lộ tọa độ/attestation không cần thiết. Ghi case nào không phát hiện được và quy trình organizer xử lý review.
- **Nghiệm thu:** báo cáo test có thiết bị/OS/build, kết quả thực và giới hạn; tất cả P0 liên quan replay/giả token được sửa trước pilot.

## Cổng hoàn thành

Server chỉ tin attestation sau xác minh; có chính sách rõ cho thiết bị không hỗ trợ; tín hiệu rủi ro và review giải thích được. Nếu phạm vi pilot chưa yêu cầu attestation, quyết định đó phải được ghi trong P00-04 và giới hạn chống gian lận được công bố đúng mức.
