import type { Monaco } from '@monaco-editor/react'
import { languages } from 'monaco-editor'

const KEYWORDS = [
  'False', 'None', 'True', '_', 'and', 'as', 'assert', 'async', 'await', 'break',
  'case', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'exec',
  'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda',
  'match', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while',
  'with', 'yield'
]

const BUILTINS = [
  'List', 'Dict', 'Set', 'Tuple', 'Optional', 'Union', 'Any', 'Counter',
  'defaultdict', 'deque', 'OrderedDict', 'int', 'str', 'float', 'bool', 'bytes',
  'range', 'len', 'enumerate', 'map', 'filter', 'sorted', 'reversed', 'zip',
  'max', 'min', 'abs', 'sum', 'pow', 'divmod', 'print', 'input', 'open',
  'object', 'type', 'isinstance', 'issubclass', 'super', 'property', 'staticmethod',
  'classmethod', 'iter', 'next', 'all', 'any', 'bin', 'hex', 'oct', 'chr', 'ord',
  'format', 'hash', 'id', 'callable', 'slice', 'Exception', 'ValueError',
  'TypeError', 'IndexError', 'KeyError', 'RuntimeError', 'StopIteration'
]

const conf: languages.LanguageConfiguration = {
  comments: { lineComment: '#' },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string', 'comment'] }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ],
  onEnterRules: [
    {
      beforeText: /^\s*(?:def|class|for|if|elif|else|while|try|with|finally|except|async).*?:\s*$/,
      action: { indentAction: languages.IndentAction.Indent }
    }
  ],
  folding: {
    offSide: true,
    markers: {
      start: /^\s*#region\b/,
      end: /^\s*#endregion\b/
    }
  }
}

const language: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.python',
  keywords: KEYWORDS,
  builtins: BUILTINS,
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.bracket' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' }
  ],
  tokenizer: {
    root: [
      { include: '@whitespace' },
      { include: '@numbers' },
      { include: '@strings' },
      [/[,:;]/, 'delimiter'],
      [/[{}\[\]()]/, '@brackets'],
      [/@[a-zA-Z_]\w*/, 'tag'],
      [/\bclass\b/, 'keyword', '@className'],
      [/\bdef\b/, 'keyword', '@funcName'],
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@builtins': 'type.identifier',
            self: 'variable.language',
            '@default': 'identifier'
          }
        }
      ]
    ],
    className: [
      [/[A-Z]\w*/, 'type.identifier', '@pop'],
      [/[a-zA-Z_]\w*/, 'type.identifier', '@pop'],
      ['', '', '@pop']
    ],
    funcName: [
      [/[a-zA-Z_]\w*/, 'function', '@pop'],
      ['', '', '@pop']
    ],
    whitespace: [
      [/\s+/, 'white'],
      [/(^#.*$)/, 'comment'],
      [/'''/, 'string', '@endDocString'],
      [/"""/, 'string', '@endDblDocString']
    ],
    endDocString: [
      [/[^']+/, 'string'],
      [/\\'/, 'string'],
      [/'''/, 'string', '@popall'],
      [/'/, 'string']
    ],
    endDblDocString: [
      [/[^"]+/, 'string'],
      [/\\"/, 'string'],
      [/"""/, 'string', '@popall'],
      [/"/, 'string']
    ],
    numbers: [
      [/-?0x([a-fA-F]|\d)+[lL]?/, 'number.hex'],
      [/-?(\d*\.)?\d+([eE][+-]?\d+)?[jJ]?[lL]?/, 'number']
    ],
    strings: [
      [/'$/, 'string.escape', '@popall'],
      [/f'{1,3}/, 'string.escape', '@fStringBody'],
      [/'/, 'string.escape', '@stringBody'],
      [/"$/, 'string.escape', '@popall'],
      [/f"{1,3}/, 'string.escape', '@fDblStringBody'],
      [/"/, 'string.escape', '@dblStringBody']
    ],
    fStringBody: [
      [/[^\\'{}\]]+$/, 'string', '@popall'],
      [/[^\\'{}\]]+/, 'string'],
      [/\{[^}':!=]+/, 'identifier', '@fStringDetail'],
      [/\\./, 'string'],
      [/'/, 'string.escape', '@popall'],
      [/\\$/, 'string']
    ],
    stringBody: [
      [/[^\\']+$/, 'string', '@popall'],
      [/[^\\']+/, 'string'],
      [/\\./, 'string'],
      [/'/, 'string.escape', '@popall'],
      [/\\$/, 'string']
    ],
    fDblStringBody: [
      [/[^\\"{}\]]+$/, 'string', '@popall'],
      [/[^\\"{}\]]+/, 'string'],
      [/\{[^}':!=]+/, 'identifier', '@fStringDetail'],
      [/\\./, 'string'],
      [/"/, 'string.escape', '@popall'],
      [/\\$/, 'string']
    ],
    dblStringBody: [
      [/[^\\"]+$/, 'string', '@popall'],
      [/[^\\"]+/, 'string'],
      [/\\./, 'string'],
      [/"/, 'string.escape', '@popall'],
      [/\\$/, 'string']
    ],
    fStringDetail: [
      [/[:][^}]+/, 'string'],
      [/![ars]/, 'string'],
      [/=/, 'string'],
      [/\}/, 'identifier', '@pop']
    ]
  }
}

export function registerEnhancedPython(m: Monaco): void {
  m.languages.setMonarchTokensProvider('python', language)
  m.languages.setLanguageConfiguration('python', conf)
}
