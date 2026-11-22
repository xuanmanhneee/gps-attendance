import { buildUnitTree } from '../src/features/attendance/unit-tree.ts';

Deno.test('buildUnitTree nests child units and keeps orphan units visible', () => {
  const tree = buildUnitTree([
    { code: 'DLU', name: 'Đại học Đà Lạt', parentCode: null },
    { code: 'CNTT', name: 'Khoa CNTT', parentCode: 'DLU' },
    { code: 'K47', name: 'CNTT K47', parentCode: 'CNTT' },
    { code: 'OTHER', name: 'Unit độc lập', parentCode: 'MISSING' },
  ]);

  if (
    tree.map((unit) => unit.code).join(',') !== 'DLU,OTHER' ||
    tree[0]?.children[0]?.code !== 'CNTT' ||
    tree[0]?.children[0]?.children[0]?.code !== 'K47'
  ) {
    throw new Error('Cây Unit không giữ đúng quan hệ cha con');
  }
});
