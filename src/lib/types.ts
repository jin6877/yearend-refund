// 세법 수치는 전부 public/rules/<연도>.json 에 있다. 이 파일은 그 모양(타입)만 정의한다.

export interface Bracket {
  upTo: number | null
  from: number
  base: number
  rate: number
}

export interface TaxRate {
  upTo: number | null
  rate: number
  progressiveDeduction: number
}

export interface CreditLimitTier {
  salaryUpTo: number | null
  start: number
  from: number
  rate: number
  floor: number
}

export type CardCategory = 'credit' | 'debitCash' | 'culture' | 'market' | 'transit'

export interface Rules {
  version: string
  taxYear: number
  updatedAt: string
  sources: string[]
  pending: string[]
  pendingNote: string
  earnedIncomeDeduction: { brackets: Bracket[]; cap: number }
  taxRates: TaxRate[]
  earnedIncomeTaxCredit: {
    threshold: number
    lowRate: number
    highBase: number
    highRate: number
    limits: CreditLimitTier[]
  }
  personalDeduction: {
    basicPerPerson: number
    additional: { elderly: number; disabled: number; womanHead: number; singleParent: number }
    note: string
  }
  socialInsurance: { nationalPensionRate: number; healthEmploymentRate: number }
  cardDeduction: {
    minSpendRate: number
    rates: Record<CardCategory, number>
    cultureSalaryLimit: number
    cultureOverLimitTreatAs: CardCategory
    cultureOverLimitNote: string
    minSpendOrder: CardCategory[]
    baseLimit: { salaryUpTo: number | null; byChildren: number[] }[]
    extraLimit: { salaryUpTo: number | null; amount: number; categories: CardCategory[] }[]
  }
  housingSubscription: { salaryLimit: number; annualCap: number; rate: number }
  childTaxCredit: { ageNote: string; totalsByCount: number[]; perChildFromThird: number }
  birthTaxCredit: { first: number; second: number; thirdPlus: number }
  pensionAccountCredit: {
    savingsCap: number
    totalCap: number
    salaryThreshold: number
    lowRate: number
    highRate: number
  }
  rentCredit: {
    salaryLimit: number
    annualCap: number
    salaryThreshold: number
    lowRate: number
    highRate: number
    note: string
  }
  insuranceCredit: { cap: number; rate: number }
  medicalCredit: { thresholdRate: number; rate: number; generalCap: number }
  educationCredit: { rate: number; schoolCapPerPerson: number; collegeCapPerPerson: number }
  donationCredit: { threshold: number; lowRate: number; highRate: number }
  standardTaxCredit: number
  localIncomeTaxRate: number
  withholdingEstimate: { note: string }
}

export interface RulesIndex {
  years: number[]
  default: number
}

export interface Inputs {
  // ① 기본정보
  salary: number
  dependents: number // 본인 포함 기본공제 인원
  elderlyCount: number
  disabledCount: number
  womanHead: boolean
  singleParent: boolean
  childrenUnder20: number // 신용카드 기본한도용: 20세 이하 기본공제 대상 자녀
  childrenForCredit: number // 자녀세액공제용: 9세 이상 20세 이하
  birthFirst: boolean
  birthSecond: boolean
  birthThirdPlus: number
  nationalPension: number
  healthEmployment: number
  // ② 카드·현금
  cardCredit: number
  cardDebitCash: number
  cardCulture: number
  cardMarket: number
  cardTransit: number
  // ③ 공제 항목
  housingEligible: boolean
  housingSubscription: number
  pensionSavings: number
  irp: number
  rentEligible: boolean
  rent: number
  insurance: number
  medicalSelf: number // 본인·65세 이상·장애인
  medicalOther: number // 그 외 가족
  eduSelf: number
  eduSchool: number
  eduSchoolCount: number
  eduCollege: number
  eduCollegeCount: number
  donation: number
  // ④ 기납부세액
  withheldMode: 'input' | 'estimate'
  withheldIncomeTax: number
}

export interface CardResult {
  minSpend: number
  totalSpend: number
  minReached: boolean
  deductible: Record<CardCategory, number>
  rawDeduction: number
  baseLimit: number
  baseApplied: number
  extraLimit: number
  extraSource: number
  extraApplied: number
  deduction: number
  baseLimitReached: boolean
  cultureTreatedAsCredit: boolean
}

export interface CreditLine {
  key: string
  label: string
  amount: number
}

export interface CalcResult {
  salary: number
  earnedIncomeDeduction: number
  earnedIncome: number
  personalBasic: number
  personalAdditional: number
  nationalPension: number
  healthEmployment: number
  housingDeduction: number
  card: CardResult
  totalIncomeDeduction: number
  taxBase: number
  marginalRate: number
  computedTax: number
  earnedIncomeTaxCreditRaw: number
  earnedIncomeTaxCreditLimit: number
  earnedIncomeTaxCredit: number
  childCredit: number
  birthCredit: number
  pensionCredit: number
  insuranceCredit: number
  medicalCredit: number
  educationCredit: number
  donationCredit: number
  specialCreditSum: number
  rentCredit: number
  itemizedSum: number // 특별세액공제 + 월세
  standardCredit: number
  usesStandard: boolean
  credits: CreditLine[]
  totalCredit: number
  decidedTax: number
  decidedLocalTax: number
  withheldIncomeTax: number
  withheldLocalTax: number
  withheldEstimated: boolean
  refund: number // +환급 / -추가납부
}
