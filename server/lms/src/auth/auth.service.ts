import type { ILmsRepository, LmsUser } from "../database/lms.repository.ts";
import { verifyPassword } from "./password.ts";

export class AuthService {
  // shortcut: demo sessions live in memory, use a persistent expiring session store before production.
  private readonly webSessions = new Map<string, LmsUser>();
  private readonly mobileSessions = new Map<
    string,
    { user: LmsUser; refreshToken: string }
  >();
  private readonly mobileRefreshSessions = new Map<
    string,
    { user: LmsUser; accessToken: string }
  >();

  constructor(private readonly repository: ILmsRepository) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ token: string; user: LmsUser } | null> {
    const user = await this.validateCredentials(username, password);
    if (!user || !["admin", "lecturer"].includes(user.role)) return null;
    const token = crypto.randomUUID();
    this.webSessions.set(token, user);
    return { token, user };
  }

  async loginStudent(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const user = await this.validateCredentials(username, password);
    return user?.role === "student" ? this.issueMobileSession(user) : null;
  }

  refreshStudent(
    refreshToken: string,
  ): { accessToken: string; refreshToken: string } | null {
    const session = this.mobileRefreshSessions.get(refreshToken);
    if (!session) return null;
    this.mobileRefreshSessions.delete(refreshToken);
    this.mobileSessions.delete(session.accessToken);
    return this.issueMobileSession(session.user);
  }

  authenticate(request: Request): LmsUser | null {
    const token = request.headers.get("authorization")?.replace(
      /^Bearer\s+/i,
      "",
    );
    return token ? this.webSessions.get(token) ?? null : null;
  }

  authenticateStudent(request: Request): LmsUser | null {
    const token = this.bearerToken(request);
    return token ? this.mobileSessions.get(token)?.user ?? null : null;
  }

  logout(request: Request): void {
    const token = this.bearerToken(request);
    if (token) this.webSessions.delete(token);
  }

  logoutStudent(request: Request): void {
    const token = this.bearerToken(request);
    if (!token) return;
    const session = this.mobileSessions.get(token);
    this.mobileSessions.delete(token);
    if (session) this.mobileRefreshSessions.delete(session.refreshToken);
  }

  private async validateCredentials(
    username: string,
    password: string,
  ): Promise<LmsUser | null> {
    const account = this.repository.findAccount(username.trim().toLowerCase());
    if (!account || !await verifyPassword(password, account.passwordHash)) {
      return null;
    }
    return this.repository.findUser(account.userCode);
  }

  private issueMobileSession(
    user: LmsUser,
  ): { accessToken: string; refreshToken: string } {
    const accessToken = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    this.mobileSessions.set(accessToken, { user, refreshToken });
    this.mobileRefreshSessions.set(refreshToken, { user, accessToken });
    return { accessToken, refreshToken };
  }

  private bearerToken(request: Request): string | null {
    return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      null;
  }
}
