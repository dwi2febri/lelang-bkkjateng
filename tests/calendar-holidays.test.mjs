import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHolidays } from '../apps/web/src/features/catalog/services/holidays.ts';

test('kalender hanya menandai libur nasional dengan tanggal valid dan normalisasi tanggal API', () => {
  const holiday = (date, name, national = true) => ({ holiday_date: date, holiday_name: name, is_national_holiday: national });
  assert.deepEqual(normalizeHolidays([
    holiday('2026-8-17', 'Kemerdekaan'),
    holiday('2026-08-17', 'Kemerdekaan'),
    holiday('2026-1-1', 'Tahun Baru'),
    holiday('2026-02-30', 'Tanggal tidak valid'),
    holiday('2026-08-18', 'Libur daerah', false),
    holiday('2025-12-25', 'Tahun berbeda'),
    holiday('2026-13-01', 'Bulan tidak valid'),
    null, {},
  ], 2026), [
    { date: '2026-01-01', name: 'Tahun Baru' },
    { date: '2026-08-17', name: 'Kemerdekaan' },
  ]);
  assert.deepEqual(normalizeHolidays([], 2026), []);
  assert.throws(() => normalizeHolidays({ error: 'unavailable' }, 2026));
});
