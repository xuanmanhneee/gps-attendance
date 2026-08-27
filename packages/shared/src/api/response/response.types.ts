export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse<TCode extends string = string> {
  success: false;
  code: TCode;
  message: string;
}

export type ApiResponse<T, TCode extends string = string> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse<TCode>;