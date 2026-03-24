export type QuoteTaxBreakdown = {
  rate: number;
  baseOneTime: number;
  taxOneTime: number;
  totalOneTime: number;
  baseMonthly: number;
  taxMonthly: number;
  totalMonthly: number;
  totalBase: number;
  totalTax: number;
  grandTotal: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function extractIncludedTax(total: number, rate: number) {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return { base: roundMoney(Math.max(total, 0)), tax: 0 };
  }

  const divisor = 1 + rate / 100;
  const base = roundMoney(total / divisor);
  const tax = roundMoney(total - base);

  return { base, tax };
}

export function calculateQuoteTaxBreakdown({
  totalOneTime,
  totalMonthly,
  taxRate,
}: {
  totalOneTime: number;
  totalMonthly: number;
  taxRate?: number | null;
}): QuoteTaxBreakdown {
  const rate = Number(taxRate || 0);
  const oneTime = Number(totalOneTime || 0);
  const monthly = Number(totalMonthly || 0);

  const oneTimeValues = extractIncludedTax(oneTime, rate);
  const monthlyValues = extractIncludedTax(monthly, rate);

  return {
    rate,
    baseOneTime: oneTimeValues.base,
    taxOneTime: oneTimeValues.tax,
    totalOneTime: roundMoney(oneTime),
    baseMonthly: monthlyValues.base,
    taxMonthly: monthlyValues.tax,
    totalMonthly: roundMoney(monthly),
    totalBase: roundMoney(oneTimeValues.base + monthlyValues.base),
    totalTax: roundMoney(oneTimeValues.tax + monthlyValues.tax),
    grandTotal: roundMoney(oneTime + monthly),
  };
}
