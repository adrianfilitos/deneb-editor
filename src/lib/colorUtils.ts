export function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || '#000000').replace('#', '').trim()
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) h = '000000'
  const n = parseInt(h, 16)
  if (Number.isNaN(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgb(r: number, g: number, b: number): string {
  const p = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${p(r)}${p(g)}${p(b)}`
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}

export function lighten(hex: string, t: number): string {
  return mix(hex, '#ffffff', t)
}

export function darken(hex: string, t: number): string {
  return mix(hex, '#000000', t)
}

export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function mixText(bg: string, fg: string, amount: number): string {
  return mix(bg, fg, amount)
}
