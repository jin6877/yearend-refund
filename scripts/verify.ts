// 계산 엔진 단위 검증: npx tsx scripts/verify.ts
import { readFileSync } from 'node:fs'
import { calculate } from '../src/lib/calc.ts'
import { EMPTY_INPUTS } from '../src/lib/defaults.ts'
import type { Inputs, Rules } from '../src/lib/types.ts'

const rules: Rules = JSON.parse(readFileSync(new URL('../public/rules/2026.json', import.meta.url), 'utf8'))
const won = (n: number) => n.toLocaleString('ko-KR') + '원'
let fails = 0
function expect(label: string, got: number, want: number) {
  const ok = got === want
  if (!ok) fails++
  console.log(`${ok ? '  ✓' : '  ✗'} ${label.padEnd(22)} ${won(got).padStart(16)}${ok ? '' : `  (기대 ${won(want)})`}`)
}
function run(name: string, patch: Partial<Inputs>) {
  console.log(`\n■ ${name}`)
  return calculate(rules, { ...EMPTY_INPUTS, ...patch })
}

// 케이스 1: 총급여 5,000만, 본인만, 공제 없음
// 근로소득공제 = 1,200만 + (5,000만-4,500만)×5% = 1,225만
// 근로소득금액 = 3,775만, 과표 = 3,775만-150만 = 3,625만
// 산출세액 = 3,625만×15% - 126만 = 4,177,500
// 근로소득세액공제 = 71.5만 + (4,177,500-130만)×30% = 1,578,250 → 한도 max(74만-(1,700만×0.008), 66만)=66만
// 표준세액공제 13만 → 결정세액 = 4,177,500-660,000-130,000 = 3,387,500, 지방세 338,750
let r = run('총급여 5,000만 · 본인만 · 공제 없음 · 기납부 300만', { salary: 50_000_000, withheldIncomeTax: 3_000_000 })
expect('근로소득공제', r.earnedIncomeDeduction, 12_250_000)
expect('근로소득금액', r.earnedIncome, 37_750_000)
expect('인적공제', r.personalBasic, 1_500_000)
expect('과세표준', r.taxBase, 36_250_000)
expect('산출세액', r.computedTax, 4_177_500)
expect('근로세액공제(산식)', r.earnedIncomeTaxCreditRaw, 1_578_250)
expect('근로세액공제 한도', r.earnedIncomeTaxCreditLimit, 660_000)
expect('근로세액공제(적용)', r.earnedIncomeTaxCredit, 660_000)
expect('표준세액공제', r.standardCredit, 130_000)
expect('결정세액', r.decidedTax, 3_387_500)
expect('지방소득세', r.decidedLocalTax, 338_750)
// 기납부 300만+30만 - (3,387,500+338,750) = -426,250 (추가납부)
expect('환급(+)/납부(-)', r.refund, -426_250)

// 케이스 2: 총급여 3,000만, 카드 — 최저사용 750만
// 신용 600만 → 전액 최저에 충당(잔여 최저 150만), 체크 500만-150만=350만×30%=105만 → 한도 300만 이내
r = run('총급여 3,000만 · 신용 600만 · 체크 500만', { salary: 30_000_000, cardCredit: 6_000_000, cardDebitCash: 5_000_000 })
expect('최저사용금액', r.card.minSpend, 7_500_000)
expect('카드 소득공제', r.card.deduction, 1_050_000)
// 근로소득공제 750만+1,500만×15%=975만 → 근로소득금액 2,025만 - 150만 - 105만 = 1,770만
expect('과세표준', r.taxBase, 17_700_000)
// 1,770만×15%-126만 = 1,395,000
expect('산출세액', r.computedTax, 1_395_000)

// 케이스 3: 카드 기본한도 + 추가한도 (총급여 4,000만, 자녀 1명)
// 최저 1,000만: 신용 1,000만 전부 충당. 체크 1,500만×30%=450만, 전통시장 500만×40%=200만, 대중교통 100만×40%=40만
// 합 690만 → 기본한도(자녀1) 350만, 초과 340만 → 추가 min(340만, 300만, 240만)=240만 → 590만
r = run('총급여 4,000만 · 자녀1 · 카드 한도 초과', {
  salary: 40_000_000, childrenUnder20: 1,
  cardCredit: 10_000_000, cardDebitCash: 15_000_000, cardMarket: 5_000_000, cardTransit: 1_000_000,
})
expect('카드 공제(한도 전)', r.card.rawDeduction, 6_900_000)
expect('기본한도', r.card.baseLimit, 3_500_000)
expect('추가공제', r.card.extraApplied, 2_400_000)
expect('카드 소득공제', r.card.deduction, 5_900_000)

// 케이스 4: 세액공제 묶음 (총급여 5,000만)
// 연금저축 700만→600만 + IRP 400만 = 1,000만→900만 ×15% = 135만
// 자녀(9~20세) 3명 = 55만+40만 = 95만, 출산 첫째 30만
// 보험 120만→100만×12%=12만, 의료비: 문턱 150만, 그 외 가족 100만 → 남은 문턱 50만 → 본인 300만-50만=250만×15%=37.5만
// 교육: 본인 200만 + 초중고 2명 700만→600만 = 800만×15%=120만, 기부 1,200만 → 150만+60만=210만
// 월세 600만×17%=102만 → 항목합 481.5만 > 13만 → 표준공제 미적용
r = run('총급여 5,000만 · 세액공제 묶음', {
  salary: 50_000_000, dependents: 4, childrenForCredit: 3, birthFirst: true,
  pensionSavings: 7_000_000, irp: 4_000_000, insurance: 1_200_000,
  medicalSelf: 3_000_000, medicalOther: 1_000_000, eduSelf: 2_000_000, eduSchool: 7_000_000, eduSchoolCount: 2,
  donation: 12_000_000, rentEligible: true, rent: 6_000_000,
})
expect('연금계좌', r.pensionCredit, 1_350_000)
expect('자녀세액공제', r.childCredit, 950_000)
expect('출산·입양', r.birthCredit, 300_000)
expect('보험료', r.insuranceCredit, 120_000)
expect('의료비', r.medicalCredit, 375_000)
expect('교육비', r.educationCredit, 1_200_000)
expect('기부금', r.donationCredit, 2_100_000)
expect('월세', r.rentCredit, 1_020_000)
expect('표준세액공제', r.standardCredit, 0)
console.log(`  · 과세표준 ${won(r.taxBase)} / 산출세액 ${won(r.computedTax)} / 세액공제 ${won(r.totalCredit)} / 결정세액 ${won(r.decidedTax)}`)

// 케이스 5: 고소득 근로세액공제 한도 — 총급여 1.3억: max(50만-(1,000만×0.5), 20만) = 20만
r = run('총급여 1.3억 · 근로세액공제 하한', { salary: 130_000_000 })
expect('근로소득공제', r.earnedIncomeDeduction, 15_350_000)
expect('근로세액공제 한도', r.earnedIncomeTaxCreditLimit, 200_000)
// 총급여 7천만 초과 → 문화비는 신용카드 공제율로 취급
r = run('총급여 8,000만 · 문화비', { salary: 80_000_000, cardCulture: 1_000_000 })
console.log(`  · 문화비 신용카드 취급: ${r.card.cultureTreatedAsCredit}`)

console.log(fails === 0 ? '\n✅ 모든 검증 통과' : `\n❌ 실패 ${fails}건`)
process.exit(fails === 0 ? 0 : 1)
