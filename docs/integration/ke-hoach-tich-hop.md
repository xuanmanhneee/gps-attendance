# Kế hoạch tích hợp hệ thống điểm danh với LMS

## 1. Mục tiêu

Dự án gồm hai hệ thống có thể phát triển và triển khai độc lập:

| Hệ thống | Trách nhiệm chính |
|---|---|
| Hệ thống điểm danh | Quản lý phiên điểm danh GPS, danh sách người tham gia, check-in, review và kết quả điểm danh |
| LMS | Quản lý sinh viên, giảng viên, lớp hành chính, học phần, nhóm học phần và lịch học |

Hệ thống điểm danh vẫn có thể hoạt động độc lập bằng tài khoản nội bộ. Khi kết nối với LMS, LMS là nguồn định danh người dùng; luồng tích hợp không tạo hoặc sử dụng tài khoản, tên đăng nhập hay mật khẩu của hệ thống điểm danh.

Hai hệ thống chỉ trao đổi qua REST API và webhook. Không bên nào đọc trực tiếp database hoặc Redis của bên kia.

## 2. Nguyên tắc phối hợp bắt buộc

1. File `integration-openapi.yaml` là hợp đồng và nguồn sự thật duy nhất của phần tích hợp.
2. **Phía LMS phải phát triển và kiểm thử với mock server sinh từ hợp đồng trước khi kết nối hệ thống điểm danh thật.** Không được chờ API thật mới bắt đầu làm phần tích hợp.
3. Trong thời gian API thật chưa được xác nhận sẵn sàng, LMS dùng lệnh sau:

   ```bash
   npx @stoplight/prism-cli mock integration-openapi.yaml
   ```

4. Chỉ chuyển cấu hình từ mock sang API thật khi phía hệ thống điểm danh thông báo endpoint đã sẵn sàng và contract test đã đạt.
5. **Phía LMS không được sửa code, cấu hình, database, Redis hoặc logic nghiệp vụ của hệ thống điểm danh**, kể cả để chạy tạm hoặc bổ sung một field còn thiếu.
6. Nếu hợp đồng thiếu endpoint, field hoặc hành vi, phía LMS phải gửi change request, ghi rõ dữ liệu cần thêm và chức năng sử dụng dữ liệu đó. Chủ hệ thống điểm danh quyết định cập nhật hợp đồng và triển khai thay đổi.
7. Việc mock chưa mô phỏng toàn bộ nghiệp vụ không cho phép phía LMS tự suy diễn hoặc phụ thuộc vào hành vi ngoài hợp đồng.

## 3. Tổ chức mã nguồn

Hai hệ thống được đặt trong cùng monorepo để thuận tiện phát triển, kiểm thử và demo, nhưng vẫn là hai ứng dụng độc lập:

```text
gps-attendance/
  server/
    attendance/       # Hệ thống điểm danh
    lms/              # Hệ thống quản lý sinh viên
  packages/
    shared/           # Chỉ chứa kiểu dữ liệu và quy ước thực sự dùng chung
  docs/
    integration/
      integration-openapi.yaml
      ke-hoach-tich-hop.md
```

Việc nằm trong cùng repository không làm thay đổi ranh giới tích hợp:

- `server/lms` không import service, repository, Prisma client hoặc module nội bộ từ `server/attendance`.
- `server/attendance` không import nghiệp vụ nội bộ từ `server/lms`.
- Mỗi server có cấu hình môi trường, port, migration và database riêng.
- LMS không dùng chung hoặc đọc trực tiếp database và Redis của hệ thống điểm danh.
- Mọi giao tiếp giữa hai server phải đi qua API và webhook được định nghĩa trong `integration-openapi.yaml`.
- Trong giai đoạn phát triển, `server/lms` phải gọi mock server trước; việc cùng monorepo không cho phép gọi thẳng code nội bộ của `server/attendance` để thay thế mock hoặc REST API.
- `packages/shared` không chứa model nghiệp vụ riêng, repository hoặc logic nội bộ của một trong hai hệ thống. Chỉ đưa vào đây các kiểu và quy ước trung tính thực sự cần dùng chung.
- Có thể dùng chung pnpm workspace, lint, TypeScript, CI và Docker Compose để vận hành thuận tiện, nhưng mỗi server phải có khả năng build và khởi động độc lập.

Cấu trúc này giúp đồ án dễ chạy trong một repository, đồng thời vẫn chứng minh được hai hệ thống tích hợp qua hợp đồng. Nếu cần triển khai hoặc phát triển riêng sau này, `server/lms` có thể được tách thành repository độc lập mà không đổi giao thức tích hợp.

## 4. Stack gợi ý cho LMS

Stack không phải là một phần của hợp đồng tích hợp. Phía LMS có thể chọn công nghệ phù hợp với thế mạnh, miễn tuân thủ OpenAPI, chạy độc lập và giữ đúng ranh giới dữ liệu. Để triển khai nhanh trong monorepo hiện tại, stack được khuyến nghị là:

| Thành phần | Gợi ý |
|---|---|
| Runtime | Node.js 20 trở lên, TypeScript |
| HTTP server | Express |
| Validation | Zod |
| ORM và migration | Prisma |
| Database | PostgreSQL riêng của LMS |
| API contract | OpenAPI và Prism mock |
| Kiểm thử | Vitest hoặc Jest, kết hợp Supertest |
| Quản lý workspace | pnpm |
| Đóng gói và chạy chung | Docker, Docker Compose |

Express được gợi ý vì ít boilerplate và phù hợp để xây nhanh các module quản lý sinh viên, học phần, lớp học phần, lịch học và roster. Nếu phía LMS đã quen NestJS, Spring Boot, ASP.NET hoặc Django thì có thể sử dụng stack đó; không cần đổi sang Express chỉ để đồng nhất công nghệ.

Nếu dùng Express, `server/lms` nên giữ cấu trúc module rõ ràng ngay từ đầu:

```text
server/lms/src/
  modules/
    users/
    units/
    courses/
    course-sections/
    timetables/
    attendance-integration/
  middleware/
  config/
  db/
  app.ts
  main.ts
```

Bất kể stack nào được chọn, LMS phải có validation request, migration riêng, cấu hình bằng biến môi trường, test cho client tích hợp và webhook, cùng lệnh build/start rõ ràng. Không được chia sẻ Prisma client, database connection hoặc service nội bộ với `server/attendance`.

## 5. Phạm vi và nguồn dữ liệu

### LMS là nguồn sự thật về

- Sinh viên, giảng viên và mã người dùng.
- Cây tổ chức: trường, khoa và lớp hành chính.
- Học phần, nhóm học phần, lịch học và danh sách sinh viên của từng buổi học.
- Danh tính người dùng khi vận hành theo chế độ tích hợp.

### Hệ thống điểm danh là nguồn sự thật về

- Phiên điểm danh và vị trí điểm danh.
- Trạng thái check-in, kết quả kiểm tra GPS và các trường hợp cần review.
- Kết quả điểm danh cuối cùng của từng phiên.

Hệ thống điểm danh không lưu mô hình học phần hoặc nhóm học phần. Khi tạo phiên, LMS gửi danh sách mã người dùng cần tham gia phiên đó.

## 6. Định danh giữa hai hệ thống

Trong phạm vi tích hợp hiện tại có một LMS. Hai bên dùng các khóa nghiệp vụ sau:

- `code`: mã sinh viên hoặc mã giảng viên, duy nhất và ổn định trong LMS.
- `externalCode`: mã đơn vị do LMS quản lý.
- `externalId`: mã buổi học hoặc phiên do LMS quản lý.

LMS không lưu và không gửi ID tự tăng nội bộ của hệ thống điểm danh. Hệ thống điểm danh tự ánh xạ `code` sang `User.id` nội bộ khi xử lý request.

Nếu sau này cần kết nối nhiều LMS hoặc `code` không còn duy nhất, hai bên sẽ bổ sung cơ chế namespace hoặc bảng ánh xạ trong một phiên bản hợp đồng mới.

## 7. Tài khoản và xác thực người dùng

Hệ thống điểm danh hỗ trợ hai chế độ:

### Chế độ độc lập

- Người dùng đăng nhập bằng account nội bộ của hệ thống điểm danh.
- Hệ thống điểm danh tự quản lý username, password và phiên đăng nhập.

### Chế độ tích hợp LMS

- Người dùng được LMS xác thực.
- LMS cung cấp bằng chứng định danh có chữ ký và thời hạn sử dụng cho hệ thống điểm danh.
- Hệ thống điểm danh kiểm tra chữ ký, đơn vị phát hành, đối tượng nhận và thời hạn trước khi tin cậy danh tính.
- Danh tính đã xác minh được ánh xạ bằng `code` sang `User.id` nội bộ để các nghiệp vụ điểm danh hiện có tiếp tục hoạt động.
- API đồng bộ người dùng không nhận username hoặc password và không tự tạo account nội bộ.

API key chỉ định danh hệ thống LMS trong các request server-to-server. API key không được dùng để định danh sinh viên hoặc giảng viên đang check-in.

## 8. Luồng tích hợp

1. LMS đồng bộ cây đơn vị qua `PUT /units`.
2. LMS đồng bộ hồ sơ sinh viên và giảng viên qua `PUT /users`.
3. Khi có buổi học, LMS gọi `POST /sessions`, gửi thời gian, vị trí, giảng viên phụ trách và danh sách `studentCodes`.
4. Hệ thống điểm danh kiểm tra toàn bộ mã người dùng trước khi tạo phiên. Nếu có mã không tồn tại, request thất bại và không tạo phiên.
5. Người dùng check-in; giảng viên xử lý các trường hợp cần review trong hệ thống điểm danh.
6. Sau khi hết cửa sổ review và dữ liệu đã được lưu bền vững, phiên được đánh dấu `finalized = true`.
7. Hệ thống điểm danh gửi webhook `session.finalized` cho LMS. Nếu webhook bị mất, LMS có thể gọi API GET để lấy lại kết quả.
8. LMS dùng kết quả đã chốt để hiển thị, thống kê và lập báo cáo chuyên cần.

## 9. API tích hợp

Base URL dự kiến: `/v1/integration`.

| API | Mục đích |
|---|---|
| `PUT /units` | Đồng bộ cây đơn vị theo `externalCode` |
| `PUT /users` | Đồng bộ hồ sơ người dùng theo `code`, không tạo account |
| `POST /sessions` | Tạo phiên điểm danh theo `externalId` |
| `GET /sessions/{externalId}` | Lấy trạng thái phiên và trạng thái chốt kết quả |
| `GET /sessions/{externalId}/records` | Lấy danh sách kết quả điểm danh |
| `POST /sessions/{externalId}/cancel` | Hủy phiên chưa đóng |

Mọi response dùng chung định dạng:

```json
{
  "success": true,
  "data": {}
}
```

Khi có lỗi:

```json
{
  "success": false,
  "code": "INTEGRATION_ERROR_CODE",
  "message": "Mô tả lỗi"
}
```

## 10. Quy tắc đồng bộ

### Đơn vị

- Cây tổ chức gồm trường, khoa và lớp hành chính.
- LMS gửi mã, tên, mã cha và level của từng đơn vị.
- Request có thể gửi con trước cha; hệ thống điểm danh tự sắp xếp khi xử lý.
- Gọi lại cùng một dữ liệu không tạo bản ghi trùng.
- Không tự động xóa đơn vị chỉ vì đơn vị đó vắng mặt trong một request.

### Người dùng

- Mỗi người dùng có `code`, `fullname`, `role` và `unitCode`.
- Role tích hợp chỉ gồm `organizer` và `participant`.
- `PUT /users` không nhận thông tin tài khoản hoặc mật khẩu.
- Mỗi phần tử được xử lý độc lập; phần tử lỗi được trả về trong danh sách `failed`.
- Chính sách khóa hoặc ngừng hoạt động người dùng sẽ được bổ sung khi hai bên cần đồng bộ vòng đời người dùng.

### Phiên điểm danh

- `externalId` là duy nhất trong phạm vi LMS.
- Gửi lại cùng `externalId` và cùng nội dung trả về phiên đã tồn tại.
- Gửi cùng `externalId` nhưng nội dung khác trả lỗi conflict.
- `studentCodes` không được trùng và mọi mã phải tồn tại trước khi tạo phiên.
- Danh sách người tham gia được chốt trước giờ mở phiên theo chính sách của hệ thống điểm danh.
- Kết quả chỉ được coi là chính thức khi `finalized = true`.

## 11. Webhook kết quả

Khi kết quả được chốt, hệ thống điểm danh gửi sự kiện `session.finalized` tới URL đã cấu hình cho LMS.

Webhook có các thuộc tính an toàn sau:

- `X-Event-Id`: định danh sự kiện ổn định qua mọi lần retry.
- `X-Event-Type`: `session.finalized`.
- `X-Timestamp`: thời điểm gửi.
- `X-Signature`: chữ ký HMAC-SHA256 của timestamp và raw body.
- Timeout mỗi lần gửi là 10 giây.
- Thử lại với backoff, tối đa 8 lần.

LMS phải kiểm tra chữ ký, xử lý idempotent theo `X-Event-Id` và trả 2xx nhanh sau khi đã tiếp nhận sự kiện an toàn.

## 12. Bảo mật và giới hạn

- Mỗi LMS được cấp một API key riêng, có thể thu hồi.
- API key chỉ được gửi qua HTTPS và không được ghi nguyên văn vào log.
- Giới hạn mặc định là 60 request/phút/API key.
- Request vượt giới hạn trả 429 và header `Retry-After`.
- LMS không được truy cập database, Redis hoặc ID nội bộ của hệ thống điểm danh.
- Hệ thống điểm danh không nhận hoặc lưu mật khẩu LMS.

## 13. Phân công

### Phía hệ thống điểm danh

- Cung cấp và duy trì hợp đồng OpenAPI.
- Cài đặt API key, các endpoint tích hợp và webhook.
- Bảo đảm idempotency, phân tách dữ liệu theo API client và kết quả cuối cùng nhất quán.
- Duy trì hợp đồng đủ để LMS tự chạy mock và thông báo rõ khi API thật sẵn sàng.
- Chỉ phía phụ trách hệ thống điểm danh được sửa mã nguồn, cấu hình và dữ liệu của hệ thống điểm danh.

### Phía LMS

- Quản lý dữ liệu sinh viên, giảng viên, lớp và học phần.
- Dựng mock server từ `integration-openapi.yaml` và hoàn thành luồng gọi API với mock trước.
- Gọi API đồng bộ và tạo phiên đúng theo hợp đồng; không phụ thuộc vào field hoặc hành vi chưa được công bố.
- Cung cấp bằng chứng định danh người dùng có thể xác minh.
- Tiếp nhận, xác minh và khử trùng webhook.
- Chỉ sử dụng dữ liệu có `finalized = true` làm kết quả chính thức.
- Không sửa hoặc truy cập trực tiếp code, cấu hình, database hay Redis của hệ thống điểm danh.
- Gửi change request khi hợp đồng chưa đáp ứng nhu cầu thay vì tự sửa hệ thống điểm danh.

## 14. Kiểm thử nghiệm thu

Trước khi nối API thật, phía LMS phải chứng minh được các luồng gọi API, xử lý lỗi và nhận webhook đã chạy với mock server. Sau đó hai bên chạy lại cùng bộ kịch bản với API thật; khác biệt giữa mock và API thật được xem là lỗi contract cần xử lý ở phía hệ thống điểm danh hoặc trong hợp đồng, không phải lý do để LMS sửa hệ thống điểm danh.

- Đồng bộ lại cùng dữ liệu không tạo bản ghi trùng.
- Đồng bộ cây đơn vị đúng dù phần tử con đứng trước cha.
- Tạo phiên với mã không tồn tại trả lỗi và không tạo phiên.
- Gửi lại cùng `externalId` và cùng nội dung chỉ có một phiên.
- Hai request tạo phiên đồng thời vẫn chỉ tạo một phiên.
- API key sai hoặc bị thu hồi trả 401.
- Vượt giới hạn tốc độ trả 429 và `Retry-After`.
- Webhook có chữ ký hợp lệ, giữ nguyên event ID khi retry và dừng sau tối đa 8 lần.
- LMS vẫn lấy được kết quả qua API GET khi webhook không tới.
- Người dùng chế độ LMS không cần account nội bộ của hệ thống điểm danh.

## 15. Quy tắc thay đổi hợp đồng

- File OpenAPI là nguồn sự thật của phần tích hợp.
- Thêm field hoặc endpoint tương thích ngược có thể thực hiện trong `/v1`.
- Thay đổi hoặc xóa hành vi đã công bố phải dùng phiên bản API mới.
- Khi cần bổ sung, phía LMS gửi change request, ghi rõ dữ liệu cần thêm và chức năng sử dụng dữ liệu đó; không tự sửa hệ thống điểm danh.
- Hai bên chỉ bắt đầu triển khai thay đổi sau khi hợp đồng đã được cập nhật và thống nhất.
