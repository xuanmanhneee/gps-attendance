import type { ILmsRepository, LmsUser } from "../database/lms.repository.ts";

export class AuthService {
  private readonly sessions = new Map<string, LmsUser>();
  constructor(private readonly repository: ILmsRepository) {}

  async login(
    username: string,
    password: string,
  ): Promise<{ token: string; user: LmsUser } | null> {
    const account = this.repository.findAccount(username.trim().toLowerCase());
    if (!account || account.passwordHash !== await this.hash(password)) {
      return null;
    }
    const user = this.repository.findUser(account.userCode);
    if (!user || user.role !== "organizer") return null;
    const token = crypto.randomUUID();
    this.sessions.set(token, user);
    return { token, user };
  }

  authenticate(request: Request): LmsUser | null {
    const token = request.headers.get("authorization")?.replace(
      /^Bearer\s+/i,
      "",
    );
    return token ? this.sessions.get(token) ?? null : null;
  }

  logout(request: Request): void {
    const token = request.headers.get("authorization")?.replace(
      /^Bearer\s+/i,
      "",
    );
    if (token) this.sessions.delete(token);
  }

  private async hash(value: string): Promise<string> {
    // shortcut: SHA-256 is sufficient for the local demo; replace with Argon2 before real user deployment.
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(value),
    );
    return [...new Uint8Array(digest)].map((byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }
}
