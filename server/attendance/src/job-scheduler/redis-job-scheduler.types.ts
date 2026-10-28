export interface JobEnvelope<T = unknown> {
  id: string; // để cancel() tìm đúng job
  type: string; // để tick() biết tra handler nào trong Map từ onJob()
  payload: T; // chính là cái bạn truyền vào schedule(type, runAt, payload) — dữ liệu domain thật sự
  attempts: number; // đếm số lần đã retry để giãn thời gian thử lại
  generation?: string; // phân biệt job mới khi cùng id được lên lịch lại
}
