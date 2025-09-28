export type SelectedVariant = 'variant-1' | 'variant-2' | 'variant-3' | 'variant-4';

export function assertSelectedVariant(value: string): SelectedVariant {
  if (!['variant-1', 'variant-2', 'variant-3', 'variant-4'].includes(value)) {
    throw new Error('Invalid selected variant');
  }
  return value as SelectedVariant;
}
