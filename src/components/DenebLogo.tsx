interface DenebLogoProps {
  size?: number
  className?: string
}

export function DenebLogo({ size = 24, className }: DenebLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="deneb-lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fb0ff" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#5eead4" />
        </linearGradient>
        <radialGradient id="deneb-rg" cx="0.25" cy="0.2" r="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#deneb-lg)" />
      <rect width="64" height="64" rx="15" fill="url(#deneb-rg)" />
      <path d="M20 46V18l24 28V18" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 7.5l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#fff" />
    </svg>
  )
}
