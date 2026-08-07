import type { SVGProps } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function Base({ size = 16, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export const Icons = {
  sparkles: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
      <path d="M5 16l.7 1.6L7.5 18l-1.8.7L5 20.3l-.7-1.6L2.5 18l1.8-.4L5 16z" />
    </Base>
  ),
  folder: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </Base>
  ),
  folderOpen: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H5a2 2 0 0 0-2 2v-6z" />
      <path d="M3 14l1.5-3.5A2 2 0 0 1 6.4 9h13.8a1 1 0 0 1 .9 1.4L19.6 14" />
      <path d="M2 13h13l2 5H5l-3-5z" />
    </Base>
  ),
  file: (p: IconProps) => (
    <Base {...p}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
      <path d="M14 3v6h6" />
    </Base>
  ),
  filePlus: (p: IconProps) => (
    <Base {...p}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z" />
      <path d="M14 3v6h6" />
      <path d="M12 12v6M9 15h6" />
    </Base>
  ),
  folderPlus: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M12 10v6M9 13h6" />
    </Base>
  ),
  chevronRight: (p: IconProps) => (
    <Base {...p}>
      <path d="M9 6l6 6-6 6" />
    </Base>
  ),
  chevronDown: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 9l6 6 6-6" />
    </Base>
  ),
  search: (p: IconProps) => (
    <Base {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Base>
  ),
  close: (p: IconProps) => (
    <Base {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Base>
  ),
  plus: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  ),
  more: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </Base>
  ),
  save: (p: IconProps) => (
    <Base {...p}>
      <path d="M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M8 3v6h8V3" />
      <path d="M7 21v-7h10v7" />
    </Base>
  ),
  refresh: (p: IconProps) => (
    <Base {...p}>
      <path d="M21 12a9 9 0 1 1-2.6-6.4L21 8" />
      <path d="M21 3v5h-5" />
    </Base>
  ),
  pencil: (p: IconProps) => (
    <Base {...p}>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </Base>
  ),
  trash: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  ),
  copy: (p: IconProps) => (
    <Base {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Base>
  ),
  check: (p: IconProps) => (
    <Base {...p}>
      <path d="M20 6L9 17l-5-5" />
    </Base>
  ),
  play: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 4l14 8-14 8V4z" />
    </Base>
  ),
  git: (p: IconProps) => (
    <Base {...p}>
      <circle cx="6" cy="5" r="2.5" />
      <circle cx="6" cy="19" r="2.5" />
      <circle cx="18" cy="7" r="2.5" />
      <path d="M6 7.5v9M18 9.5a4 4 0 0 1-4 4H8" />
    </Base>
  ),
  panel: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </Base>
  ),
  gear: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z" />
    </Base>
  ),
  send: (p: IconProps) => (
    <Base {...p}>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </Base>
  ),
  stop: (p: IconProps) => (
    <Base {...p}>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </Base>
  ),
  warning: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3L2 21h20L12 3z" />
      <path d="M12 9v5" />
      <path d="M12 17.5v.01" />
    </Base>
  ),
  info: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v.01" />
      <path d="M12 12v5" />
    </Base>
  ),
  command: (p: IconProps) => (
    <Base {...p}>
      <path d="M18 6a3 3 0 1 0-6 0v12a3 3 0 1 0 6 0V6zM6 6a3 3 0 1 1 6 0v12a3 3 0 1 1-6 0V6z" />
    </Base>
  ),
  terminal: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 5h16v14H4z" />
      <path d="M7 9l3 3-3 3M13 15h4" />
    </Base>
  ),
  bold: (p: IconProps) => (
    <Base {...p}>
      <path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z" />
      <path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z" />
    </Base>
  ),
  x: (p: IconProps) => (
    <Base {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Base>
  ),
  zap: (p: IconProps) => (
    <Base {...p}>
      <path d="M13 2L3 14h7l-1 8 11-13h-7l1-7z" />
    </Base>
  ),
  terminalIcon: (p: IconProps) => (
    <Base {...p}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 9l3 3-3 3M11 15h6" />
    </Base>
  ),
  delete: (p: IconProps) => (
    <Base {...p}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
    </Base>
  ),
  list: (p: IconProps) => (
    <Base {...p}>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Base>
  ),
  columns: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="18" rx="1.5" />
    </Base>
  ),
  minus: (p: IconProps) => (
    <Base {...p}>
      <path d="M5 12h14" />
    </Base>
  ),
  square: (p: IconProps) => (
    <Base {...p}>
      <rect x="5.5" y="5.5" width="13" height="13" rx="1.5" />
    </Base>
  ),
  gitBranch: (p: IconProps) => (
    <Base {...p}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 6h5a4.5 4.5 0 0 1 4.5 4.5V8.5M6 8.5v7" />
    </Base>
  ),
  arrowUp: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </Base>
  ),
  arrowDown: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </Base>
  ),
  download: (p: IconProps) => (
    <Base {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5M12 15V3" />
    </Base>
  ),
  diff: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3v18M3 12h18M3 3l18 18M21 3L3 21" />
    </Base>
  ),
  extension: (p: IconProps) => (
    <Base {...p}>
      <path d="M8 3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h3a2 2 0 0 1 2 2v3h1a2 2 0 0 1 0 4h-1v3a2 2 0 0 1-2 2h-3v1a2 2 0 0 1-4 0v-1H7a2 2 0 0 1-2-2v-3H4a2 2 0 0 1 0-4h1V6a2 2 0 0 1 2-2h3V3z" />
    </Base>
  ),
} as const

export type IconName = keyof typeof Icons
