import { useEffect, useMemo, useRef, useState } from 'react'
import { calculate } from '../lib/calc'
import { manwon, pct, won } from '../lib/format'
import type { CalcResult, Inputs, Rules } from '../lib/types'

function useCountUp(target: number, ms = 600) {
  const [v, setV] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      const e = 1 - Math.pow(1 - k, 3)
      const cur = a + (target - a) * e
      setV(cur)
      from.current = cur
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

export function ResultHero({ r }: { r: CalcResult }) {
  const refund = r.refund >= 0
  const shown = useCountUp(Math.abs(r.refund))
  const empty = r.salary === 0
  const state = empty ? 'empty' : refund ? 'refund' : 'pay'
  return (
    <div className="border-2 border-carbon bg-paper">
      <div className="flex items-baseline justify-between gap-3 border-b border-carbon bg-cell px-4 py-2.5">
        <h2 className="font-myeongjo text-base font-extrabold text-carbon">차감징수세액</h2>
        <span className="text-[11px] text-mute">소득세와 지방소득세 합산</span>
      </div>
      <div className="relative px-5 pb-6 pt-5">
        {!empty && (
          <div
            key={state}
            aria-hidden
            className="seal animate-stamp pointer-events-none absolute right-4 top-3 grid h-[5.5rem] w-[5.5rem] place-items-center rounded-full"
          >
            <span className="font-myeongjo text-[1.6rem] font-extrabold leading-none">{refund ? '환급' : '납부'}</span>
          </div>
        )}
        <p className="text-sm text-mute">
          {empty ? '총급여를 적으면 계산돼요' : refund ? '연말정산에서 돌려받을 금액' : '연말정산에서 더 낼 금액'}
          {r.withheldEstimated && <span className="ml-1.5 text-xs text-carbon">(기납부세액 추정)</span>}
        </p>
        <p
          className={`tabular font-myeongjo mt-2 text-[2.6rem] font-extrabold leading-none tracking-tight sm:text-5xl ${
            empty ? 'text-carbon-soft' : refund ? 'text-carbon' : 'text-seal'
          }`}
        >
          {empty ? '—' : Math.round(shown).toLocaleString('ko-KR')}
          <span className="ml-1.5 font-sans text-lg font-semibold text-mute">원</span>
        </p>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-carbon-soft border-t border-carbon-soft">
        <div className="px-4 py-3">
          <dt className="text-[11px] text-mute">결정세액 (지방세 포함)</dt>
          <dd className="tabular mt-1 text-base font-semibold text-ink">{won(r.decidedTax + r.decidedLocalTax)}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[11px] text-mute">기납부세액 (지방세 포함)</dt>
          <dd className="tabular mt-1 text-base font-semibold text-ink">{won(r.withheldIncomeTax + r.withheldLocalTax)}</dd>
        </div>
      </dl>
    </div>
  )
}

function Row({ label, value, sub, strong, minus, indent }: {
  label: string
  value: number
  sub?: string
  strong?: boolean
  minus?: boolean
  indent?: boolean
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${strong ? 'mt-1 border-t border-carbon pt-2.5' : ''}`}>
      <div className={indent ? 'pl-3' : ''}>
        <span className={`text-sm ${strong ? 'font-semibold text-carbon' : indent ? 'text-mute' : 'text-ink'}`}>
          {label}
        </span>
        {sub && <p className="text-[11px] text-mute">{sub}</p>}
      </div>
      <span
        className={`tabular shrink-0 text-sm ${strong ? 'font-semibold text-carbon' : minus && value > 0 ? 'text-mute' : 'text-ink'}`}
      >
        {minus && value > 0 ? '−' : ''}
        {won(value)}
      </span>
    </div>
  )
}

export function Breakdown({ r }: { r: CalcResult }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-carbon/50 bg-paper">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-cell"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-carbon">단계별 계산 근거</span>
        <span className="text-xs text-mute">{open ? '접기' : '펼치기'}</span>
      </button>
      {open && (
        <div className="border-t border-carbon-soft px-4 pb-4 pt-2">
          <Row label="총급여" value={r.salary} />
          <Row label="근로소득공제" value={r.earnedIncomeDeduction} minus />
          <Row label="근로소득금액" value={r.earnedIncome} strong />
          <Row label="인적공제 (기본)" value={r.personalBasic} minus indent />
          {r.personalAdditional > 0 && <Row label="인적공제 (추가)" value={r.personalAdditional} minus indent />}
          {r.nationalPension > 0 && <Row label="국민연금" value={r.nationalPension} minus indent />}
          {r.healthEmployment > 0 && <Row label="건강·고용보험" value={r.healthEmployment} minus indent />}
          {r.housingDeduction > 0 && <Row label="주택청약저축" value={r.housingDeduction} minus indent />}
          <Row
            label="신용카드 등"
            value={r.card.deduction}
            minus
            indent
            sub={
              r.card.totalSpend === 0
                ? undefined
                : r.card.minReached
                  ? `최저사용 ${manwon(r.card.minSpend)} 초과분 · 기본한도 ${manwon(r.card.baseLimit)}${r.card.extraApplied ? ` + 추가 ${manwon(r.card.extraApplied)}` : ''}`
                  : `최저사용금액 ${manwon(r.card.minSpend)} 미달`
            }
          />
          <Row label="과세표준" value={r.taxBase} strong />
          <Row label="산출세액" value={r.computedTax} sub={`세율 구간 ${pct(r.marginalRate)} (누진공제 반영)`} />
          {r.credits.map((c) => (
            <Row
              key={c.key}
              label={c.label}
              value={c.amount}
              minus
              indent
              sub={
                c.key === 'eitc'
                  ? `산식 ${won(r.earnedIncomeTaxCreditRaw)} · 한도 ${won(r.earnedIncomeTaxCreditLimit)}`
                  : c.key === 'standard' && r.itemizedSum > 0
                    ? `특별세액공제+월세 ${won(r.itemizedSum)}보다 유리해 자동 선택`
                    : undefined
              }
            />
          ))}
          {!r.usesStandard && (
            <p className="py-1 pl-3 text-[11px] text-carbon">
              특별세액공제+월세 {won(r.itemizedSum)} &gt; 표준세액공제 → 항목별 공제 자동 선택
            </p>
          )}
          <Row label="결정세액" value={r.decidedTax} strong />
          <Row label="지방소득세" value={r.decidedLocalTax} indent />
          <Row label="기납부세액 (소득세)" value={r.withheldIncomeTax} sub={r.withheldEstimated ? '추정값' : undefined} />
          <Row label="기납부 지방소득세" value={r.withheldLocalTax} indent />
          <div className="mt-3 flex items-center justify-between border-y-2 border-double border-carbon px-1 py-2.5">
            <span className="text-sm font-semibold text-carbon">{r.refund >= 0 ? '환급' : '추가 납부'}</span>
            <span className={`tabular text-base font-bold ${r.refund >= 0 ? 'text-carbon' : 'text-seal'}`}>
              {won(Math.abs(r.refund))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

function Delta({ v }: { v: number }) {
  const pos = v > 0
  return (
    <span className={`tabular text-lg font-semibold ${pos ? 'text-carbon' : 'text-mute'}`}>
      {pos ? '+' : ''}
      {won(v)}
    </span>
  )
}

export function Simulators({ rules, inp, base }: { rules: Rules; inp: Inputs; base: CalcResult }) {
  const [cardType, setCardType] = useState<'cardDebitCash' | 'cardCredit'>('cardDebitCash')
  const [cardExtra, setCardExtra] = useState(3_000_000)
  const [penExtra, setPenExtra] = useState(1_000_000)

  const pa = rules.pensionAccountCredit
  const pensionRoom = Math.max(
    0,
    Math.min(pa.savingsCap - inp.pensionSavings, pa.totalCap - Math.min(inp.pensionSavings, pa.savingsCap) - inp.irp),
  )
  const penMax = Math.max(pensionRoom, 100_000)
  const penVal = Math.min(penExtra, penMax)

  const cardSim = useMemo(
    () => calculate(rules, { ...inp, [cardType]: inp[cardType] + cardExtra }),
    [rules, inp, cardType, cardExtra],
  )
  const penSim = useMemo(
    () => calculate(rules, { ...inp, pensionSavings: inp.pensionSavings + penVal }),
    [rules, inp, penVal],
  )
  const cardDelta = cardSim.refund - base.refund
  const penDelta = penSim.refund - base.refund
  const rate = rules.cardDeduction.rates[cardType === 'cardCredit' ? 'credit' : 'debitCash']

  let cardStatus: { text: string; tone: string }
  if (!cardSim.card.minReached) cardStatus = { text: `아직 최저사용금액(${manwon(cardSim.card.minSpend)}) 미달`, tone: 'text-mute' }
  else if (cardSim.card.baseLimitReached && cardDelta === 0) cardStatus = { text: '공제 한도 도달 — 더 써도 환급 변화 없음', tone: 'text-seal' }
  else if (cardSim.card.baseLimitReached) cardStatus = { text: '이 금액에서 기본 공제한도에 도달해요', tone: 'text-mute' }
  else cardStatus = { text: `기본한도 ${manwon(cardSim.card.baseLimit)}까지 ${manwon(cardSim.card.baseLimit - cardSim.card.baseApplied)} 남음`, tone: 'text-carbon' }

  return (
    <div className="border border-carbon/50 bg-paper">
      <p className="border-b border-carbon-soft bg-cell px-4 py-2 text-xs text-mute">연말까지 남은 기간에 바꿔 볼 수 있는 것</p>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-carbon">카드를 더 쓰면</h3>
          <div className="flex border border-carbon/40 text-xs">
            {([['cardDebitCash', '체크'], ['cardCredit', '신용']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setCardType(k)}
                aria-pressed={cardType === k}
                className={`px-3 py-1 font-semibold ${cardType === k ? 'bg-carbon text-paper' : 'text-mute hover:text-carbon'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-mute">
          {cardType === 'cardCredit' ? '신용카드' : '체크카드'}({pct(rate)})로 <b className="tabular text-ink">{manwon(cardExtra)}</b> 더 쓰면
        </p>
        <input
          type="range"
          min={0}
          max={20_000_000}
          step={100_000}
          value={cardExtra}
          onChange={(e) => setCardExtra(Number(e.target.value))}
          className="mt-3 w-full"
          aria-label="추가 카드 사용액"
        />
        <div className="mt-2 flex items-end justify-between">
          <span className={`text-[11px] ${cardStatus.tone}`}>{cardStatus.text}</span>
          <Delta v={cardDelta} />
        </div>
      </div>

      <div className="border-t border-carbon-soft p-4">
        <h3 className="text-sm font-semibold text-carbon">연금저축을 더 넣으면</h3>
        <p className="mt-3 text-xs text-mute">
          연말까지 <b className="tabular text-ink">{manwon(penVal)}</b> 추가 납입 시 (남은 한도 {manwon(pensionRoom)})
        </p>
        <input
          type="range"
          min={0}
          max={penMax}
          step={100_000}
          value={penVal}
          disabled={pensionRoom === 0}
          onChange={(e) => setPenExtra(Number(e.target.value))}
          className="mt-3 w-full disabled:opacity-40"
          aria-label="연금저축 추가 납입액"
        />
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[11px] text-mute">
            {pensionRoom === 0
              ? '연금계좌 공제 한도를 모두 채웠어요'
              : base.decidedTax === 0
                ? '이미 결정세액이 0원 — 추가 효과 없음'
                : `공제율 ${pct(inp.salary <= pa.salaryThreshold ? pa.lowRate : pa.highRate)} + 지방세`}
          </span>
          <Delta v={penDelta} />
        </div>
      </div>
    </div>
  )
}
