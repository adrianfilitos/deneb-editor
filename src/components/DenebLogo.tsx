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
        <radialGradient id="deneb-rg" cx="0.3" cy="0.25" r="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#deneb-lg)" />
      <rect width="64" height="64" rx="15" fill="url(#deneb-rg)" />
      <path
        d="M32 12 C34.2 22.6 35.8 25.2 47 28 C36.8 30.2 34.2 31.8 32 42 C29.8 31.8 27.2 30.2 17 28 C28.2 25.2 29.8 22.6 32 12 Z"
        fill="#fff"
      />
      <circle cx="32" cy="28" r="3.4" fill="#0b0d14" opacity="0.82" />
      <path d="M32 4.5 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 Z" fill="#fff" opacity="0.9" />
      <path d="M51 45 l1.1 2.7 2.7 1.1 -2.7 1.1 -1.1 2.7 -1.1 -2.7 -2.7 -1.1 2.7 -1.1 Z" fill="#fff" opacity="0.65" />
      <path d="M13 46 l0.9 2.2 2.2 0.9 -2.2 0.9 -0.9 2.2 -0.9 -2.2 -2.2 -0.9 2.2 -0.9 Z" fill="#fff" opacity="0.45" />
    </svg>
  )
}
