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
  return (
    <div className="relative overflow-hidden rounded-3xl border border-ink-700 bg-gradient-to-br from-ink-800 via-ink-850 to-ink-900 p-6">
      <div
        className={`animate-glow pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${
          refund ? 'bg-jade-400/25' : 'bg-coral-400/25'
        }`}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              refund ? 'bg-jade-400/15 text-jade-300' : 'bg-coral-400/15 text-coral-400'
            }`}
          >
            {empty ? '입력 대기' : refund ? '예상 환급' : '예상 추가 납부'}
          </span>
          {r.withheldEstimated && (
            <span className="rounded-full bg-gold-400/15 px-2.5 py-1 text-xs font-bold text-gold-300">기납부 추정</span>
          )}
        </div>
        <p
          className={`tabular mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl ${
            empty ? 'text-slate-500' : refund ? 'text-white' : 'text-coral-400'
          }`}
        >
          {empty ? '—' : `${refund ? '+' : '−'}${Math.round(shown).toLocaleString('ko-KR')}`}
          <span className="ml-1 text-xl font-bold text-slate-400">원</span>
        </p>
        <p className="mt-2 text-xs text-slate-400">소득세 + 지방소득세 합산 기준</p>

        <dl className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-ink-950/50 p-3.5">
            <dt className="text-[11px] text-slate-400">결정세액 (지방세 포함)</dt>
            <dd className="tabular mt-1 text-base font-bold text-white">{won(r.decidedTax + r.decidedLocalTax)}</dd>
          </div>
          <div className="rounded-2xl bg-ink-950/50 p-3.5">
            <dt className="text-[11px] text-slate-400">기납부세액 (지방세 포함)</dt>
            <dd className="tabular mt-1 text-base font-bold text-white">
              {won(r.withheldIncomeTax + r.withheldLocalTax)}
            </dd>
          </div>
        </dl>
      </div>
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
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? 'border-t border-ink-700 pt-3' : ''}`}>
      <div className={indent ? 'pl-3' : ''}>
        <span className={`text-sm ${strong ? 'font-bold text-white' : indent ? 'text-slate-400' : 'text-slate-300'}`}>
          {label}
        </span>
        {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
      </div>
      <span
        className={`tabular shrink-0 text-sm ${strong ? 'font-bold text-white' : 'text-slate-200'} ${
          minus && value > 0 ? 'text-jade-300' : ''
        }`}
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
    <div className="rounded-3xl border border-ink-700/70 bg-ink-850/80">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold text-white">단계별 계산 근거</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>
      {open && (
        <div className="animate-rise border-t border-ink-700/70 px-5 pb-5 pt-2">
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
            <p className="py-1 pl-3 text-[11px] text-jade-300/80">
              특별세액공제+월세 {won(r.itemizedSum)} &gt; 표준세액공제 → 항목별 공제 자동 선택
            </p>
          )}
          <Row label="결정세액" value={r.decidedTax} strong />
          <Row label="지방소득세" value={r.decidedLocalTax} indent />
          <Row label="기납부세액 (소득세)" value={r.withheldIncomeTax} sub={r.withheldEstimated ? '추정값' : undefined} />
          <Row label="기납부 지방소득세" value={r.withheldLocalTax} indent />
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-ink-950/60 px-4 py-3">
            <span className="text-sm font-bold text-white">{r.refund >= 0 ? '환급' : '추가 납부'}</span>
            <span className={`tabular text-base font-extrabold ${r.refund >= 0 ? 'text-jade-300' : 'text-coral-400'}`}>
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
    <span className={`tabular text-lg font-extrabold ${pos ? 'text-jade-300' : 'text-slate-400'}`}>
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
  if (!cardSim.card.minReached) cardStatus = { text: `아직 최저사용금액(${manwon(cardSim.card.minSpend)}) 미달`, tone: 'text-gold-300' }
  else if (cardSim.card.baseLimitReached && cardDelta === 0) cardStatus = { text: '공제 한도 도달 — 더 써도 환급 변화 없음', tone: 'text-coral-400' }
  else if (cardSim.card.baseLimitReached) cardStatus = { text: '이 금액에서 기본 공제한도에 도달해요', tone: 'text-gold-300' }
  else cardStatus = { text: `기본한도 ${manwon(cardSim.card.baseLimit)}까지 ${manwon(cardSim.card.baseLimit - cardSim.card.baseApplied)} 남음`, tone: 'text-jade-300' }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-ink-700/70 bg-ink-850/80 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">💳 카드 더 쓰면?</h3>
          <div className="flex rounded-xl bg-ink-900 p-0.5 text-xs">
            {([['cardDebitCash', '체크'], ['cardCredit', '신용']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setCardType(k)}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${cardType === k ? 'bg-ink-700 text-white' : 'text-slate-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {cardType === 'cardCredit' ? '신용카드' : '체크카드'}({pct(rate)})로 <b className="tabular text-white">{manwon(cardExtra)}</b> 더 쓰면
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

      <div className="rounded-3xl border border-ink-700/70 bg-ink-850/80 p-5">
        <h3 className="text-sm font-bold text-white">🏦 연금저축 더 넣으면?</h3>
        <p className="mt-3 text-xs text-slate-400">
          연말까지 <b className="tabular text-white">{manwon(penVal)}</b> 추가 납입 시 (남은 한도 {manwon(pensionRoom)})
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
          <span className="text-[11px] text-slate-400">
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
