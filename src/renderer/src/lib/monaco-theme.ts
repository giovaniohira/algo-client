import type { Monaco } from '@monaco-editor/react'

// Tokyo Night Storm palette — tuned for Algo Client
const c = {
  fg: 'c0caf5',
  comment: '565f89',
  keyword: 'bb9af7',
  func: '7aa2f7',
  string: '9ece6a',
  number: 'ff9e64',
  type: '7dcfff',
  builtin: '2ac3de',
  param: 'e0af68',
  const: 'ff9e64',
  operator: '89ddff',
  delimiter: 'a9b1d6',
  variable: 'c0caf5',
  self: 'f7768e',
  tag: 'f7768e',
  attr: '7dcfff',
  regex: 'b4f9f8',
  escape: '7dcfff',
  macro: '7dcfff',
  error: 'f7768e',
  markup: '73daca'
} as const

export function defineAlgoNordTheme(monaco: Monaco): void {
  monaco.editor.defineTheme('algo-nord', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Comments
      { token: 'comment', foreground: c.comment, fontStyle: 'italic' },
      { token: 'comment.line', foreground: c.comment, fontStyle: 'italic' },
      { token: 'comment.block', foreground: c.comment, fontStyle: 'italic' },
      { token: 'comment.doc', foreground: c.comment, fontStyle: 'italic' },

      // Keywords & control flow
      { token: 'keyword', foreground: c.keyword },
      { token: 'keyword.control', foreground: c.keyword },
      { token: 'keyword.control.flow', foreground: c.keyword },
      { token: 'keyword.control.import', foreground: c.keyword },
      { token: 'keyword.control.return', foreground: c.keyword },
      { token: 'keyword.operator', foreground: c.operator },
      { token: 'keyword.other', foreground: c.keyword },
      { token: 'storage', foreground: c.keyword },
      { token: 'storage.type', foreground: c.type },
      { token: 'storage.modifier', foreground: c.keyword },

      // Types & classes
      { token: 'type', foreground: c.type },
      { token: 'type.identifier', foreground: c.type },
      { token: 'class', foreground: c.type },
      { token: 'class.name', foreground: c.type, fontStyle: 'bold' },
      { token: 'interface', foreground: c.type },
      { token: 'struct', foreground: c.type },
      { token: 'enum', foreground: c.type },
      { token: 'enumMember', foreground: c.param },
      { token: 'namespace', foreground: c.type },
      { token: 'typeParameter', foreground: c.type },
      { token: 'support.type', foreground: c.type },
      { token: 'support.class', foreground: c.type },

      // Functions & methods
      { token: 'function', foreground: c.func },
      { token: 'function.name', foreground: c.func },
      { token: 'method', foreground: c.func },
      { token: 'member', foreground: c.func },
      { token: 'support.function', foreground: c.builtin },
      { token: 'entity.name.function', foreground: c.func },
      { token: 'entity.name.method', foreground: c.func },

      // Variables & parameters
      { token: 'identifier', foreground: c.variable },
      { token: 'variable', foreground: c.variable },
      { token: 'variable.parameter', foreground: c.param },
      { token: 'variable.predefined', foreground: c.self },
      { token: 'variable.language', foreground: c.self },
      { token: 'variable.other', foreground: c.variable },
      { token: 'parameter', foreground: c.param },
      { token: 'property', foreground: c.variable },
      { token: 'property.name', foreground: c.variable },

      // Constants & literals
      { token: 'constant', foreground: c.const },
      { token: 'constant.language', foreground: c.self },
      { token: 'constant.numeric', foreground: c.number },
      { token: 'constant.character', foreground: c.string },
      { token: 'constant.character.escape', foreground: c.escape },
      { token: 'number', foreground: c.number },
      { token: 'number.hex', foreground: c.number },
      { token: 'number.float', foreground: c.number },
      { token: 'number.binary', foreground: c.number },
      { token: 'number.octal', foreground: c.number },
      { token: 'boolean', foreground: c.self },

      // Strings
      { token: 'string', foreground: c.string },
      { token: 'string.key', foreground: c.string },
      { token: 'string.value', foreground: c.string },
      { token: 'string.escape', foreground: c.escape },
      { token: 'string.escape.invalid', foreground: c.error },
      { token: 'string.regexp', foreground: c.regex },
      { token: 'string.template', foreground: c.string },
      { token: 'regexp', foreground: c.regex },

      // Operators & delimiters
      { token: 'operator', foreground: c.operator },
      { token: 'delimiter', foreground: c.delimiter },
      { token: 'delimiter.bracket', foreground: c.delimiter },
      { token: 'delimiter.parenthesis', foreground: c.delimiter },
      { token: 'delimiter.curly', foreground: c.delimiter },
      { token: 'delimiter.angle', foreground: c.delimiter },
      { token: 'punctuation', foreground: c.delimiter },
      { token: 'punctuation.definition', foreground: c.delimiter },
      { token: 'punctuation.separator', foreground: c.delimiter },
      { token: 'punctuation.terminator', foreground: c.delimiter },

      // Python / decorators / annotations
      { token: 'annotation', foreground: c.macro },
      { token: 'decorator', foreground: c.macro },
      { token: 'meta.decorator', foreground: c.macro },
      { token: 'attribute.name', foreground: c.attr },
      { token: 'attribute.value', foreground: c.string },
      { token: 'tag', foreground: c.tag },
      { token: 'metatag', foreground: c.keyword },

      // Rust / Go / C++ specifics
      { token: 'macro', foreground: c.macro },
      { token: 'macro.name', foreground: c.macro },
      { token: 'preprocessor', foreground: c.macro },
      { token: 'directive', foreground: c.macro },
      { token: 'directive.name', foreground: c.macro },
      { token: 'lifetime', foreground: c.type },
      { token: 'character', foreground: c.string },

      // Generics & meta
      { token: 'meta', foreground: c.variable },
      { token: 'meta.embedded', foreground: c.variable },
      { token: 'generic', foreground: c.type },
      { token: 'invalid', foreground: c.error },
      { token: 'invalid.illegal', foreground: c.error },
      { token: 'markup.heading', foreground: c.func, fontStyle: 'bold' },
      { token: 'markup.inserted', foreground: c.markup },
      { token: 'markup.deleted', foreground: c.error }
    ],
    colors: {
      'editor.background': '#1a1a1a',
      'editor.foreground': `#${c.fg}`,
      'editorLineNumber.foreground': '#3f3f3f',
      'editorLineNumber.activeForeground': '#737373',
      'editor.selectionBackground': '#3b82f640',
      'editor.inactiveSelectionBackground': '#3b82f625',
      'editor.selectionHighlightBackground': '#3b82f620',
      'editor.wordHighlightBackground': '#3b82f618',
      'editor.wordHighlightStrongBackground': '#3b82f628',
      'editor.findMatchBackground': '#3b82f650',
      'editor.findMatchHighlightBackground': '#3b82f630',
      'editorCursor.foreground': '#3b82f6',
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.lineHighlightBorder': '#ffffff00',
      'editorGutter.background': '#1a1a1a',
      'editorBracketMatch.background': '#3b82f625',
      'editorBracketMatch.border': '#3b82f680',
      'editorBracketHighlight.foreground1': '#89ddff',
      'editorBracketHighlight.foreground2': '#bb9af7',
      'editorBracketHighlight.foreground3': '#7aa2f7',
      'editorBracketHighlight.foreground4': '#9ece6a',
      'editorBracketHighlight.foreground5': '#ff9e64',
      'editorBracketHighlight.foreground6': '#f7768e',
      'editorIndentGuide.background': '#ffffff10',
      'editorIndentGuide.activeBackground': '#ffffff20',
      'editorWhitespace.foreground': '#ffffff15',
      'editorOverviewRuler.border': '#00000000',
      'scrollbarSlider.background': '#ffffff15',
      'scrollbarSlider.hoverBackground': '#ffffff25',
      'scrollbarSlider.activeBackground': '#ffffff35'
    }
  })
}

export const editorHighlightOptions = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  fontLigatures: true,
  fontWeight: '400',
  lineHeight: 22,
  letterSpacing: 0.3,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: 'line' as const,
  cursorBlinking: 'smooth' as const,
  cursorSmoothCaretAnimation: 'on' as const,
  smoothScrolling: true,
  bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
  guides: {
    bracketPairs: true,
    bracketPairsHorizontal: 'active' as const,
    indentation: true,
    highlightActiveIndentation: true
  },
  matchBrackets: 'always' as const,
  occurrencesHighlight: 'singleFile' as const,
  selectionHighlight: true,
  renderWhitespace: 'selection' as const,
  colorDecorators: true
}
