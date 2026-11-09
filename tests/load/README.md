# Kiểm thử tải k6 (Load Tests)

Các kịch bản k6 này đo lường hành vi của API trên môi trường cục bộ (local) hoặc môi trường staging được chỉ định rõ ràng. Không chạy các kịch bản ghi dữ liệu (write scenarios) vào môi trường sản xuất (production).

## Điều kiện tiên quyết

- Cài đặt k6 và khởi động API kết nối với một cơ sở dữ liệu dùng một lần (disposable) hoặc database staging.
- Sử dụng access token hợp lệ cho role được chọn.
- Duy trì API, cơ sở dữ liệu, Redis và bộ tạo tải (load generator) gần với cấu trúc liên kết triển khai dự kiến.

## Kịch bản kiểm thử tải tăng dần cho API chỉ đọc (Read-only API ramp test)

Kịch bản này tăng dần số lượng người dùng ảo lên `MAX_VUS` và gọi liên tục một tập hợp các endpoint đặc thù theo từng role. Biến `TOKEN` là bắt buộc. `ROLE` chấp nhận các giá trị: `participant`, `organizer` hoặc `admin`; `SESSION_ID` bổ sung endpoint chi tiết phiên vào lưu lượng của nhân sự quản lý.

Ví dụ lệnh PowerShell:

```powershell
$env:BASE_URL = 'http://localhost:3000'
$env:TOKEN = '<access-token>'
$env:ROLE = 'participant'
$env:MAX_VUS = '50'
$env:P95_MS = '1000'
$env:ERROR_RATE = '0.01'
k6 run tests/load/read-api.js
```

Cấu hình tùy chọn: `PAUSE_SECONDS` (mặc định `0.5`), `P95_MS` (mặc định `1000`), và `ERROR_RATE` (mặc định `0.01`). Hãy chạy các bài kiểm tra riêng biệt cho role sinh viên và role giảng viên/quản trị viên để kết quả xác định rõ tập API nào đang chịu tải.

## Kịch bản kiểm thử tăng tải và tải đột biến điểm danh (Check-in ramp and spike test)

`checkin-burst.js` tăng dần từ `RAMP_VUS` lên `MAX_VUS`, duy trì mức tải đột biến (spike), sau đó hạ nhiệt (cool down). Mỗi VU chỉ gửi chính xác một yêu cầu check-in; các vòng lặp sau đó sẽ ở trạng thái nghỉ mà không gửi thêm request. Cần cung cấp ít nhất `MAX_VUS` bộ dữ liệu mẫu (fixtures) qua biến `CHECKIN_FIXTURES`. Mỗi fixture cần một token sinh viên và device ID duy nhất, kèm theo ID phiên học dạng số được phân công cho sinh viên đó. Phiên mục tiêu phải đang mở và là phiên dùng một lần. Trình chạy kiểm thử sẽ làm mới timestamp tọa độ tại thời điểm gửi.

Định dạng fixture:

```json
[
  {
    "token": "student-access-token",
    "payload": {
      "sessionId": 123,
      "location": {
        "latitude": 11.9404,
        "longitude": 108.4583,
        "accuracy": 10,
        "timestamp": 1790000000000,
        "isMockLocation": false
      },
      "device": {
        "deviceId": "load-test-device-001",
        "platform": "android",
        "model": "load-test"
      },
      "integrity": { "integrityToken": null }
    }
  }
]
```

Ví dụ lệnh PowerShell cho bài kiểm thử 50 người dùng tăng tải / đột biến:

```powershell
$env:BASE_URL = 'http://localhost:3000'
$env:CHECKIN_FIXTURES = 'checkin-fixtures.local.json'
$env:MAX_VUS = '50'
$env:RAMP_VUS = '10'
$env:RAMP_DURATION = '15s'
$env:SPIKE_DURATION = '10s'
$env:HOLD_DURATION = '30s'
$env:COOLDOWN_DURATION = '10s'
k6 run tests/load/checkin-burst.js --summary-export=result-spike-50vu.json
```

Các ngưỡng cấu hình tùy chọn: `P95_MS` (mặc định `1000`) và `TECHNICAL_ERROR_RATE` (mặc định `0.01`). Kịch bản báo cáo riêng biệt các chỉ số: `checkin_rate_limited`, `checkin_business_rejected`, `checkin_accepted` và tỷ lệ lỗi kỹ thuật. Chỉ số `http_req_failed` tích hợp sẵn của k6 bao gồm cả các mã HTTP 4xx như 429, do đó không nên hiểu nhầm nó chỉ là lỗi hạ tầng.

Không đưa các token thật và file fixture cục bộ vào hệ thống quản lý phiên bản (Git). Không xóa các hàng attendance hoặc attempt để reset bài kiểm thử. Schema lưu trữ các bản ghi, lượt thử, nhật ký audit và chứng cứ review; hãy sử dụng một cơ sở dữ liệu kiểm thử dùng một lần và tạo một phiên kiểm thử mới cho mỗi lượt chạy.

`checkin-fixtures.example.json` chỉ là file mẫu khung, không phải thông tin xác thực có thể chạy trực tiếp. Đường dẫn fixture truyền vào k6 được tính tương đối theo thư mục của script. Để kiểm tra việc nạp module của k6 mà không gửi request, hãy chạy lệnh: `k6 inspect -e CHECKIN_FIXTURES=checkin-fixtures.example.json -e MAX_VUS=1 tests/load/checkin-burst.js`.

Endpoint check-in hiện tại có bộ giới hạn tần suất 3 request / 60 giây; guard thiết bị bổ sung cho phép 60 request / IP / phút và 30 request / device / phút. Các VU từ một máy phát tải chia sẻ cùng một IP bucket, do đó bài kiểm tra 50 VU từ một máy sẽ chủ yếu đo lường cơ chế giới hạn tần suất. Để đo lường công suất thực của backend, chỉ chạy trên môi trường staging cô lập với chính sách kiểm thử được cấu hình rõ ràng hoặc hệ thống máy phát tải phân tán hợp lệ. Không giả mạo forwarding header hoặc tắt các giới hạn bảo vệ trên production.

## Diễn giải kết quả đo lường

Ghi nhận số lượng VUs, tốc độ request (throughput), độ trễ p95/p99, các kiểm tra thất bại, phản hồi HTTP 429, CPU/bộ nhớ của API, CPU/kết nối của database, và tình trạng sức khỏe của Redis. Hãy tăng dần `MAX_VUS` theo các bước có kiểm soát và dừng lại khi các mục tiêu độ trễ/lỗi đã thỏa thuận bị vi phạm hoặc hạ tầng chạm ngưỡng giới hạn an toàn. Các ngưỡng cấu hình ban đầu là mục tiêu định hướng, không phải tuyên bố công suất đã được đo lường chính thức.
