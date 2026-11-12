import { useCallback, useEffect, useMemo, useState } from 'react'
import { calculate, estimateWithholding } from './lib/calc'
import { EMPTY_INPUTS, SAMPLE_INPUTS } from './lib/defaults'
import { won } from './lib/format'
import type { Inputs, Rules, RulesIndex } from './lib/types'
import { StepBasic, StepCard, StepDeductions, StepWithheld } from './components/Steps'
import { Breakdown, ResultHero, Simulators } from './components/Result'

const STORAGE_KEY = 'yearend-refund:v1'
const STEPS = ['기본정보', '카드·현금', '공제 항목', '기납부세액'] as const

function loadInputs(): Record<string, Inputs> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export default function App() {
  const [index, setIndex] = useState<RulesIndex | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [rules, setRules] = useState<Rules | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [store, setStore] = useState<Record<string, Inputs>>(loadInputs)

  useEffect(() => {
    fetch('/rules/index.json')
      .then((r) => r.json() as Promise<RulesIndex>)
      .then((idx) => {
        setIndex(idx)
        setYear(idx.default)
      })
      .catch(() => setError('세법 규칙 목록을 불러오지 못했어요.'))
  }, [])

  useEffect(() => {
    if (year == null) return
    setRules(null)
    fetch(`/rules/${year}.json`)
      .then((r) => r.json() as Promise<Rules>)
      .then(setRules)
      .catch(() => setError(`${year}년 세법 규칙을 불러오지 못했어요.`))
  }, [year])

  const inp: Inputs = useMemo(
    () => ({ ...EMPTY_INPUTS, ...(year != null ? store[year] ?? SAMPLE_INPUTS : SAMPLE_INPUTS) }),
    [store, year],
  )

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      /* 저장 불가 환경 무시 */
    }
  }, [store])

  const set = useCallback(
    <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
      if (year == null) return
      setStore((s) => ({ ...s, [year]: { ...EMPTY_INPUTS, ...(s[year] ?? SAMPLE_INPUTS), [key]: value } }))
    },
    [year],
  )
  const reset = (to: Inputs) => year != null && setStore((s) => ({ ...s, [year]: to }))

  const result = useMemo(() => (rules ? calculate(rules, inp) : null), [rules, inp])
  const estimated = useMemo(() => (rules ? estimateWithholding(rules, inp) : 0), [rules, inp])

  if (error) {
    return <div className="grid min-h-screen place-items-center p-6 text-center text-coral-400">{error}</div>
  }
  if (!rules || !result || !index) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-700 border-t-jade-400" />
      </div>
    )
  }

  const props = { inp, set, rules }

  return (
    <div className="min-h-screen bg-ink-950 pb-28 text-slate-100 lg:pb-12">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(63,224,171,0.10),transparent),radial-gradient(40%_80%_at_90%_0%,rgba(255,198,92,0.07),transparent)]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-jade-300 to-jade-500 text-lg font-black text-ink-950 shadow-lg shadow-jade-500/20">
            ₩
          </div>
          <div className="leading-tight">
            <p className="text-sm font-extrabold text-white">환급미리</p>
            <p className="text-[11px] text-slate-400">연말정산 환급 계산기</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          귀속연도
          <select
            value={year ?? ''}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-xl border border-ink-700 bg-ink-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-jade-400"
          >
            {index.years.map((y) => (
              <option key={y} value={y}>
                {y}년 귀속
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pt-10 sm:px-8">
        <p className="text-xs font-bold tracking-[0.2em] text-jade-300">{rules.taxYear + 1}년 1~2월 연말정산 대비</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
          {rules.taxYear} 연말정산,
          <br className="sm:hidden" /> <span className="bg-gradient-to-r from-jade-300 to-gold-300 bg-clip-text text-transparent">얼마 돌려받을까?</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          {rules.taxYear}년 개정 세법(자녀 수별 카드 한도, 9세 이상 자녀세액공제)을 반영해 결정세액과 환급액을 미리 계산해요.
          입력값은 이 브라우저에만 저장됩니다.
        </p>
      </section>

      <main className="relative mx-auto mt-8 grid max-w-6xl gap-6 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div>
          <nav className="sticky top-0 z-20 -mx-5 mb-4 bg-ink-950/85 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:mx-0 lg:rounded-2xl lg:px-0">
            <ol className="grid grid-cols-4 gap-1.5">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`group w-full rounded-xl px-1 py-2 text-center transition ${
                      step === i ? 'bg-ink-800' : 'hover:bg-ink-900'
                    }`}
                  >
                    <span
                      className={`mx-auto block h-1 w-full rounded-full transition ${
                        i <= step ? 'bg-jade-400' : 'bg-ink-700'
                      }`}
                    />
                    <span className={`mt-2 block text-[11px] font-semibold sm:text-xs ${step === i ? 'text-white' : 'text-slate-400'}`}>
                      {i + 1}. {s}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div key={step} className="animate-rise">
            {step === 0 && <StepBasic {...props} />}
            {step === 1 && <StepCard {...props} />}
            {step === 2 && <StepDeductions {...props} />}
            {step === 3 && <StepWithheld {...props} estimated={estimated} />}
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
              className="h-12 rounded-2xl bg-ink-800 px-5 text-sm font-semibold text-slate-200 transition hover:bg-ink-700 disabled:opacity-30"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' }))}
              className="h-12 flex-1 rounded-2xl bg-jade-400 text-sm font-bold text-ink-950 transition hover:bg-jade-300 active:scale-[0.99]"
            >
              {step < STEPS.length - 1 ? `다음 · ${STEPS[step + 1]}` : '결과 보기'}
            </button>
          </div>
          <div className="mt-3 flex gap-3 text-xs text-slate-500">
            <button type="button" onClick={() => reset(EMPTY_INPUTS)} className="hover:text-slate-300">
              전체 초기화
            </button>
            <button type="button" onClick={() => reset(SAMPLE_INPUTS)} className="hover:text-slate-300">
              예시값 채우기
            </button>
          </div>
        </div>

        <aside id="result" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ResultHero r={result} />
          <Breakdown r={result} />
          <Simulators rules={rules} inp={inp} base={result} />
        </aside>
      </main>

      <footer className="relative mx-auto mt-12 max-w-6xl px-5 sm:px-8">
        <div className="rounded-3xl border border-gold-400/20 bg-gold-400/[0.04] p-5">
          <p className="text-xs font-bold text-gold-300">⏳ 반영되지 않은 개정안</p>
          <p className="mt-1 text-xs text-slate-400">{rules.pendingNote}</p>
          <ul className="mt-3 space-y-1.5">
            {rules.pending.map((p) => (
              <li key={p} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                <span className="text-gold-400">•</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          {rules.taxYear}년 귀속 기준 · 기준일 {rules.updatedAt} · 참고용 추정치(실제 정산과 다를 수 있음)
          <br />
          근거: {rules.sources.join(' / ')}
          <br />
          소득공제 종합한도, 기부금 소득 대비 한도, 세액공제 간 적용 순서 등 일부 세부 규정은 단순화되어 있습니다. 정확한 금액은
          홈택스 연말정산 간소화 자료와 회사 정산 결과를 확인하세요.
        </p>
      </footer>

      <a
        href="#result"
        className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-2xl border border-ink-700 bg-ink-850/95 px-5 py-4 shadow-2xl shadow-black/50 backdrop-blur lg:hidden"
      >
        <span className="text-xs font-semibold text-slate-300">{result.refund >= 0 ? '예상 환급' : '예상 추가 납부'}</span>
        <span className={`tabular text-lg font-extrabold ${result.refund >= 0 ? 'text-jade-300' : 'text-coral-400'}`}>
          {result.refund >= 0 ? '+' : '−'}
          {won(Math.abs(result.refund))}
        </span>
      </a>
    </div>
  )
}
