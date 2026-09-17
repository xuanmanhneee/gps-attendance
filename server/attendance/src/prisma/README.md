# Prisma

## Migration

Tạo migration sau khi thay đổi `schema.prisma`:

```bash
pnpm prisma migrate dev --name <migration_name>
```

Kiểm tra migration:

```bash
pnpm prisma migrate status
```

Reset database development:

```bash
pnpm prisma migrate reset
```

> Xóa toàn bộ dữ liệu và chạy lại migrations + seed.

## Seed

Chạy seed:

```bash
pnpm prisma db seed
```

Thứ tự seed:

```text
Users → Accounts → Tags
```

## Quy trình

### Thay đổi schema

```text
Sửa schema.prisma
    ↓
pnpm prisma migrate dev --name <migration_name>
    ↓
pnpm prisma db seed
    ↓
Test
    ↓
Commit
```

### Database bị drift

```bash
pnpm prisma migrate reset
```

Sau đó test lại.
