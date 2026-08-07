export function generateNomorPesanan(lastNomor: string | null): string {
  if (!lastNomor) {
    return 'PSN-0001';
  }

  const parts = lastNomor.split('-');
  if (parts.length !== 2) {
    return 'PSN-0001';
  }

  const numberPart = parseInt(parts[1], 10);
  if (isNaN(numberPart)) {
    return 'PSN-0001';
  }

  const nextNumber = numberPart + 1;
  const nextNumberString = nextNumber.toString().padStart(4, '0');

  return `PSN-${nextNumberString}`;
}
