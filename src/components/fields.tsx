import { useState, type ReactNode } from 'react'
import { comma, manwon, parseMoney } from '../lib/format'

function Help({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{children}</p>
}

export function FieldLabel({ label, badge }: { label: string; badge?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      {badge && (
        <span className="rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{badge}</span>
      )}
    </div>
  )
}

const DEFAULT_STEPS = [100_000, 1_000_000, 10_000_000]

export function MoneyInput({
  label,
  value,
  onChange,
  help,
  badge,
  steps = DEFAULT_STEPS,
  placeholder = '0',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  help?: ReactNode
  badge?: string
  steps?: number[]
  placeholder?: string
}) {
  const [focus, setFocus] = useState(false)
  return (
    <div>
      <FieldLabel label={label} badge={badge} />
      <div
        className={`flex items-center rounded-2xl border bg-ink-900 px-4 transition ${
          focus ? 'border-jade-400/70 ring-4 ring-jade-400/10' : 'border-ink-700 hover:border-ink-600'
        }`}
      >
        <input
          inputMode="numeric"
          className="tabular h-12 w-full bg-transparent text-right text-lg font-semibold text-white outline-none placeholder:text-ink-600"
          value={comma(value)}
          placeholder={placeholder}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange(parseMoney(e.target.value))}
          aria-label={label}
        />
        <span className="ml-2 text-sm text-slate-400">원</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(value + s)}
            className="rounded-lg bg-ink-800 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-ink-700 hover:text-white active:scale-95"
          >
            +{manwon(s).replace('원', '')}
          </button>
        ))}
        {value > 0 && (
          <>
            <button
              type="button"
              onClick={() => onChange(0)}
              className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:text-coral-400"
            >
              지우기
            </button>
            <span className="ml-auto text-xs text-jade-300/80">{manwon(value)}</span>
          </>
        )}
      </div>
      {help && <Help>{help}</Help>}
    </div>
  )
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  unit = '명',
  help,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  unit?: string
  help?: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <div className="flex items-center rounded-xl border border-ink-700 bg-ink-900">
          <button
            type="button"
            aria-label={`${label} 줄이기`}
            disabled={value <= min}
            onClick={() => onChange(Math.max(min, value - 1))}
            className="h-9 w-9 text-lg text-slate-300 transition hover:text-white disabled:opacity-30"
          >
            −
          </button>
          <span className="tabular w-12 text-center text-sm font-semibold text-white">
            {value}
            <span className="ml-0.5 text-xs text-slate-400">{unit}</span>
          </span>
          <button
            type="button"
            aria-label={`${label} 늘리기`}
            disabled={value >= max}
            onClick={() => onChange(Math.min(max, value + 1))}
            className="h-9 w-9 text-lg text-slate-300 transition hover:text-white disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
      {help && <Help>{help}</Help>}
    </div>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  help,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  help?: ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <span
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-jade-500' : 'bg-ink-700'}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              checked ? 'left-6' : 'left-1'
            }`}
          />
        </span>
      </button>
      {help && <Help>{help}</Help>}
    </div>
  )
}

export function Group({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-ink-700/70 bg-ink-850/80 p-5 sm:p-6">
      <h3 className="text-base font-bold text-white">{title}</h3>
      {desc && <p className="mt-1 text-xs leading-relaxed text-slate-400">{desc}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  )
}
