export interface JobEnvelope<T = unknown> {
  id: string; // để cancel() tìm đúng job, và để retryOrDrop() ghi đè lại đúng entry
  type: string; // để tick() biết tra handler nào trong Map từ onJob()
  payload: T; // chính là cái bạn truyền vào schedule(type, runAt, payload) — dữ liệu domain thật sự
  attempts: number; // đếm số lần đã retry, để so với MAX_ATTEMPTS
}
