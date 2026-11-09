# Cụm kiểm thử hiệu năng cục bộ (Local Performance Stack)

Stack này được cô lập hoàn toàn với `docker-compose.yml`: nó có dự án Compose riêng, các volume PostgreSQL/Redis riêng và image API riêng. PostgreSQL và Redis không mở cổng ra máy host; bộ cân bằng tải Nginx được gắn vào `127.0.0.1:3100`.

Chạy từ thư mục gốc của kho lưu trữ:

```powershell
docker compose -f docker-compose.perf.yml up --build -d --scale backend=3 load-balancer
docker compose -f docker-compose.perf.yml run --rm prepare
docker compose -f docker-compose.perf.yml run --rm load
docker compose -f docker-compose.perf.yml run --rm verify
docker compose -f docker-compose.perf.yml stats
```

Lệnh `prepare` tái sử dụng các tài khoản/người dùng có tiền tố `LOAD`, tạo một phiên học mở mới, ghi sẵn 1.200 bản ghi `absent` vào Redis, lên lịch cho công việc flush định kỳ và lưu các token kiểm thử vào một Docker volume riêng. Lệnh này bỏ qua bước tạo phiên và khởi tạo roster qua API thông thường để kết quả k6 đo lường chính xác đường dẫn check-in (hot path). Hãy chạy các bài kiểm thử chức năng riêng biệt cho hai bước chuẩn bị đó.

Các lượt thử điểm danh (attempt), kết quả xác thực integrity, sự kiện lịch sử (history) và nhật ký kiểm toán (audit) được lưu trữ bất đồng bộ bởi worker hỗ trợ Redis của từng API theo các lô có tính lũy thừa (idempotent batches). Lệnh `verify` đợi tối đa 60 giây để các hàng đợi này được xả hết và kiểm tra số lượng hàng trong PostgreSQL trước khi xác thực bộ đệm bản ghi điểm danh (attendance record buffer).

Dữ liệu phiên và mốc định vị GPS mới nhất của giảng viên được đọc từ Redis trên hot path; bước tạo phiên sẽ nạp trước dữ liệu vào bộ nhớ đệm (cache), việc đóng hoặc hủy phiên sẽ làm mới cache, và mỗi lần giảng viên xác thực vị trí thành công mới sẽ cập nhật bản ghi cache tương ứng.

Bài kiểm thử mặc định khởi tạo chính xác 1.200 VUs, giữ mỗi VU ở rào chắn bắt đầu 2 giây, sau đó gửi một yêu cầu check-in cho mỗi VU để tạo ra một đợt tải đột biến đồng thời (burst spike). Số lượng fixture và `LOAD_VUS` phải khớp nhau; đối với bài kiểm tra chẩn đoán nhỏ hơn, hãy đặt cả `LOAD_USERS` và `LOAD_VUS` cùng một giá trị. Các ngưỡng nghiệm thu là: 0 yêu cầu HTTP thất bại, 100% kiểm tra thành công, và p95 dưới 50 ms (`PERF_P95_MS` có thể được cấu hình cho một mục tiêu đã thỏa thuận khác).

Bảng tóm tắt của k6 cũng báo cáo các xu hướng thời gian phía API gồm `server_pre_handler_ms`, `server_handler_ms` và `server_request_ms`, cùng các xu hướng phía client gồm `client_blocked_ms`, `client_connecting_ms`, `client_sending_ms`, `client_waiting_ms` và `client_receiving_ms`, cũng như phía Nginx gồm `proxy_first_byte_ms`, `upstream_connect_ms` và `upstream_header_ms`. Các chỉ số này tách biệt thời gian trong guards/framework, thời gian thực thi handler, mạng client, chuyển tiếp proxy và thời gian chờ API. Các header đo thời gian của API chỉ được phát ra khi cả `NODE_ENV=test` và `LOAD_TEST_MODE=true`.

Phiên học mặc định sẽ đóng sau 10 phút kể từ lệnh `prepare`. Khi phiên đóng và bộ lập lịch đã chạy (quét mỗi 10 giây), hãy xác minh PostgreSQL:

```powershell
$env:VERIFY_PHASE = 'after-flush'
docker compose -f docker-compose.perf.yml run --rm verify
Remove-Item Env:VERIFY_PHASE
```

Bước xác minh `before-flush` yêu cầu tất cả sinh viên phải có bản ghi `present` trong Redis và chưa có bản ghi nào trong PostgreSQL. Bước `after-flush` yêu cầu tất cả sinh viên phải có bản ghi `present` trong PostgreSQL và bộ đệm Redis phải rỗng. Mỗi lần chạy kiểm thử cần một lần gọi `prepare` mới.

Để kiểm tra trường hợp hai người dùng đồng thời dùng chung một thiết bị và hai yêu cầu đồng thời từ một người dùng, hãy chuẩn bị một fixture riêng với ít nhất ba người dùng, sau đó chạy:

```powershell
docker compose -f docker-compose.perf.yml run --rm -e LOAD_USERS=3 prepare
docker compose -f docker-compose.perf.yml run --rm --entrypoint k6 load run /scripts/check-in-race.js
```

Tài nguyên mặc định là 2 CPU / 2 GB cho mỗi container API, 2 CPU / 2 GB cho PostgreSQL, và 1 CPU / 512 MB cho Redis. Có thể ghi đè bằng các biến môi trường: `PERF_API_CPUS`, `PERF_API_MEMORY`, `PERF_DB_CPUS`, `PERF_DB_MEMORY`, `PERF_REDIS_CPUS` và `PERF_REDIS_MEMORY`. Mỗi instance API mặc định có một pool kết nối PostgreSQL tối đa 15 kết nối; có thể ghi đè bằng `PERF_DB_POOL_MAX` nhưng cần đảm bảo tổng số kết nối trên tất cả replica API và các client khác không vượt quá giới hạn kết nối cấu hình của PostgreSQL.

API kiểm thử hiệu năng sử dụng `LOG_LEVEL=error` để các log info theo từng request không gây nghẽn I/O console trên hot path được đo lường; các lỗi vẫn được ghi nhận đầy đủ. Cần duy trì đủ dung lượng máy host cho k6 và Docker Desktop. Số lượng fixture kiểm thử có thể thay đổi bằng `LOAD_USERS`; thời lượng phiên học thay đổi bằng `LOAD_SESSION_MINUTES`.

API hiệu năng cô lập này kích hoạt tính năng bỏ qua giới hạn tần suất (rate-limit bypass) chỉ dành cho kiểm thử và sử dụng một token attestation kiểm thử cố định. API chỉ chấp nhận token đó khi `NODE_ENV=test`, `LOAD_TEST_MODE=true` và tên cơ sở dữ liệu chính xác là `gps_attendance_loadtest`; tuyệt đối không bật các cài đặt này trên môi trường sản xuất (production).

Dừng stack mà không xóa dữ liệu kiểm thử:

```powershell
docker compose -f docker-compose.perf.yml down
```

Các token được tạo chỉ tồn tại trong Docker volume `perf_data`. Hãy xem volume đó như các thông tin xác thực kiểm thử và không bao giờ sử dụng stack này chống lại một API công khai.
