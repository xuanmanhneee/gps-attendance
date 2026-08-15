export interface User {
  id: number;
  username: string;
  // TODO: đây đang là plain text, sau này thay bằng password_hash + bcrypt/argon2
  password: string;
  role: string;
  fullname: string;
}