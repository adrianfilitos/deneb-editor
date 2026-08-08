import type { editor as monacoEditor } from 'monaco-editor'

export type VimState = 'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL LINE' | 'SEARCH' | 'OFF'

interface Cur {
  line: number
  col: number
}

type Modifier = 'd' | 'c' | 'y'

function isWord(ch: string): boolean {
  return /[A-Za-z0-9_]/.test(ch)
}

function isBlank(ch: string): boolean {
  return ch === ' ' || ch === '\t'
}

function cls(ch: string): 'b' | 'w' | 'p' {
  if (isBlank(ch)) return 'b'
  return isWord(ch) ? 'w' : 'p'
}

function swapCase(ch: string): string {
  if (ch >= 'a' && ch <= 'z') return ch.toUpperCase()
  if (ch >= 'A' && ch <= 'Z') return ch.toLowerCase()
  return ch
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export class VimMode {
  private editor: monacoEditor.IStandaloneCodeEditor
  private enabled = false
  private mode: VimState = 'NORMAL'
  private handler: (e: KeyboardEvent) => void
  private detachCursor: { dispose: () => void } | null = null
  private count = 0
  private op: Modifier | null = null
  private awaitingFChar: { dir: 1 | -1 } | null = null
  private lastF: { char: string; dir: 1 | -1 } | null = null
  private pendingG = false
  private replaceCharMode = false
  private yank: { text: string; lineMode: boolean } | null = null
  private anchor: Cur | null = null
  private searchBuf = ''
  private searchMatches: { offset: number; len: number }[] = []
  private searchIndex = -1
  private deco: { set: (arr: unknown[]) => void } | null = null

  constructor(editor: monacoEditor.IStandaloneCodeEditor) {
    this.editor = editor
    this.handler = (e) => this.onKeyDown(e)
  }

  setEnabled(v: boolean) {
    if (v === this.enabled) return
    this.enabled = v
    const el = this.editor.getDomNode()
    if (!el) return
    if (v) {
      this.mode = 'NORMAL'
      this.count = 0
      this.op = null
      el.addEventListener('keydown', this.handler, true)
      this.detachCursor = this.editor.onDidChangeCursorPosition(() => this.onCursorMove())
      this.emit()
    } else {
      el.removeEventListener('keydown', this.handler, true)
      this.detachCursor?.dispose()
      this.detachCursor = null
      this.mode = 'OFF'
      this.emit()
    }
  }

  private model() {
    return this.editor.getModel()
  }

  private emit() {
    window.dispatchEvent(new CustomEvent('deneb:vim-mode', { detail: this.mode }))
  }

  private setMode(m: VimState) {
    this.mode = m
    this.emit()
  }

  private pos(): Cur {
    const p = this.editor.getPosition()
    return { line: p?.lineNumber ?? 1, col: p?.column ?? 1 }
  }

  private setPos(c: Cur) {
    const m = this.model()
    if (!m) return
    const line = Math.max(1, Math.min(m.getLineCount(), c.line))
    const maxCol = m.getLineMaxColumn(line)
    this.editor.setPosition({ lineNumber: line, column: Math.max(1, Math.min(maxCol, c.col)) })
  }

  private isEventSource(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null
    if (!t) return false
    if (t.tagName === 'INPUT') return false
    if (t.tagName === 'TEXTAREA' && !(t.classList && t.classList.contains('inputarea'))) return false
    return true
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return
    const key = e.key

    if (this.mode === 'INSERT') {
      if (key === 'Escape' || (e.ctrlKey && key === '[')) {
        e.preventDefault()
        e.stopImmediatePropagation()
        this.setMode('NORMAL')
        this.editor.focus()
      }
      return
    }

    if (this.mode === 'SEARCH') {
      this.handleSearchKey(e)
      return
    }

    if (e.ctrlKey || e.metaKey || e.altKey) {
      if (e.ctrlKey && !e.altKey && !e.shiftKey) {
        const k = key.toLowerCase()
        if (k === 'd') {
          e.preventDefault()
          e.stopImmediatePropagation()
          this.halfPage(1)
          return
        }
        if (k === 'u') {
          e.preventDefault()
          e.stopImmediatePropagation()
          this.halfPage(-1)
          return
        }
        if (k === 'r') {
          e.preventDefault()
          e.stopImmediatePropagation()
          this.editor.trigger('vim', 'redo', null)
          return
        }
      }
      return
    }

    if (!this.isEventSource(e)) return

    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown' || key === 'Tab') {
      return
    }

    if (key.length !== 1 && !['Enter', 'Backspace', 'Space', 'Escape'].includes(key)) {
      return
    }

    e.preventDefault()
    e.stopImmediatePropagation()

    if (this.mode === 'NORMAL') this.handleNormal(key)
    else this.handleVisual(key)
  }

  // -------------------------------------------------------------
  //  NORMAL mode
  // -------------------------------------------------------------

  private handleNormal(key: string) {
    if (this.replaceCharMode) {
      this.replaceCharMode = false
      this.doReplaceChar(key)
      return
    }

    if (this.awaitingFChar) {
      const dir = this.awaitingFChar.dir
      this.awaitingFChar = null
      if (key.length === 1) {
        this.lastF = { char: key, dir }
        this.fChar(key, dir)
      }
      return
    }

    if (this.pendingG) {
      this.pendingG = false
      if (key === 'g') {
        this.setPos({ line: 1, col: 1 })
      }
      return
    }

    if (this.op) {
      this.resolveOp(key)
      return
    }

    if (key >= '1' && key <= '9') {
      this.count = this.count * 10 + Number(key)
      return
    }

    switch (key) {
      case 'h':
        this.moveHoriz(-1)
        break
      case 'l':
      case 'Space':
        this.moveHoriz(1)
        break
      case 'j':
      case 'Enter':
        this.moveVert(1)
        break
      case 'k':
        this.moveVert(-1)
        break
      case 'w':
      case 'W':
        this.motionWordStart(key === 'W', false)
        break
      case 'b':
      case 'B':
        this.motionWordStart(key === 'B', true)
        break
      case 'e':
      case 'E':
        this.motionWordEnd(key === 'E')
        break
      case '0':
        this.count = 0
        this.setPos({ line: this.pos().line, col: 1 })
        break
      case '$':
        this.moveToEndOfLine()
        break
      case '^':
        this.moveToFirstNonBlank()
        break
      case 'g':
        this.pendingG = true
        break
      case 'G': {
        const c = this.count
        this.count = 0
        this.moveToLine(c === 0 ? this.model()?.getLineCount() ?? 1 : c)
        break
      }
      case '%':
        this.jumpMatchingBracket()
        break
      case 'f':
        this.awaitingFChar = { dir: 1 }
        break
      case 'F':
        this.awaitingFChar = { dir: -1 }
        break
      case ';':
        if (this.lastF) this.fChar(this.lastF.char, this.lastF.dir)
        break
      case ',':
        if (this.lastF) this.fChar(this.lastF.char, this.lastF.dir === 1 ? -1 : 1)
        break
      case '/':
        this.startSearch()
        break
      case 'n':
        this.searchJump(1)
        break
      case 'N':
        this.searchJump(-1)
        break
      case 'i':
        this.enterInsert('i')
        break
      case 'a':
        this.enterInsert('a')
        break
      case 'I':
        this.enterInsert('I')
        break
      case 'A':
        this.enterInsert('A')
        break
      case 'o':
        this.enterInsert('o')
        break
      case 'O':
        this.enterInsert('O')
        break
      case 'x':
        this.deleteChars(1, false)
        break
      case 'X':
        this.deleteChars(1, true)
        break
      case 's':
        this.deleteChars(1, false)
        this.enterInsert('i')
        break
      case 'S':
        this.changeLines(1)
        break
      case 'D':
        this.opDeleteToEnd()
        break
      case 'C':
        this.changeToEnd()
        break
      case 'p':
        this.paste(false)
        break
      case 'P':
        this.paste(true)
        break
      case 'u':
        this.editor.trigger('vim', 'undo', null)
        break
      case 'r':
        this.replaceCharMode = true
        break
      case 'J':
        this.joinLines()
        break
      case '~':
        this.toggleCase()
        break
      case 'd':
      case 'c':
      case 'y':
        this.op = key as Modifier
        break
      case 'v':
        this.startVisual(false)
        break
      case 'V':
        this.startVisual(true)
        break
      case 'Escape':
        this.count = 0
        this.op = null
        this.pendingG = false
        break
      default:
        this.count = 0
        break
    }
  }

  private countOf(): number {
    const c = this.count || 1
    this.count = 0
    return c
  }

  private moveHoriz(dir: number) {
    const n = this.countOf()
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const maxCol = m.getLineMaxColumn(p.line)
    let col = p.col
    for (let i = 0; i < n; i++) col = dir < 0 ? Math.max(1, col - 1) : Math.min(maxCol, col + 1)
    this.setPos({ line: p.line, col })
  }

  private moveVert(dir: number) {
    const n = this.countOf()
    const m = this.model()
    if (!m) return
    const p = this.pos()
    let line = p.line
    for (let i = 0; i < n; i++) line = Math.max(1, Math.min(m.getLineCount(), line + dir))
    this.setPos({ line, col: Math.min(p.col, m.getLineMaxColumn(line)) })
  }

  private moveToLine(line: number) {
    const m = this.model()
    if (!m) return
    const target = Math.max(1, Math.min(m.getLineCount(), line))
    this.setPos({ line: target, col: 1 })
  }

  private motionWordStart(big: boolean, backward: boolean) {
    const n = this.countOf()
    let c = this.pos()
    for (let i = 0; i < n; i++) {
      const next = backward ? this.wordStartPrev(c, big) : this.wordStartNext(c, big)
      if (!next) break
      c = next
    }
    this.setPos(c)
  }

  private motionWordEnd(big: boolean) {
    const n = this.countOf()
    let c = this.pos()
    for (let i = 0; i < n; i++) {
      const next = this.wordEndNext(c, big)
      if (!next) break
      c = next
    }
    this.setPos(c)
  }

  private wordStartNext(c: Cur, big: boolean): Cur | null {
    const m = this.model()
    if (!m) return null
    let ln = c.line
    let col = c.col
    while (ln <= m.getLineCount()) {
      const text = m.getLineContent(ln)
      const idx = this.nextStartIdx(text, text.length, col - 1, big)
      if (idx >= 0) return { line: ln, col: idx + 1 }
      if (ln < m.getLineCount()) {
        ln++
        col = 1
        continue
      }
      return null
    }
    return null
  }

  private nextStartIdx(text: string, len: number, i0: number, big: boolean): number {
    if (len === 0) return -1
    let i = Math.max(0, i0)
    if (i >= len) return -1
    if (cls(text[i]) === 'b') {
      while (i < len && cls(text[i]) === 'b') i++
      return i < len ? i : -1
    }
    if (big) {
      while (i < len && cls(text[i]) !== 'b') i++
    } else {
      const cc = cls(text[i])
      while (i < len && cls(text[i]) === cc) i++
    }
    while (i < len && cls(text[i]) === 'b') i++
    return i < len ? i : -1
  }

  private wordStartPrev(c: Cur, big: boolean): Cur | null {
    const m = this.model()
    if (!m) return null
    let ln = c.line
    let col = c.col
    while (ln >= 1) {
      const text = m.getLineContent(ln)
      const idx = this.prevStartIdx(text, text.length, col - 1, big)
      if (idx >= 0) return { line: ln, col: idx + 1 }
      if (ln > 1) {
        ln--
        col = m.getLineMaxColumn(ln)
        continue
      }
      return null
    }
    return null
  }

  private prevStartIdx(text: string, len: number, i0: number, big: boolean): number {
    if (len === 0) return -1
    let i = i0 >= len ? len - 1 : Math.max(0, i0)
    if (i < 0) return -1
    if (cls(text[i]) === 'b') {
      while (i >= 0 && cls(text[i]) === 'b') i--
    }
    if (i < 0) return -1
    if (big) {
      while (i >= 0 && cls(text[i]) !== 'b') i--
    } else {
      const cc = cls(text[i])
      while (i >= 0 && cls(text[i]) === cc) i--
    }
    return i + 1
  }

  private wordEndNext(c: Cur, big: boolean): Cur | null {
    const m = this.model()
    if (!m) return null
    let ln = c.line
    let col = c.col
    while (ln <= m.getLineCount()) {
      const text = m.getLineContent(ln)
      const idx = this.endIdx(text, text.length, col - 1, big)
      if (idx >= 0) return { line: ln, col: idx }
      if (ln < m.getLineCount()) {
        ln++
        col = 1
        continue
      }
      return null
    }
    return null
  }

  private endIdx(text: string, len: number, i0: number, big: boolean): number {
    if (len === 0) return -1
    let i = Math.max(0, i0)
    if (i >= len) return -1
    if (cls(text[i]) === 'b') {
      while (i < len && cls(text[i]) === 'b') i++
      if (i >= len) return -1
    }
    if (big) {
      while (i < len && cls(text[i]) !== 'b') i++
    } else {
      const cc = cls(text[i])
      while (i < len && cls(text[i]) === cc) i++
    }
    return i
  }

  private moveToEndOfLine() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    this.setPos({ line: p.line, col: m.getLineMaxColumn(p.line) })
  }

  private moveToFirstNonBlank() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const text = m.getLineContent(p.line)
    const i = text.search(/\S/)
    this.setPos({ line: p.line, col: i === -1 ? m.getLineMaxColumn(p.line) : i + 1 })
  }

  private halfPage(dir: number) {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const h = this.editor.getLayoutInfo().height
    const lineH = this.editor.getTopForLineNumber(p.line + 1) - this.editor.getTopForLineNumber(p.line) || 18
    const delta = Math.max(1, Math.round(h / lineH / 2))
    const line = Math.max(1, Math.min(m.getLineCount(), p.line + dir * delta))
    this.setPos({ line, col: p.col })
    this.editor.revealLineInCenter(line)
  }

  private jumpMatchingBracket() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const line = m.getLineContent(p.line)
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
    const rev: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
    const ch = line[p.col - 1]
    if (!ch) return
    const text = m.getValue()
    const start = m.getOffsetAt({ lineNumber: p.line, column: p.col })
    if (pairs[ch]) {
      let depth = 0
      for (let i = start; i < text.length; i++) {
        const c = text[i]
        if (c === ch) depth++
        else if (c === pairs[ch]) {
          depth--
          if (depth === 0) {
            this.editor.setPosition(m.getPositionAt(i + 1))
            return
          }
        }
      }
    } else if (rev[ch]) {
      let depth = 0
      for (let i = start; i >= 0; i--) {
        const c = text[i]
        if (c === ch) depth++
        else if (c === rev[ch]) {
          depth--
          if (depth === 0) {
            this.editor.setPosition(m.getPositionAt(i))
            return
          }
        }
      }
    }
  }

  private fChar(char: string, dir: 1 | -1) {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const text = m.getLineContent(p.line)
    if (dir === 1) {
      for (let i = p.col; i < text.length; i++) {
        if (text[i] === char) {
          this.setPos({ line: p.line, col: i + 1 })
          return
        }
      }
    } else {
      for (let i = p.col - 2; i >= 0; i--) {
        if (text[i] === char) {
          this.setPos({ line: p.line, col: i + 1 })
          return
        }
      }
    }
  }

  // -------------------------------------------------------------
  //  Operators: d / c / y followed by a motion
  // -------------------------------------------------------------

  private resolveOp(key: string) {
    const op = this.op as Modifier
    if (key >= '1' && key <= '9') {
      this.count = this.count * 10 + Number(key)
      return
    }
    const m = this.model()
    if (!m) {
      this.op = null
      return
    }
    const p = this.pos()
    const count = this.count || 1
    this.count = 0
    this.op = null

    // dd / cc / yy
    if (key === op) {
      const lines = Array.from({ length: count }, (_, i) => p.line + i)
      this.applyLineOp(op, lines)
      return
    }
    if (key === 'g' || key === 'G') {
      const start = key === 'g' ? 1 : p.line
      const end = key === 'g' ? p.line : m.getLineCount()
      const lines: number[] = []
      for (let l = Math.min(start, end); l <= Math.max(start, end); l++) lines.push(l)
      this.applyLineOp(op, lines)
      return
    }
    if (key === 'j' || key === 'k') {
      this.applyLineOp(op, [Math.min(p.line, p.line + (key === 'j' ? count : -count)), Math.max(p.line, p.line + (key === 'j' ? count : -count))])
      return
    }

    const target = this.opTarget(key, count)
    if (!target) return
    this.applyRangeOp(op, target)
  }

  private opTarget(key: string, count: number): { start: Cur; end: Cur } | null {
    const m = this.model()
    if (!m) return null
    const p = this.pos()
    const maxCol = m.getLineMaxColumn(p.line)

    switch (key) {
      case 'h':
        return { start: { line: p.line, col: Math.max(1, p.col - count) }, end: { line: p.line, col: p.col } }
      case 'l':
        return { start: { line: p.line, col: p.col }, end: { line: p.line, col: Math.min(maxCol, p.col + count) } }
      case 'w':
      case 'W': {
        let c = p
        let last = c
        for (let i = 0; i < count; i++) {
          const n = this.wordStartNext(c, key === 'W')
          if (!n) break
          last = n
          c = n
        }
        return { start: { line: p.line, col: p.col }, end: { line: last.line, col: Math.max(1, last.col - 1) } }
      }
      case 'e':
      case 'E': {
        let c = p
        let last = c
        for (let i = 0; i < count; i++) {
          const n = this.wordEndNext(c, key === 'E')
          if (!n) break
          last = n
          c = n
        }
        return { start: { line: p.line, col: p.col }, end: { line: last.line, col: last.col } }
      }
      case '$':
        return { start: { line: p.line, col: p.col }, end: { line: p.line, col: maxCol } }
      case '0':
        return { start: { line: p.line, col: 1 }, end: { line: p.line, col: p.col } }
      case '^': {
        const text = m.getLineContent(p.line)
        const i = text.search(/\S/)
        const first = i === -1 ? maxCol : i + 1
        return { start: { line: p.line, col: first }, end: { line: p.line, col: p.col } }
      }
      default:
        return null
    }
  }

  private applyLineOp(op: Modifier, lines: number[]) {
    const m = this.model()
    if (!m) return
    const first = Math.min(...lines)
    const last = Math.max(...lines)
    const lineCount = m.getLineCount()
    const texts = lines.map((l) => m.getLineContent(l))
    if (op === 'y') {
      this.yank = { text: texts.join('\n'), lineMode: true }
      return
    }
    const endPos =
      last === lineCount
        ? { lineNumber: last, column: m.getLineMaxColumn(last) }
        : { lineNumber: last + 1, column: 1 }
    this.editor.executeEdits('vim', [
      {
        range: { startLineNumber: first, startColumn: 1, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
        text: '',
      },
    ])
    this.setPos({ line: Math.max(1, Math.min(first, m.getLineCount())), col: 1 })
    if (op === 'c') this.enterInsert('i')
  }

  private applyRangeOp(op: Modifier, r: { start: Cur; end: Cur }) {
    const m = this.model()
    if (!m) return
    const startLine = Math.min(r.start.line, r.end.line)
    const endLine = Math.max(r.start.line, r.end.line)
    const startCol = r.start.line <= r.end.line ? r.start.col : r.end.col
    const endCol = r.start.line <= r.end.line ? r.end.col : r.start.col
    if (op === 'y') {
      this.yank = {
        text: m.getValueInRange({ startLineNumber: startLine, startColumn: startCol, endLineNumber: endLine, endColumn: endCol }),
        lineMode: false,
      }
      return
    }
    this.editor.executeEdits('vim', [
      {
        range: { startLineNumber: startLine, startColumn: startCol, endLineNumber: endLine, endColumn: endCol },
        text: '',
      },
    ])
    this.setPos({ line: startLine, col: startCol })
    if (op === 'c') this.enterInsert('i')
  }

  // -------------------------------------------------------------
  //  Edits
  // -------------------------------------------------------------

  private doReplaceChar(key: string) {
    const m = this.model()
    if (!m || key.length !== 1) return
    const p = this.pos()
    const line = m.getLineContent(p.line)
    if (p.col <= line.length) {
      this.editor.executeEdits('vim', [
        {
          range: { startLineNumber: p.line, startColumn: p.col, endLineNumber: p.line, endColumn: p.col + 1 },
          text: key,
        },
      ])
      this.setPos({ line: p.line, col: p.col })
    }
  }

  private deleteChars(n: number, before: boolean) {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const line = m.getLineContent(p.line)
    if (before) {
      const c = Math.max(1, p.col - n)
      this.editor.executeEdits('vim', [
        {
          range: { startLineNumber: p.line, startColumn: c, endLineNumber: p.line, endColumn: p.col },
          text: '',
        },
      ])
      this.setPos({ line: p.line, col: c })
    } else {
      const end = Math.min(line.length + 1, p.col + n)
      this.editor.executeEdits('vim', [
        {
          range: { startLineNumber: p.line, startColumn: p.col, endLineNumber: p.line, endColumn: end },
          text: '',
        },
      ])
    }
  }

  private opDeleteToEnd() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const maxCol = m.getLineMaxColumn(p.line)
    this.editor.executeEdits('vim', [
      {
        range: { startLineNumber: p.line, startColumn: p.col, endLineNumber: p.line, endColumn: maxCol },
        text: '',
      },
    ])
  }

  private changeToEnd() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const maxCol = m.getLineMaxColumn(p.line)
    this.editor.executeEdits('vim', [
      {
        range: { startLineNumber: p.line, startColumn: p.col, endLineNumber: p.line, endColumn: maxCol },
        text: '',
      },
    ])
    this.enterInsert('i')
  }

  private changeLines(n: number) {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const last = Math.min(m.getLineCount(), p.line + n - 1)
    const endPos =
      last === m.getLineCount()
        ? { lineNumber: last, column: m.getLineMaxColumn(last) }
        : { lineNumber: last + 1, column: 1 }
    this.editor.executeEdits('vim', [
      {
        range: { startLineNumber: p.line, startColumn: 1, endLineNumber: endPos.lineNumber, endColumn: endPos.column },
        text: '',
      },
    ])
    this.setPos({ line: Math.max(1, Math.min(p.line, m.getLineCount())), col: 1 })
    this.enterInsert('i')
  }

  private paste(before: boolean) {
    const y = this.yank
    if (!y) return
    const n = this.countOf()
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const maxCol = m.getLineMaxColumn(p.line)
    if (y.lineMode) {
      for (let i = 0; i < n; i++) {
        if (before) {
          this.editor.executeEdits('vim', [
            {
              range: { startLineNumber: p.line, startColumn: 1, endLineNumber: p.line, endColumn: 1 },
              text: y.text + '\n',
            },
          ])
        } else {
          this.editor.executeEdits('vim', [
            {
              range: { startLineNumber: p.line, startColumn: maxCol, endLineNumber: p.line, endColumn: maxCol },
              text: '\n' + y.text,
            },
          ])
        }
      }
      this.setPos({ line: before ? p.line : p.line + 1, col: 1 })
    } else {
      const col = Math.max(1, Math.min(maxCol, before ? p.col - 1 : p.col))
      this.editor.executeEdits('vim', [
        {
          range: { startLineNumber: p.line, startColumn: col, endLineNumber: p.line, endColumn: col },
          text: y.text.repeat(Math.max(1, n)),
        },
      ])
      this.setPos({ line: p.line, col: col + y.text.length })
    }
  }

  private joinLines() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    if (p.line >= m.getLineCount()) return
    this.editor.executeEdits('vim', [
      {
        range: { startLineNumber: p.line, startColumn: m.getLineMaxColumn(p.line), endLineNumber: p.line + 1, endColumn: 1 },
        text: ' ',
      },
    ])
    this.setPos({ line: p.line, col: m.getLineMaxColumn(p.line) })
  }

  private toggleCase() {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    const line = m.getLineContent(p.line)
    if (p.col <= line.length) {
      const ch = swapCase(line[p.col - 1])
      this.editor.executeEdits('vim', [
        {
          range: { startLineNumber: p.line, startColumn: p.col, endLineNumber: p.line, endColumn: p.col + 1 },
          text: ch,
        },
      ])
      this.setPos({ line: p.line, col: p.col + 1 })
    }
  }

  private enterInsert(kind: string) {
    const m = this.model()
    if (!m) return
    const p = this.pos()
    switch (kind) {
      case 'a':
        this.setPos({ line: p.line, col: Math.min(m.getLineMaxColumn(p.line), p.col + 1) })
        break
      case 'I': {
        const text = m.getLineContent(p.line)
        const i = text.search(/\S/)
        this.setPos({ line: p.line, col: i === -1 ? m.getLineMaxColumn(p.line) : i + 1 })
        break
      }
      case 'A':
        this.setPos({ line: p.line, col: m.getLineMaxColumn(p.line) })
        break
      case 'o': {
        const n = this.count || 1
        this.count = 0
        const maxCol = m.getLineMaxColumn(p.line)
        this.editor.executeEdits('vim', [
          {
            range: { startLineNumber: p.line, startColumn: maxCol, endLineNumber: p.line, endColumn: maxCol },
            text: '\n'.repeat(n),
          },
        ])
        this.setPos({ line: p.line + n, col: 1 })
        break
      }
      case 'O': {
        const n = this.count || 1
        this.count = 0
        this.editor.executeEdits('vim', [
          {
            range: { startLineNumber: p.line, startColumn: 1, endLineNumber: p.line, endColumn: 1 },
            text: '\n'.repeat(n),
          },
        ])
        this.setPos({ line: p.line, col: 1 })
        break
      }
      case 'i':
      default:
        break
    }
    this.setMode('INSERT')
    this.editor.focus()
  }

  // -------------------------------------------------------------
  //  VISUAL mode
  // -------------------------------------------------------------

  private startVisual(linewise: boolean) {
    const p = this.pos()
    this.anchor = { line: p.line, col: p.col }
    this.setMode(linewise ? 'VISUAL LINE' : 'VISUAL')
    this.syncVisualSelection()
  }

  private onCursorMove() {
    if (this.mode === 'VISUAL' || this.mode === 'VISUAL LINE') {
      this.syncVisualSelection()
    }
  }

  private syncVisualSelection() {
    const m = this.model()
    if (!m || !this.anchor) return
    const p = this.pos()
    if (this.mode === 'VISUAL LINE') {
      const start = Math.min(this.anchor.line, p.line)
      const end = Math.max(this.anchor.line, p.line)
      this.editor.setSelection({
        startLineNumber: start,
        startColumn: 1,
        endLineNumber: end,
        endColumn: m.getLineMaxColumn(end),
      })
    } else {
      this.editor.setSelection({
        startLineNumber: this.anchor.line,
        startColumn: this.anchor.col,
        endLineNumber: p.line,
        endColumn: p.col,
      })
    }
  }

  private handleVisual(key: string) {
    const m = this.model()
    if (!m) return
    if (key >= '1' && key <= '9') {
      this.count = this.count * 10 + Number(key)
      return
    }
    const linewise = this.mode === 'VISUAL LINE'
    const getSel = () => this.editor.getSelection()

    const doDelete = (change: boolean) => {
      const sel = getSel()
      if (!sel) return
      if (linewise) {
        this.editor.executeEdits('vim', [
          {
            range: { startLineNumber: sel.startLineNumber, startColumn: 1, endLineNumber: sel.endLineNumber, endColumn: m.getLineMaxColumn(sel.endLineNumber) },
            text: '',
          },
        ])
        this.setPos({ line: Math.min(sel.startLineNumber, m.getLineCount()), col: 1 })
      } else {
        this.editor.executeEdits('vim', [{ range: sel, text: '' }])
        this.setPos({ line: sel.startLineNumber, col: sel.startColumn })
      }
      this.anchor = null
      this.setMode('NORMAL')
      if (change) this.enterInsert('i')
    }

    switch (key) {
      case 'v':
        if (linewise) {
          this.anchor = this.pos()
          this.setMode('VISUAL')
          this.syncVisualSelection()
        } else {
          this.anchor = null
          this.setMode('NORMAL')
        }
        return
      case 'V':
        if (!linewise) {
          this.anchor = this.pos()
          this.setMode('VISUAL LINE')
          this.syncVisualSelection()
        } else {
          this.anchor = null
          this.setMode('NORMAL')
        }
        return
      case 'y': {
        const sel = getSel()
        if (!sel) return
        if (linewise) {
          const lines: string[] = []
          for (let l = sel.startLineNumber; l <= sel.endLineNumber; l++) lines.push(m.getLineContent(l))
          this.yank = { text: lines.join('\n'), lineMode: true }
        } else {
          this.yank = { text: m.getValueInRange(sel), lineMode: false }
        }
        this.anchor = null
        this.setMode('NORMAL')
        return
      }
      case 'd':
      case 'x':
      case 'X':
        doDelete(false)
        return
      case 'c':
      case 's':
        doDelete(true)
        return
      case 'Escape':
        this.anchor = null
        this.setMode('NORMAL')
        return
      default:
        this.handleNormalMotion(key)
        return
    }
  }

  private handleNormalMotion(key: string) {
    switch (key) {
      case 'h':
        this.moveHoriz(-1)
        break
      case 'l':
      case 'Space':
        this.moveHoriz(1)
        break
      case 'j':
      case 'Enter':
        this.moveVert(1)
        break
      case 'k':
        this.moveVert(-1)
        break
      case 'w':
      case 'W':
        this.motionWordStart(key === 'W', false)
        break
      case 'b':
      case 'B':
        this.motionWordStart(key === 'B', true)
        break
      case 'e':
      case 'E':
        this.motionWordEnd(key === 'E')
        break
      case '0':
        this.setPos({ line: this.pos().line, col: 1 })
        break
      case '$':
        this.moveToEndOfLine()
        break
      case '^':
        this.moveToFirstNonBlank()
        break
      case 'G': {
        const m = this.model()
        if (m) this.setPos({ line: m.getLineCount(), col: 1 })
        break
      }
      default:
        break
    }
  }

  // -------------------------------------------------------------
  //  SEARCH (/)
  // -------------------------------------------------------------

  private startSearch() {
    this.searchBuf = ''
    this.searchMatches = []
    this.searchIndex = -1
    this.setMode('SEARCH')
  }

  private handleSearchKey(e: KeyboardEvent) {
    const key = e.key
    if (key === 'Enter') {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.commitSearch()
      return
    }
    if (key === 'Escape') {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.clearSearchDecorations()
      this.setMode('NORMAL')
      return
    }
    if (key === 'Backspace') {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.searchBuf = this.searchBuf.slice(0, -1)
      return
    }
    if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      e.stopImmediatePropagation()
      this.searchBuf += key
    }
  }

  private commitSearch() {
    const m = this.model()
    if (!m) return
    const pat = this.searchBuf
    if (!pat) {
      this.setMode('NORMAL')
      return
    }
    const text = m.getValue()
    const re = new RegExp(escapeRegExp(pat), 'gi')
    this.searchMatches = []
    let match: RegExpExecArray | null
    while ((match = re.exec(text)) && this.searchMatches.length < 2000) {
      this.searchMatches.push({ offset: match.index, len: match[0].length })
    }
    this.searchIndex = -1
    this.renderSearchDecorations()
    this.searchJump(1)
  }

  private renderSearchDecorations() {
    const m = this.model()
    if (!m) return
    if (!this.deco) {
      const coll = this.editor.createDecorationsCollection([])
      this.deco = { set: (arr) => coll.set(arr as never[]) }
    }
    const arr = this.searchMatches.map((mt) => {
      const start = m.getPositionAt(mt.offset)
      const end = m.getPositionAt(mt.offset + mt.len)
      return {
        range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column },
        options: { inlineClassName: 'vim-search-match', stickiness: 1 },
      }
    })
    this.deco.set(arr)
  }

  private clearSearchDecorations() {
    this.deco?.set([])
  }

  private searchJump(dir: 1 | -1) {
    const m = this.model()
    if (!m || this.searchMatches.length === 0) return
    const p = this.editor.getPosition()
    if (!p) return
    const cur = m.getOffsetAt(p)
    if (this.searchIndex < 0) {
      if (dir === 1) {
        let idx = this.searchMatches.findIndex((x) => x.offset >= cur)
        if (idx === -1) idx = 0
        this.searchIndex = idx
      } else {
        let idx = -1
        for (let i = this.searchMatches.length - 1; i >= 0; i--) {
          if (this.searchMatches[i].offset < cur) {
            idx = i
            break
          }
        }
        if (idx === -1) idx = this.searchMatches.length - 1
        this.searchIndex = idx
      }
    } else {
      this.searchIndex += dir
      if (this.searchIndex < 0) this.searchIndex = this.searchMatches.length - 1
      if (this.searchIndex >= this.searchMatches.length) this.searchIndex = 0
    }
    const mt = this.searchMatches[this.searchIndex]
    const pos = m.getPositionAt(mt.offset)
    this.editor.setPosition(pos)
    this.editor.revealLineInCenter(pos.lineNumber)
    this.setMode('NORMAL')
  }

  destroy() {
    this.setEnabled(false)
    this.clearSearchDecorations()
  }
}
