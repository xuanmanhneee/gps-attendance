SELECT setval(
  pg_get_serial_sequence('"users"', 'id'),
  GREATEST(
    COALESCE((SELECT MAX("id") FROM "users"), 0),
    COALESCE(pg_sequence_last_value(pg_get_serial_sequence('"users"', 'id')::regclass), 0),
    1
  ),
  true
);

SELECT setval(
  pg_get_serial_sequence('"accounts"', 'id'),
  GREATEST(
    COALESCE((SELECT MAX("id") FROM "accounts"), 0),
    COALESCE(pg_sequence_last_value(pg_get_serial_sequence('"accounts"', 'id')::regclass), 0),
    1
  ),
  true
);
