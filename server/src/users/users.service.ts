import { Injectable } from '@nestjs/common';
import { User } from './user.model';

@Injectable()
export class UsersService {
  // Giả lập bảng account + user gộp lại cho đơn giản.
  // Sau này tách thành 2 bảng (account, user) như schema thật.
  private readonly users: User[] = [
    { id: 1, username: 'admin', password: '123456', role: 'admin', fullname: 'Quản trị viên' },
    { id: 2, username: 'student1', password: 'abcdef', role: 'student', fullname: 'Nguyễn Văn A' },
  ];

  async findByUsername(username: string): Promise<User | undefined> {
    return this.users.find((u) => u.username === username);
  }

  async findById(id: number): Promise<User | undefined> {
    return this.users.find((u) => u.id === id);
  }
}