import { Fragment, useState } from 'react'
import { Icons } from './icons'

interface Block {
  type: 'paragraph' | 'code' | 'heading' | 'list' | 'quote' | 'hr'
  content?: string
  lang?: string
  level?: number
  ordered?: boolean
}

export function Markdown({ text }: { text: string }) {
  const blocks = useMemoParse(text)
  return (
    <div className="md">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  )
}

function useMemoParse(text: string): Block[] {
  return parseBlocks(text)
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: 'list', content: listItems.join('\n'), ordered: listType === 'ol' })
      listItems = []
    }
    listType = null
  }

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flushList()
      i++
      continue
    }

    const codeMatch = line.match(/^```([\w+-]*)\s*$/)
    if (codeMatch) {
      flushList()
      const lang = codeMatch[1]
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++
      blocks.push({ type: 'code', content: buf.join('\n'), lang })
      continue
    }

    if (/^---+$/.test(trimmed)) {
      flushList()
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    if (/^#{1,4}\s/.test(trimmed)) {
      flushList()
      const level = trimmed.match(/^#+/)![0].length
      blocks.push({ type: 'heading', content: trimmed.replace(/^#+\s/, ''), level })
      i++
      continue
    }

    if (/^>\s?/.test(trimmed)) {
      flushList()
      blocks.push({ type: 'quote', content: trimmed.replace(/^>\s?/, '') })
      i++
      continue
    }

    if (/^[-*]\s/.test(trimmed)) {
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(trimmed.replace(/^[-*]\s/, ''))
      i++
      continue
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(trimmed.replace(/^\d+[.)]\s/, ''))
      i++
      continue
    }

    flushList()
    const buf: string[] = [line]
    i++
    while (i < lines.length) {
      const t = lines[i].trim()
      if (!t || /^```/.test(t) || /^[-*]\s/.test(t) || /^\d+[.)]\s/.test(t) || /^#{1,4}\s/.test(t)) break
      buf.push(lines[i])
      i++
    }
    blocks.push({ type: 'paragraph', content: buf.join('\n') })
  }
  flushList()
  return blocks
}

function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = regex.exec(text))) {
    if (m.index > last) parts.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>)
    if (m[1]) {
      parts.push(
        <code key={k++} className="md__code-inline">
          {m[1].slice(1, -1)}
        </code>,
      )
    } else if (m[2]) {
      parts.push(
        <strong key={k++}>{m[2].slice(2, -2)}</strong>,
      )
    } else if (m[3]) {
      parts.push(
        <em key={k++}>{m[3].slice(1, -1)}</em>,
      )
    } else if (m[4]) {
      parts.push(
        <a key={k++} href={m[6]} target="_blank" rel="noreferrer">
          {m[5]}
        </a>,
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<Fragment key={k++}>{text.slice(last)}</Fragment>)
  return <>{parts}</>
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return <div className={`md__heading md__h${block.level || 1}`}><Inline text={block.content || ''} /></div>
    case 'paragraph':
      return <p className="md__p"><Inline text={block.content || ''} /></p>
    case 'quote':
      return <blockquote className="md__quote"><Inline text={block.content || ''} /></blockquote>
    case 'hr':
      return <hr className="md__hr" />
    case 'list': {
      const items = (block.content || '').split('\n')
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag className="md__list">
          {items.map((it, i) => (
            <li key={i}>
              <Inline text={it} />
            </li>
          ))}
        </Tag>
      )
    }
    case 'code':
      return <CodeBlock lang={block.lang} code={block.content || ''} />
    default:
      return null
  }
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }
  return (
    <div className="md__code">
      <div className="md__code-header">
        <span className="md__code-lang">{lang || 'text'}</span>
        <button className="md__copy" onClick={() => void copy()} title="Copiar">
          {copied ? <Icons.check size={13} /> : <Icons.copy size={13} />}
        </button>
      </div>
      <pre className="md__pre mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}
