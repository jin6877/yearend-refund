export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
export const comma = (n: number) => (n ? Math.round(n).toLocaleString('ko-KR') : '')
export const parseMoney = (s: string) => {
  const n = Number(s.replace(/[^0-9]/g, ''))
  return Number.isFinite(n) ? Math.min(n, 99_999_999_999) : 0
}
/** 1,234만원 형태의 축약 */
export const manwon = (n: number) => {
  if (n >= 100_000_000) {
    const eok = Math.floor(n / 100_000_000)
    const man = Math.round((n % 100_000_000) / 10_000)
    return man ? `${eok}억 ${man.toLocaleString('ko-KR')}만원` : `${eok}억원`
  }
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만원`
  return won(n)
}
export const pct = (r: number) => `${Math.round(r * 1000) / 10}%`
