// 연말정산 계산 엔진 — 순수 함수. 세법 수치는 전부 rules 인자로 받는다(하드코딩 금지).
import type {
  CalcResult,
  CardCategory,
  CardResult,
  CreditLine,
  Inputs,
  Rules,
} from './types'

const floor = (n: number) => Math.floor(Math.max(0, n))
const nz = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

function pickTier<T extends { salaryUpTo: number | null }>(tiers: T[], salary: number): T {
  return tiers.find((t) => t.salaryUpTo === null || salary <= t.salaryUpTo) ?? tiers[tiers.length - 1]
}

export function earnedIncomeDeduction(rules: Rules, salary: number): number {
  const { brackets, cap } = rules.earnedIncomeDeduction
  const b = brackets.find((x) => x.upTo === null || salary <= x.upTo) ?? brackets[brackets.length - 1]
  return floor(Math.min(cap, b.base + (salary - b.from) * b.rate))
}

export function computeTax(rules: Rules, taxBase: number): { tax: number; rate: number } {
  const t = rules.taxRates.find((x) => x.upTo === null || taxBase <= x.upTo) ?? rules.taxRates[rules.taxRates.length - 1]
  return { tax: floor(taxBase * t.rate - t.progressiveDeduction), rate: t.rate }
}

export function earnedIncomeTaxCredit(rules: Rules, salary: number, computedTax: number) {
  const c = rules.earnedIncomeTaxCredit
  const raw =
    computedTax <= c.threshold
      ? computedTax * c.lowRate
      : c.highBase + (computedTax - c.threshold) * c.highRate
  const tier = pickTier(c.limits, salary)
  const limit = Math.max(tier.start - Math.max(0, salary - tier.from) * tier.rate, tier.floor)
  return { raw: floor(raw), limit: floor(limit), applied: floor(Math.min(raw, limit)) }
}

export function cardDeduction(rules: Rules, salary: number, inp: Inputs): CardResult {
  const r = rules.cardDeduction
  const cultureTreatedAsCredit = salary > r.cultureSalaryLimit
  const amounts: Record<CardCategory, number> = {
    credit: nz(inp.cardCredit),
    debitCash: nz(inp.cardDebitCash),
    culture: nz(inp.cardCulture),
    market: nz(inp.cardMarket),
    transit: nz(inp.cardTransit),
  }
  if (cultureTreatedAsCredit) {
    amounts[r.cultureOverLimitTreatAs] += amounts.culture
    amounts.culture = 0
  }
  const totalSpend = Object.values(amounts).reduce((a, b) => a + b, 0)
  const minSpend = floor(salary * r.minSpendRate)

  // 최저사용금액을 정해진 순서(공제율 낮은 것부터)로 차감
  let rem = minSpend
  const deductible = { credit: 0, debitCash: 0, culture: 0, market: 0, transit: 0 } as Record<CardCategory, number>
  for (const cat of r.minSpendOrder) {
    const sub = Math.min(amounts[cat], rem)
    rem -= sub
    deductible[cat] = amounts[cat] - sub
  }
  const deductionBy = {} as Record<CardCategory, number>
  let rawDeduction = 0
  for (const cat of Object.keys(deductible) as CardCategory[]) {
    deductionBy[cat] = deductible[cat] * r.rates[cat]
    rawDeduction += deductionBy[cat]
  }
  rawDeduction = floor(rawDeduction)

  const childIdx = Math.min(nz(inp.childrenUnder20), 2)
  const baseTier = pickTier(r.baseLimit, salary)
  const baseLimit = baseTier.byChildren[Math.min(childIdx, baseTier.byChildren.length - 1)]
  const baseApplied = Math.min(rawDeduction, baseLimit)
  const over = rawDeduction - baseApplied

  const extraTier = pickTier(r.extraLimit, salary)
  const extraSource = floor(extraTier.categories.reduce((a, c) => a + deductionBy[c], 0))
  const extraApplied = floor(Math.min(over, extraTier.amount, extraSource))

  return {
    minSpend,
    totalSpend,
    minReached: totalSpend > minSpend,
    deductible,
    rawDeduction,
    baseLimit,
    baseApplied,
    extraLimit: extraTier.amount,
    extraSource,
    extraApplied,
    deduction: baseApplied + extraApplied,
    baseLimitReached: rawDeduction >= baseLimit,
    cultureTreatedAsCredit,
  }
}

function childCredit(rules: Rules, n: number): number {
  const c = rules.childTaxCredit
  const count = Math.floor(nz(n))
  if (count < c.totalsByCount.length) return c.totalsByCount[count]
  const last = c.totalsByCount.length - 1
  return c.totalsByCount[last] + (count - last) * c.perChildFromThird
}

function medicalCredit(rules: Rules, salary: number, self: number, other: number): number {
  const m = rules.medicalCredit
  const threshold = salary * m.thresholdRate
  const generalExcess = nz(other) - threshold
  const base =
    generalExcess >= 0
      ? Math.min(generalExcess, m.generalCap) + nz(self)
      : Math.max(0, nz(self) + generalExcess) // 남은 문턱은 본인 등 의료비에서 차감
  return floor(base * m.rate)
}

/** 연말정산 결정세액·환급액 계산. 금액 단위: 원 */
export function calculate(rules: Rules, inp: Inputs): CalcResult {
  const salary = nz(inp.salary)

  // 1) 근로소득금액
  const eid = earnedIncomeDeduction(rules, salary)
  const earnedIncome = floor(salary - eid)

  // 2) 소득공제
  const p = rules.personalDeduction
  const personalBasic = Math.max(1, Math.floor(nz(inp.dependents))) * p.basicPerPerson
  const personalAdditional =
    Math.floor(nz(inp.elderlyCount)) * p.additional.elderly +
    Math.floor(nz(inp.disabledCount)) * p.additional.disabled +
    (inp.singleParent ? p.additional.singleParent : inp.womanHead ? p.additional.womanHead : 0)
  const nationalPension = floor(nz(inp.nationalPension) * rules.socialInsurance.nationalPensionRate)
  const healthEmployment = floor(nz(inp.healthEmployment) * rules.socialInsurance.healthEmploymentRate)

  const hs = rules.housingSubscription
  const housingDeduction =
    inp.housingEligible && salary <= hs.salaryLimit
      ? floor(Math.min(nz(inp.housingSubscription), hs.annualCap) * hs.rate)
      : 0

  const card = cardDeduction(rules, salary, inp)

  const totalIncomeDeduction =
    personalBasic + personalAdditional + nationalPension + healthEmployment + housingDeduction + card.deduction
  const taxBase = floor(earnedIncome - totalIncomeDeduction)

  // 3) 산출세액
  const { tax: computedTax, rate: marginalRate } = computeTax(rules, taxBase)

  // 4) 세액공제
  const eitc = earnedIncomeTaxCredit(rules, salary, computedTax)
  const child = childCredit(rules, inp.childrenForCredit)
  const b = rules.birthTaxCredit
  const birth =
    (inp.birthFirst ? b.first : 0) + (inp.birthSecond ? b.second : 0) + Math.floor(nz(inp.birthThirdPlus)) * b.thirdPlus

  const pa = rules.pensionAccountCredit
  const pensionBase = Math.min(Math.min(nz(inp.pensionSavings), pa.savingsCap) + nz(inp.irp), pa.totalCap)
  const pension = floor(pensionBase * (salary <= pa.salaryThreshold ? pa.lowRate : pa.highRate))

  const ins = floor(Math.min(nz(inp.insurance), rules.insuranceCredit.cap) * rules.insuranceCredit.rate)
  const med = medicalCredit(rules, salary, inp.medicalSelf, inp.medicalOther)
  const e = rules.educationCredit
  const eduBase =
    nz(inp.eduSelf) +
    Math.min(nz(inp.eduSchool), Math.floor(nz(inp.eduSchoolCount)) * e.schoolCapPerPerson) +
    Math.min(nz(inp.eduCollege), Math.floor(nz(inp.eduCollegeCount)) * e.collegeCapPerPerson)
  const edu = floor(eduBase * e.rate)
  const d = rules.donationCredit
  const don = floor(
    Math.min(nz(inp.donation), d.threshold) * d.lowRate + Math.max(0, nz(inp.donation) - d.threshold) * d.highRate,
  )
  const specialCreditSum = ins + med + edu + don

  const rc = rules.rentCredit
  const rent =
    inp.rentEligible && salary <= rc.salaryLimit
      ? floor(Math.min(nz(inp.rent), rc.annualCap) * (salary <= rc.salaryThreshold ? rc.lowRate : rc.highRate))
      : 0

  const itemizedSum = specialCreditSum + rent
  const usesStandard = rules.standardTaxCredit >= itemizedSum
  const standardCredit = usesStandard ? rules.standardTaxCredit : 0

  const credits: CreditLine[] = [
    { key: 'eitc', label: '근로소득세액공제', amount: eitc.applied },
    { key: 'child', label: '자녀세액공제', amount: child },
    { key: 'birth', label: '출산·입양 세액공제', amount: birth },
    { key: 'pension', label: '연금계좌 세액공제', amount: pension },
  ]
  if (usesStandard) {
    credits.push({ key: 'standard', label: '표준세액공제', amount: standardCredit })
  } else {
    credits.push(
      { key: 'insurance', label: '보장성 보험료', amount: ins },
      { key: 'medical', label: '의료비', amount: med },
      { key: 'education', label: '교육비', amount: edu },
      { key: 'donation', label: '기부금', amount: don },
      { key: 'rent', label: '월세 세액공제', amount: rent },
    )
  }
  const totalCredit = credits.reduce((a, c) => a + c.amount, 0)
  const decidedTax = floor(computedTax - totalCredit)
  const decidedLocalTax = floor(decidedTax * rules.localIncomeTaxRate)

  // 5) 기납부세액
  let withheldIncomeTax = nz(inp.withheldIncomeTax)
  const withheldEstimated = inp.withheldMode === 'estimate'
  if (withheldEstimated) withheldIncomeTax = estimateWithholding(rules, inp)
  const withheldLocalTax = floor(withheldIncomeTax * rules.localIncomeTaxRate)

  const refund = withheldIncomeTax + withheldLocalTax - (decidedTax + decidedLocalTax)

  return {
    salary,
    earnedIncomeDeduction: eid,
    earnedIncome,
    personalBasic,
    personalAdditional,
    nationalPension,
    healthEmployment,
    housingDeduction,
    card,
    totalIncomeDeduction,
    taxBase,
    marginalRate,
    computedTax,
    earnedIncomeTaxCreditRaw: eitc.raw,
    earnedIncomeTaxCreditLimit: eitc.limit,
    earnedIncomeTaxCredit: eitc.applied,
    childCredit: child,
    birthCredit: birth,
    pensionCredit: pension,
    insuranceCredit: ins,
    medicalCredit: med,
    educationCredit: edu,
    donationCredit: don,
    specialCreditSum,
    rentCredit: rent,
    itemizedSum,
    standardCredit,
    usesStandard,
    credits,
    totalCredit,
    decidedTax,
    decidedLocalTax,
    withheldIncomeTax,
    withheldLocalTax,
    withheldEstimated,
    refund,
  }
}

/**
 * 기납부세액 대략 추정 — 인적공제·4대보험·근로소득세액공제·자녀세액공제·표준세액공제만 반영한
 * 결정세액. 실제 간이세액표 원천징수액과 다를 수 있으므로 UI 에 반드시 '추정' 표시.
 */
export function estimateWithholding(rules: Rules, inp: Inputs): number {
  const base: Inputs = {
    ...inp,
    birthFirst: false,
    birthSecond: false,
    birthThirdPlus: 0,
    cardCredit: 0,
    cardDebitCash: 0,
    cardCulture: 0,
    cardMarket: 0,
    cardTransit: 0,
    housingEligible: false,
    housingSubscription: 0,
    pensionSavings: 0,
    irp: 0,
    rentEligible: false,
    rent: 0,
    insurance: 0,
    medicalSelf: 0,
    medicalOther: 0,
    eduSelf: 0,
    eduSchool: 0,
    eduCollege: 0,
    donation: 0,
    withheldMode: 'input',
    withheldIncomeTax: 0,
  }
  return calculate(rules, base).decidedTax
}
