export function getCategoryColor(key: string): string {
  const map: Record<string, string> = {
    FIXED: '#1f77b4',
    FIXED_PREVIEW: '#ff7f0e',
    LOAN: '#2ca02c',
    CREDIT_CARD: '#d62728',
    SUBSCRIPTION: '#9467bd',
    INSTALLMENT_PAYMENT: '#8c564b',
    ACCOUNT_PAYMENT: '#e377c2',
    OTHER: '#7f7f7f',
    default: '#7f7f7f',
  };

  return map[key] ?? map.default;
}
