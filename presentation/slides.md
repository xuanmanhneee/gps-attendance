---
theme: default
title: Hệ thống điểm danh theo vị trí
colorSchema: dark
fonts:
  sans: 'Be Vietnam Pro'
  mono: 'Fira Code'
transition: slide-left
layout: center
class: hero text-center
mermaid:
  theme: dark
---

## Đồ án chuyên ngành

# Hệ thống điểm danh<br>dựa trên tín hiệu GPS

> Điểm danh nhanh, chính xác, đúng người đúng thời điểm

`📍 Geofencing` `⏱️ Theo phiên` `🗂️ Theo đơn vị`

Nhóm 9 · 20/09/2026

---
class: cards cols-3 center team
---

## Đội ngũ

# Giới thiệu nhóm

> 🎓 Giảng viên hướng dẫn: **TS. Trần Nhật Quang**

- ![Phan Lê Xuân Mạnh](/avatars/xuanmanhneee.jpg) **Phan Lê Xuân Mạnh** MSSV: 2312686 *Trưởng nhóm*
- ![Mai Quý Phước](/avatars/Noname1001101.jpg) **Mai Quý Phước** MSSV: 2312716 *Thành viên*
- ![Phạm Nguyễn Ngọc Phước](/avatars/Bee-Max-Ne.jpg) **Phạm Nguyễn Ngọc Phước** MSSV: 2312718 *Thành viên*

---
class: agenda
---

## Nội dung

# Nội dung trình bày

1. Bối cảnh và giải pháp
2. Tính năng
3. Thiết kế hệ thống
4. Công nghệ và giao diện
5. Demo
6. Tổng kết

---

## Bối cảnh

# Vấn đề hiện tại

- **📝 Thủ công, tốn thời gian** Gọi tên, ký giấy mỗi buổi mất thời gian và dễ nhầm lẫn.
- **🧑‍🤝‍🧑 Điểm danh hộ** Người vắng vẫn được báo có mặt, khó xác minh.
- **📊 Dữ liệu phân tán** Danh sách rải rác giấy và Excel, khó tổng hợp, thống kê.
- **🏢 Tổ chức nhiều cấp** Khoa, lớp, nhóm lồng nhau, khó quản lý đồng bộ.

---
class: cards cols-2
---

## Mục tiêu

# Mục tiêu và phạm vi

- **🎯 Mục tiêu** Số hóa điểm danh, đảm bảo người điểm danh có mặt thật, đúng nơi, đúng giờ.
- **👥 Đối tượng** Admin, người quản lý phiên và người dùng điểm danh.
- **📱 Nền tảng** Web và mobile (iOS, Android).
- **🚧 Ngoài phạm vi** Sinh trắc học, điểm danh offline, tích hợp SSO và thời khóa biểu của trường.

---
class: cards cols-3
---

## Giải pháp

# Điểm danh dựa trên vị trí địa lý

- **📍 Xác thực vị trí** Chỉ điểm danh được khi nằm trong bán kính cho phép của phiên.
- **⏱️ Đóng mở tự động** Phiên tự mở và đóng theo thời gian đã cài đặt.
- **🛡️ Toàn vẹn thiết bị** Xác minh thiết bị và ứng dụng hợp lệ bằng App Integrity.
- **🗂️ Quản lý tập trung** Phân nhóm người dùng theo đơn vị và thẻ (tag).
- **📡 Theo dõi thời gian thực** Xem danh sách điểm danh ngay khi phiên đang diễn ra.
- **🔐 Phân quyền theo vai trò** Admin, quản lý và người dùng có chức năng riêng.

---
class: cards cols-3
---

## Tính năng

# Tính năng chính

> Mỗi vai trò được cung cấp **giao diện và nhóm chức năng riêng**, phù hợp với nhu cầu sử dụng.

- **🛡️ Quản trị viên**
  - Quản lý tài khoản và người dùng
  - Quản lý đơn vị nhiều cấp
  - Phân quyền vai trò
  - Khóa / mở khóa tài khoản
- **🧑‍🏫 Quản lý**
  - Tạo phiên: vị trí, bán kính, thời gian
  - Quản lý thẻ để nhóm người dùng
  - Theo dõi điểm danh theo thời gian thực
  - Xem kết quả từng phiên
- **🎓 Người dùng**
  - Đăng nhập bằng tài khoản
  - Xem các phiên đang mở
  - Điểm danh bằng vị trí hiện tại
  - Xem lại lịch sử điểm danh

---

## Thiết kế hệ thống

# Quy trình điểm danh

```mermaid {scale: 0.7}
%%{init: {"sequence": {"width": 180, "actorMargin": 220, "messageMargin": 40, "mirrorActors": false}}}%%
sequenceDiagram
    participant GV as Người quản lý
    participant HT as Hệ thống
    participant SV as Người điểm danh
    GV->>HT: Tạo phiên (vị trí, bán kính, giờ mở/đóng)
    SV->>HT: Gửi vị trí hiện tại
    HT->>HT: Kiểm tra thời gian & khoảng cách
    alt Hợp lệ
        HT-->>SV: Điểm danh thành công
    else Ngoài phạm vi hoặc hết giờ
        HT-->>SV: Điểm danh không hợp lệ
    end
    HT-->>GV: Cập nhật danh sách điểm danh
```

---

## Thiết kế hệ thống

# Cơ chế xác thực điểm danh

<div class="h-full flex items-center justify-center -mt-12">

```mermaid {scale: 0.7}
flowchart LR
    A([Gửi yêu cầu điểm danh]) --> B{Phiên đang mở?}
    B -- Không --> X[Từ chối]
    B -- Có --> C{Thiết bị hợp lệ?}
    C -- Không --> X
    C -- Có --> D{Trong bán kính?}
    D -- Không --> X
    D -- Có --> OK([Ghi nhận thành công])
```
</div>

---

## Thiết kế hệ thống

# Vòng đời của một phiên

<div class="flex justify-center">

```mermaid {scale: 0.9}
stateDiagram-v2
    direction LR
    state "Pending" as pending
    state "Open" as open
    state "Closed" as closed
    [*] --> pending: Tạo phiên
    pending --> open: Đến giờ mở
    open --> closed: Đến giờ đóng
    closed --> [*]
```

</div>

Phiên tự mở và tự đóng theo thời gian đã cài đặt, không cần thao tác thủ công.

---

## Thiết kế hệ thống

# Mô hình dữ liệu

<div class="flex justify-center">
  <img src="/diagrams/database-erd.svg" style="width:70%; max-width:900px;">
</div>

---
layout: two-cols
---

## Thiết kế hệ thống

# Đơn vị và thẻ

<div class="mermaid-fit">

```mermaid
flowchart TD
    T[Trường] --> K1[Khoa A]
    T --> K2[Khoa B]
    K1 --> L1[Lớp 1]
    K1 --> L2[Lớp 2]
    K2 --> L3[Lớp 3]
```

</div>

::right::

<div class="flex flex-col justify-center" style="height: 420px;">

### Đơn vị

Cấu trúc phân cấp từ trường, khoa đến lớp. Mỗi người dùng thuộc một đơn vị cụ thể.

### Thẻ

Nhóm người dùng linh hoạt, không phụ thuộc vào cấu trúc đơn vị. Một người có thể được gắn nhiều thẻ.

</div>

<style>
.mermaid-fit {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mermaid-fit .mermaid svg {
  width: 100% !important;
  height: 100% !important;
  max-height: 420px;
}
</style>

---


## Thiết kế hệ thống

# Kiến trúc hệ thống

```mermaid {scale: 0.85}
flowchart LR
    W[Web client<br/>ReactJS] --> API
    M[Mobile client<br/>React Native + Expo] --> API
    M -.-> G[Play Integrity<br/>App Attest]
    subgraph Docker
        API[Backend<br/>NestJS]
        DB[(PostgreSQL)]
        R[(Redis)]
    end
    API --> DB
    API --> R
```

---
class: cards cols-3 center
---

## Công nghệ

# Công nghệ sử dụng

- **Web client**
  ![ReactJS](/logos/react.svg)\
  ReactJS
- **Mobile client**
  ![React Native](/logos/reactnative.svg) ![Expo](/logos/expo.svg)\
  React Native + Expo
- **Backend**
  ![NestJS](/logos/nestjs.svg)\
  NestJS
- **Database**
  ![PostgreSQL](/logos/postgresql.svg)\
  PostgreSQL
- **Cache**
  ![Redis](/logos/redis.svg)\
  Redis
- **Containerization**
  ![Docker](/logos/docker.svg)\
  Docker

---

## Giao diện

# Web & Mobile

<div class="grid grid-cols-2 gap-10 mt-8">

<div>

<img src="/screens/admin-dashboard.jpg" class="rounded-xl border border-white/10" style="width:100%; box-shadow:0 12px 30px rgba(0,0,0,0.4);">

### Web client
- Quản lý người dùng, đơn vị, thẻ
- Tạo và theo dõi phiên điểm danh
- Xem kết quả từng phiên

</div>

<div>

<img src="/screens/create-session.jpg" class="rounded-xl border border-white/10 mx-auto" style="height:300px; box-shadow:0 12px 30px rgba(0,0,0,0.4);">

### Mobile client
- Xem các phiên đang mở
- Điểm danh bằng vị trí hiện tại
- Xem lại lịch sử điểm danh

</div>

</div>

---


---
class: cards cols-3
---

## Đội ngũ

# Phân công công việc

- **Phan Lê Xuân Mạnh**
  - Phát triển Backend & API
  - Thiết kế cơ sở dữ liệu & hệ thống

- **Mai Quý Phước**
  - Phát triển Admin Dashboard
  - Quản lý phiên điểm danh & giao diện quản trị

- **Phạm Nguyễn Ngọc Phước**
  - Phát triển Mobile App
  - Tích hợp GPS & chức năng điểm danh

---
class: cards cols-3
---

## Tổng kết

# Kết quả và bài học

* **✅ Kết quả**

  * Hoàn thiện hệ thống điểm danh bằng GPS
  * Hoàn thiện Backend, Admin Dashboard và Mobile App

* **🧗 Khó khăn**

  * Đồng bộ dữ liệu giữa các thành phần của hệ thống
  * Xử lý xác thực và kiểm tra vị trí khi điểm danh

* **💡 Bài học**

  * Thiết kế kiến trúc rõ ràng giúp phát triển và bảo trì dễ dàng hơn
  * Cần kiểm thử từng chức năng trước khi tích hợp toàn hệ thống


---
class: cards cols-2
---

## Tương lai

# Hướng phát triển

- **📱 Ứng dụng di động** Thông báo khi phiên mở.
- **🛡️ Chống giả mạo vị trí** Phát hiện mock location.
- **📈 Báo cáo, thống kê** Theo đơn vị và thẻ.
- **📤 Xuất dữ liệu** Xuất ra Excel.

---
layout: center
class: hero text-center
---

# Cảm ơn đã lắng nghe!

> Câu hỏi & thảo luận

[GitHub Repo](https://github.com/xuanmanhneee/gps-attendance)