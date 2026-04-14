export type QuoteTaxBreakdown = {
  rate: number;
  baseOneTime: number;
  taxOneTime: number;
  totalOneTime: number;
  baseMonthly: number;
  taxMonthly: number;
  totalMonthly: number;
  baseAnnual: number;
  taxAnnual: number;
  totalAnnual: number;
  totalBase: number;
  totalTax: number;
  grandTotal: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addTaxFromBase(base: number, rate: number) {
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return { base: roundMoney(Math.max(base, 0)), tax: 0, total: roundMoney(Math.max(base, 0)) };
  }

  const normalizedBase = roundMoney(base);
  const tax = roundMoney(normalizedBase * (rate / 100));
  const total = roundMoney(normalizedBase + tax);

  return { base: normalizedBase, tax, total };
}

export function calculateQuoteTaxBreakdown({
  totalOneTime,
  totalMonthly,
  totalAnnual = 0,
  taxRate,
}: {
  totalOneTime: number;
  totalMonthly: number;
  totalAnnual?: number;
  taxRate?: number | null;
}): QuoteTaxBreakdown {
  const rate = Number(taxRate || 0);
  const oneTime = Number(totalOneTime || 0);
  const monthly = Number(totalMonthly || 0);
  const annual = Number(totalAnnual || 0);

  const oneTimeValues = addTaxFromBase(oneTime, rate);
  const monthlyValues = addTaxFromBase(monthly, rate);
  const annualValues = addTaxFromBase(annual, rate);

  return {
    rate,
    baseOneTime: oneTimeValues.base,
    taxOneTime: oneTimeValues.tax,
    totalOneTime: oneTimeValues.total,
    baseMonthly: monthlyValues.base,
    taxMonthly: monthlyValues.tax,
    totalMonthly: monthlyValues.total,
    baseAnnual: annualValues.base,
    taxAnnual: annualValues.tax,
    totalAnnual: annualValues.total,
    totalBase: roundMoney(oneTimeValues.base + monthlyValues.base + annualValues.base),
    totalTax: roundMoney(oneTimeValues.tax + monthlyValues.tax + annualValues.tax),
    grandTotal: roundMoney(oneTimeValues.total + monthlyValues.total + annualValues.total),
  };
}
