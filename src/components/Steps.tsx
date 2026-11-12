import type { Inputs, Rules } from '../lib/types'
import { manwon, pct, won } from '../lib/format'
import { Group, MoneyInput, Stepper, Toggle } from './fields'

export interface StepProps {
  inp: Inputs
  set: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void
  rules: Rules
}

export function StepBasic({ inp, set, rules }: StepProps) {
  const p = rules.personalDeduction
  return (
    <div className="space-y-4">
      <Group title="총급여" desc="비과세 소득(식대 등)을 뺀 연간 급여 총액. 원천징수영수증·급여명세서 합계로 확인할 수 있어요.">
        <MoneyInput
          label="총급여 (연)"
          value={inp.salary}
          onChange={(v) => set('salary', v)}
          steps={[1_000_000, 10_000_000, 50_000_000]}
        />
      </Group>

      <Group title="인적공제" desc={`기본공제 1인당 ${manwon(p.basicPerPerson)}을 과세표준에서 빼 줘요.`}>
        <Stepper
          label="기본공제 인원 (본인 포함)"
          value={inp.dependents}
          min={1}
          max={12}
          onChange={(v) => set('dependents', v)}
          help="본인 + 소득요건을 충족하는 배우자·부양가족 수"
        />
        <Stepper
          label={`경로우대 (70세 이상) · +${manwon(p.additional.elderly)}`}
          value={inp.elderlyCount}
          onChange={(v) => set('elderlyCount', v)}
        />
        <Stepper
          label={`장애인 · +${manwon(p.additional.disabled)}`}
          value={inp.disabledCount}
          onChange={(v) => set('disabledCount', v)}
        />
        <Toggle
          label={`한부모 · +${manwon(p.additional.singleParent)}`}
          checked={inp.singleParent}
          onChange={(v) => set('singleParent', v)}
        />
        <Toggle
          label={`부녀자 · +${manwon(p.additional.womanHead)}`}
          checked={inp.womanHead}
          onChange={(v) => set('womanHead', v)}
          help={p.note}
        />
      </Group>

      <Group title="자녀" desc="자녀 수는 두 가지로 나눠 받아요. 기준 나이가 서로 달라요.">
        <Stepper
          label="20세 이하 자녀 수"
          value={inp.childrenUnder20}
          onChange={(v) => set('childrenUnder20', v)}
          help="기본공제 대상인 20세 이하 직계비속. 신용카드 소득공제 기본한도를 늘리는 데 쓰여요 (1명 / 2명 이상)."
        />
        <Stepper
          label="9세 이상 20세 이하 자녀 수"
          value={inp.childrenForCredit}
          onChange={(v) => set('childrenForCredit', v)}
          help={`자녀세액공제 대상: ${rules.childTaxCredit.ageNote}`}
        />
        <div className="space-y-4 rounded-2xl bg-ink-900/60 p-4">
          <p className="text-xs font-semibold text-slate-300">{rules.taxYear}년에 출생·입양한 자녀</p>
          <Toggle label={`첫째 · ${manwon(rules.birthTaxCredit.first)}`} checked={inp.birthFirst} onChange={(v) => set('birthFirst', v)} />
          <Toggle label={`둘째 · ${manwon(rules.birthTaxCredit.second)}`} checked={inp.birthSecond} onChange={(v) => set('birthSecond', v)} />
          <Stepper
            label={`셋째 이상 · 1명당 ${manwon(rules.birthTaxCredit.thirdPlus)}`}
            value={inp.birthThirdPlus}
            max={5}
            onChange={(v) => set('birthThirdPlus', v)}
          />
        </div>
      </Group>

      <Group title="4대보험 (연간 본인 부담분)" desc="급여명세서의 국민연금·건강보험·장기요양·고용보험 공제액 1년 합계. 전액 소득공제돼요.">
        <MoneyInput label="국민연금" value={inp.nationalPension} onChange={(v) => set('nationalPension', v)} />
        <MoneyInput
          label="건강·장기요양·고용보험"
          value={inp.healthEmployment}
          onChange={(v) => set('healthEmployment', v)}
        />
      </Group>
    </div>
  )
}

export function StepCard({ inp, set, rules }: StepProps) {
  const c = rules.cardDeduction
  const over = inp.salary > c.cultureSalaryLimit
  return (
    <div className="space-y-4">
      <Group
        title="신용카드 등 사용액"
        desc={`총급여의 ${pct(c.minSpendRate)}(최저사용금액)를 넘게 쓴 금액부터 공제돼요. 최저사용금액은 공제율이 낮은 신용카드부터 차감합니다.`}
      >
        <MoneyInput
          label="신용카드"
          badge={pct(c.rates.credit)}
          value={inp.cardCredit}
          onChange={(v) => set('cardCredit', v)}
          help="아래 문화·전통시장·대중교통 사용분은 빼고 입력하세요."
        />
        <MoneyInput
          label="체크카드 · 현금영수증"
          badge={pct(c.rates.debitCash)}
          value={inp.cardDebitCash}
          onChange={(v) => set('cardDebitCash', v)}
        />
        <MoneyInput
          label="도서·공연·박물관·문화체육"
          badge={over ? '신용카드율 적용' : pct(c.rates.culture)}
          value={inp.cardCulture}
          onChange={(v) => set('cardCulture', v)}
          help={over ? c.cultureOverLimitNote : `총급여 ${manwon(c.cultureSalaryLimit)} 이하만 ${pct(c.rates.culture)} 적용`}
        />
        <MoneyInput
          label="전통시장"
          badge={pct(c.rates.market)}
          value={inp.cardMarket}
          onChange={(v) => set('cardMarket', v)}
        />
        <MoneyInput
          label="대중교통"
          badge={pct(c.rates.transit)}
          value={inp.cardTransit}
          onChange={(v) => set('cardTransit', v)}
          steps={[10_000, 100_000, 1_000_000]}
        />
      </Group>
    </div>
  )
}

export function StepDeductions({ inp, set, rules }: StepProps) {
  const pa = rules.pensionAccountCredit
  const rc = rules.rentCredit
  const hs = rules.housingSubscription
  const m = rules.medicalCredit
  const e = rules.educationCredit
  const low = inp.salary <= pa.salaryThreshold
  return (
    <div className="space-y-4">
      <Group
        title="연금계좌"
        desc={`연금저축 연 ${manwon(pa.savingsCap)}, IRP 합산 ${manwon(pa.totalCap)}까지 ${pct(low ? pa.lowRate : pa.highRate)} 세액공제 (총급여 ${manwon(pa.salaryThreshold)} ${low ? '이하' : '초과'}).`}
      >
        <MoneyInput label="연금저축 납입액" value={inp.pensionSavings} onChange={(v) => set('pensionSavings', v)} />
        <MoneyInput label="IRP 납입액" value={inp.irp} onChange={(v) => set('irp', v)} />
      </Group>

      <Group title="주거" desc="무주택 세대 요건이 필요해요.">
        <Toggle
          label="주택청약저축 공제 대상"
          checked={inp.housingEligible}
          onChange={(v) => set('housingEligible', v)}
          help={`총급여 ${manwon(hs.salaryLimit)} 이하 무주택 세대주(또는 배우자). 연 ${manwon(hs.annualCap)} 한도 납입액의 ${pct(hs.rate)} 소득공제.`}
        />
        {inp.housingEligible && (
          <MoneyInput label="주택청약 연 납입액" value={inp.housingSubscription} onChange={(v) => set('housingSubscription', v)} />
        )}
        <Toggle
          label="월세 세액공제 대상"
          checked={inp.rentEligible}
          onChange={(v) => set('rentEligible', v)}
          help={`총급여 ${manwon(rc.salaryLimit)} 이하 무주택 세대. 연 ${manwon(rc.annualCap)} 한도, ${pct(rc.lowRate)}(총급여 ${manwon(rc.salaryThreshold)} 이하) / ${pct(rc.highRate)}. ${rc.note}`}
        />
        {inp.rentEligible && <MoneyInput label="연간 월세 지급액" value={inp.rent} onChange={(v) => set('rent', v)} />}
      </Group>

      <Group title="보험료 · 의료비" desc="특별세액공제 항목이에요. 합계가 표준세액공제보다 작으면 표준세액공제가 자동 적용됩니다.">
        <MoneyInput
          label="보장성 보험료"
          value={inp.insurance}
          onChange={(v) => set('insurance', v)}
          help={`연 ${manwon(rules.insuranceCredit.cap)} 한도 ${pct(rules.insuranceCredit.rate)}`}
        />
        <MoneyInput
          label="의료비 — 본인·65세 이상·장애인"
          value={inp.medicalSelf}
          onChange={(v) => set('medicalSelf', v)}
          help="한도 없음"
        />
        <MoneyInput
          label="의료비 — 그 외 가족"
          value={inp.medicalOther}
          onChange={(v) => set('medicalOther', v)}
          help={`총급여의 ${pct(m.thresholdRate)}${inp.salary ? `(${won(inp.salary * m.thresholdRate)})` : ''}를 넘는 의료비의 ${pct(m.rate)}. 일반 의료비 한도 ${manwon(m.generalCap)}.`}
        />
      </Group>

      <Group title="교육비 · 기부금" desc={`교육비 ${pct(e.rate)} 세액공제.`}>
        <MoneyInput label="교육비 — 본인" value={inp.eduSelf} onChange={(v) => set('eduSelf', v)} help="한도 없음" />
        <MoneyInput
          label="교육비 — 취학전·초중고"
          value={inp.eduSchool}
          onChange={(v) => set('eduSchool', v)}
          help={`1인당 ${manwon(e.schoolCapPerPerson)} 한도`}
        />
        {inp.eduSchool > 0 && (
          <Stepper label="취학전·초중고 인원" value={inp.eduSchoolCount} onChange={(v) => set('eduSchoolCount', v)} />
        )}
        <MoneyInput
          label="교육비 — 대학생"
          value={inp.eduCollege}
          onChange={(v) => set('eduCollege', v)}
          help={`1인당 ${manwon(e.collegeCapPerPerson)} 한도`}
        />
        {inp.eduCollege > 0 && (
          <Stepper label="대학생 인원" value={inp.eduCollegeCount} onChange={(v) => set('eduCollegeCount', v)} />
        )}
        <MoneyInput
          label="기부금"
          value={inp.donation}
          onChange={(v) => set('donation', v)}
          help={`${manwon(rules.donationCredit.threshold)} 이하 ${pct(rules.donationCredit.lowRate)}, 초과분 ${pct(rules.donationCredit.highRate)}`}
        />
      </Group>
    </div>
  )
}

export function StepWithheld({ inp, set, rules, estimated }: StepProps & { estimated: number }) {
  return (
    <div className="space-y-4">
      <Group
        title="기납부세액"
        desc="매달 월급에서 미리 떼인 소득세의 1년 합계예요. 이 금액이 결정세액보다 많으면 돌려받습니다."
      >
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-ink-900 p-1">
          {(['input', 'estimate'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set('withheldMode', m)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                inp.withheldMode === m ? 'bg-ink-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'input' ? '직접 입력' : '대략 추정'}
            </button>
          ))}
        </div>
        {inp.withheldMode === 'input' ? (
          <MoneyInput
            label="연간 소득세 원천징수액"
            value={inp.withheldIncomeTax}
            onChange={(v) => set('withheldIncomeTax', v)}
            help={
              <>
                급여명세서의 <b className="text-slate-200">‘소득세’</b> 항목 1~12월 합계 (지방소득세 제외). 연말까지 남은 달은
                최근 월 금액으로 채워 넣으세요. 지방소득세({pct(rules.localIncomeTaxRate)})는 자동 계산돼요.
              </>
            }
          />
        ) : (
          <div className="rounded-2xl border border-gold-400/30 bg-gold-400/5 p-4">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[11px] font-bold text-gold-300">추정</span>
              <span className="tabular text-lg font-bold text-white">{won(estimated)}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{rules.withholdingEstimate.note}</p>
          </div>
        )}
      </Group>
    </div>
  )
}
