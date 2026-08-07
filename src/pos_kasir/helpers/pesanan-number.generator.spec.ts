import { generateNomorPesanan } from './pesanan-number.generator';

describe('pesanan-number.generator', () => {
  it('seharusnya mengembalikan PSN-0001 jika tidak ada pesanan sebelumnya', () => {
    expect(generateNomorPesanan(null)).toBe('PSN-0001');
    expect(generateNomorPesanan('')).toBe('PSN-0001');
  });

  it('seharusnya menambahkan nomor urut secara berurutan', () => {
    expect(generateNomorPesanan('PSN-0001')).toBe('PSN-0002');
    expect(generateNomorPesanan('PSN-0099')).toBe('PSN-0100');
    expect(generateNomorPesanan('PSN-0999')).toBe('PSN-1000');
    expect(generateNomorPesanan('PSN-9999')).toBe('PSN-10000');
  });

  it('seharusnya kembali menjadi PSN-0001 jika format sebelumnya tidak valid', () => {
    expect(generateNomorPesanan('INVALID')).toBe('PSN-0001');
    expect(generateNomorPesanan('PSN-ABCD')).toBe('PSN-0001');
    expect(generateNomorPesanan('PSN')).toBe('PSN-0001');
  });
});
