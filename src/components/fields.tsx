import { type ReactNode } from 'react'
import { comma, manwon, parseMoney } from '../lib/format'

function Help({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-mute">{children}</p>
}

/** 서식 한 줄: 왼쪽 음영 라벨 칸 | 오른쪽 기재 칸 (모바일은 위아래) */
function FormRow({ label, badge, children }: { label: ReactNode; badge?: string; children: ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[11.5rem_minmax(0,1fr)]">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 bg-cell px-4 pb-1 pt-3 sm:border-r sm:border-carbon-soft sm:pb-3">
        <span className="text-[13px] font-semibold leading-snug text-carbon">{label}</span>
        {badge && <span className="tabular text-[11px] font-medium text-mute">공제율 {badge}</span>}
      </div>
      <div className="min-w-0 px-4 py-3">{children}</div>
    </div>
  )
}

export function FieldLabel({ label, badge }: { label: string; badge?: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-[13px] font-semibold text-carbon">{label}</span>
      {badge && <span className="text-[11px] text-mute">{badge}</span>}
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
  return (
    <FormRow label={label} badge={badge}>
      <div className="flex items-baseline border-b-2 border-carbon/25 transition-colors focus-within:border-carbon">
        <input
          inputMode="numeric"
          className="tabular h-11 w-full bg-transparent text-right text-xl font-semibold text-ink outline-none placeholder:text-carbon-soft"
          value={comma(value)}
          placeholder={placeholder}
          onChange={(e) => onChange(parseMoney(e.target.value))}
          aria-label={label}
        />
        <span className="ml-2 text-sm text-mute">원</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(value + s)}
            className="tabular border border-carbon-soft px-2 py-0.5 text-xs font-medium text-carbon hover:border-carbon hover:bg-cell"
          >
            +{manwon(s).replace('원', '')}
          </button>
        ))}
        {value > 0 && (
          <>
            <button type="button" onClick={() => onChange(0)} className="px-1.5 py-0.5 text-xs text-mute hover:text-seal">
              지우기
            </button>
            <span className="tabular ml-auto text-xs text-mute">{manwon(value)}</span>
          </>
        )}
      </div>
      {help && <Help>{help}</Help>}
    </FormRow>
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
  const btn = 'h-9 w-9 text-lg text-carbon hover:bg-cell disabled:text-carbon-soft disabled:hover:bg-transparent'
  return (
    <FormRow label={label}>
      <div className="flex items-center justify-end">
        <div className="flex items-center border border-carbon/40">
          <button type="button" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className={btn}>
            −
          </button>
          <span className="tabular w-14 border-x border-carbon/40 text-center text-base font-semibold leading-9 text-ink">
            {value}
            <span className="ml-0.5 text-xs font-normal text-mute">{unit}</span>
          </span>
          <button type="button" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} className={btn}>
            +
          </button>
        </div>
      </div>
      {help && <Help>{help}</Help>}
    </FormRow>
  )
}

/** 서식의 체크 칸 ☐ 해당 */
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
    <FormRow label={label}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="ml-auto flex items-center gap-2.5 text-sm"
      >
        <span className={checked ? 'font-semibold text-ink' : 'text-mute'}>{checked ? '해당' : '해당 없음'}</span>
        <span
          className={`grid h-6 w-6 place-items-center border-2 text-sm font-bold leading-none ${
            checked ? 'border-carbon bg-carbon text-paper' : 'border-carbon/40 text-transparent'
          }`}
        >
          ✓
        </span>
      </button>
      {help && <Help>{help}</Help>}
    </FormRow>
  )
}

/** 서식의 한 구역: 굵은 괘선 아래 제목 줄, 칸마다 가는 괘선 */
export function Group({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="border-t-2 border-carbon">
      <div className="px-4 pb-3 pt-4">
        <h3 className="font-myeongjo text-lg font-extrabold text-carbon">{title}</h3>
        {desc && <p className="mt-1 max-w-[62ch] text-xs leading-relaxed text-mute">{desc}</p>}
      </div>
      <div className="divide-y divide-carbon-soft border-t border-carbon-soft">{children}</div>
    </section>
  )
}

/** Group 안에서 묶음 칸 (예: 출생·입양 자녀) */
export function SubGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="bg-cell/60 px-4 pb-1 pt-3 text-xs font-semibold text-mute">{title}</p>
      <div className="divide-y divide-carbon-soft/70 pl-4">{children}</div>
    </div>
  )
}
