import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type RegistrySeed = {
  code: string;
  latitude: number;
  longitude: number;
  type: 'BUILDING' | 'FACILITY';
};

const loadRegistrySeed = (): RegistrySeed[] => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      'prisma/migrations/20261004000200_add_location_registry/migration.sql',
    ),
    'utf8',
  );
  const pattern = /\(\(SELECT "id" FROM "campuses" WHERE "code" = 'DLU'\), '([^']+)', '[^']*', ([\d.]+), ([\d.]+), '(BUILDING|FACILITY)'/g;
  return [...sql.matchAll(pattern)].map((match) => ({
    code: match[1],
    latitude: Number(match[2]),
    longitude: Number(match[3]),
    type: match[4] as RegistrySeed['type'],
  }));
};

const haversineMeters = (a: RegistrySeed, b: RegistrySeed): number => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = radians(b.latitude - a.latitude);
  const deltaLongitude = radians(b.longitude - a.longitude);
  const value =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

describe('DLU location registry master data', () => {
  const entries = loadRegistrySeed();

  it('contains all 23 expected unique locations with valid, non-zero coordinates', () => {
    const expectedCodes = [
      'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
      'HOI_TRUONG_TV', 'NHA_THI_DAU', 'A11', 'NHA_GUI_XE',
      'A16', 'A18', 'A19', 'A20', 'A21', 'A24', 'A25', 'A27',
      'A30', 'A31', 'A32',
    ];

    expect(entries).toHaveLength(23);
    expect(new Set(entries.map((entry) => entry.code)).size).toBe(23);
    expect(entries.map((entry) => entry.code).sort()).toEqual(expectedCodes.sort());
    for (const entry of entries) {
      expect(entry.latitude).toBeGreaterThanOrEqual(-90);
      expect(entry.latitude).toBeLessThanOrEqual(90);
      expect(entry.longitude).toBeGreaterThanOrEqual(-180);
      expect(entry.longitude).toBeLessThanOrEqual(180);
      expect([entry.latitude, entry.longitude]).not.toEqual([0, 0]);
    }
  });

  it('keeps facilities separate from classroom buildings and flags the closest pair', () => {
    const facilities = entries.filter((entry) => entry.type === 'FACILITY');
    expect(facilities.map((entry) => entry.code).sort()).toEqual([
      'A25',
      'HOI_TRUONG_TV',
      'NHA_GUI_XE',
      'NHA_THI_DAU',
    ]);

    const pairs: Array<{ distance: number; key: string }> = [];
    for (let left = 0; left < entries.length; left += 1) {
      for (let right = left + 1; right < entries.length; right += 1) {
        pairs.push({
          distance: haversineMeters(entries[left], entries[right]),
          key: [entries[left].code, entries[right].code].sort().join('-'),
        });
      }
    }
    pairs.sort((a, b) => a.distance - b.distance);

    expect(pairs).toHaveLength(253);
    expect(pairs[0].key).toBe('A27-A5');
    expect(pairs[0].distance).toBeCloseTo(32.4, 0);
    expect(pairs.some((pair) => pair.key === 'A7-A8' && pair.distance < 45)).toBe(true);
  });
});
