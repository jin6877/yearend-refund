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
    return <div className="grid min-h-screen place-items-center p-6 text-center text-seal">{error}</div>
  }
  if (!rules || !result || !index) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-carbon-soft border-t-carbon" />
      </div>
    )
  }

  const props = { inp, set, rules }
  const refund = result.refund >= 0

  return (
    <div className="min-h-screen bg-desk pb-28 text-ink lg:pb-14">
      <div className="mx-auto max-w-6xl px-2.5 pt-3 sm:px-6 sm:pt-8">
        <div className="border border-carbon/30 bg-paper shadow-[0_1px_2px_rgba(35,38,74,0.08),0_12px_32px_-18px_rgba(35,38,74,0.25)]">
          <header className="flex items-center justify-between gap-3 border-b border-carbon-soft px-4 py-3 sm:px-6">
            <div>
              <p className="font-myeongjo text-lg font-extrabold text-carbon">환급미리</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-mute">
              귀속연도
              <select
                value={year ?? ''}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border border-carbon/40 bg-paper px-2.5 py-1.5 text-sm font-semibold text-carbon outline-none focus:border-carbon"
              >
                {index.years.map((y) => (
                  <option key={y} value={y}>
                    {y}년 귀속
                  </option>
                ))}
              </select>
            </label>
          </header>

          <section className="px-4 pb-7 pt-8 text-center sm:px-6 sm:pt-10">
            <p className="font-myeongjo text-sm font-bold text-mute">{rules.taxYear}년 귀속</p>
            <h1 className="form-title font-myeongjo mt-2 text-[1.45rem] font-extrabold text-carbon sm:text-[2.35rem]">
              연말정산 환급 미리계산서
            </h1>
            <div className="mx-auto mt-4 h-1.5 max-w-md border-y border-carbon" />
            <p className="mx-auto mt-5 max-w-[58ch] text-sm leading-relaxed text-mute">
              {rules.taxYear + 1}년 1~2월 회사 정산 전에, 원천징수영수증과 같은 순서로 적어 보고 돌려받을 금액을 미리 확인하세요.
              자녀 수별 카드 한도와 9세 이상 자녀세액공제 등 {rules.taxYear}년 개정 세법을 반영했어요. 입력값은 이 브라우저에만 저장됩니다.
            </p>
          </section>

          <main className="grid border-t-2 border-carbon lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 lg:border-r lg:border-carbon">
              <nav className="sticky top-0 z-20 border-b border-carbon bg-paper" aria-label="입력 단계">
                <ol className="grid grid-cols-4 divide-x divide-carbon-soft">
                  {STEPS.map((s, i) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setStep(i)}
                        aria-current={step === i ? 'step' : undefined}
                        className={`relative w-full px-1 py-3 text-center text-[12px] font-semibold sm:text-[13px] ${
                          step === i ? 'bg-paper text-carbon' : 'bg-cell text-mute hover:text-carbon'
                        }`}
                      >
                        {step === i && <span className="absolute inset-x-0 top-0 h-[3px] bg-carbon" />}
                        <span className="mr-0.5">{'①②③④'[i]}</span> {s}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>

              <div key={step} className="pt-6">
                {step === 0 && <StepBasic {...props} />}
                {step === 1 && <StepCard {...props} />}
                {step === 2 && <StepDeductions {...props} />}
                {step === 3 && <StepWithheld {...props} estimated={estimated} />}
              </div>

              <div className="px-4 pb-6 pt-8 sm:px-6">
                <div className="flex items-stretch gap-2">
                  <button
                    type="button"
                    disabled={step === 0}
                    onClick={() => setStep(step - 1)}
                    className="h-12 border border-carbon/50 px-5 text-sm font-semibold text-carbon hover:bg-cell disabled:border-carbon-soft disabled:text-carbon-soft disabled:hover:bg-transparent"
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      step < STEPS.length - 1
                        ? setStep(step + 1)
                        : document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="h-12 flex-1 bg-carbon text-sm font-semibold text-paper hover:bg-[#282c70]"
                  >
                    {step < STEPS.length - 1 ? `다음: ${STEPS[step + 1]}` : '결과 보기'}
                  </button>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-mute">
                  <button type="button" onClick={() => reset(EMPTY_INPUTS)} className="underline-offset-2 hover:text-seal hover:underline">
                    전체 초기화
                  </button>
                  <button type="button" onClick={() => reset(SAMPLE_INPUTS)} className="underline-offset-2 hover:text-carbon hover:underline">
                    예시값 채우기
                  </button>
                </div>
              </div>
            </div>

            <aside id="result" className="scroll-mt-4 space-y-4 border-t-2 border-carbon bg-cell/40 p-3 sm:p-5 lg:border-t-0">
              <div className="space-y-4 lg:sticky lg:top-4">
                <ResultHero r={result} />
                <Breakdown r={result} />
                <Simulators rules={rules} inp={inp} base={result} />
              </div>
            </aside>
          </main>
        </div>

        <footer className="mt-6 px-1 sm:px-0">
          <div className="border border-dashed border-carbon/45 bg-paper/70 p-5">
            <p className="text-sm font-semibold text-carbon">아직 계산에 넣지 않은 개정안</p>
            <p className="mt-1 text-xs text-mute">{rules.pendingNote}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-ink marker:text-carbon">
              {rules.pending.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <p className="mt-5 max-w-[80ch] text-xs leading-relaxed text-mute">
            {rules.taxYear}년 귀속 기준, 기준일 {rules.updatedAt}. 참고용 추정치이며 실제 정산과 다를 수 있습니다.
            <br />
            근거: {rules.sources.join(' / ')}
            <br />
            소득공제 종합한도, 기부금 소득 대비 한도, 세액공제 간 적용 순서 등 일부 세부 규정은 단순화되어 있습니다. 정확한 금액은
            홈택스 연말정산 간소화 자료와 회사 정산 결과를 확인하세요.
          </p>
        </footer>
      </div>

      <a
        href="#result"
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t-2 border-carbon bg-paper px-5 py-3.5 lg:hidden"
      >
        <span className="text-xs font-semibold text-carbon">{refund ? '예상 환급' : '예상 추가 납부'}</span>
        <span className={`tabular font-myeongjo text-xl font-extrabold ${refund ? 'text-carbon' : 'text-seal'}`}>
          {won(Math.abs(result.refund))}
        </span>
      </a>
    </div>
  )
}
