// Monaco Editor のモック
export const editor = {
  create: () => ({}),
  createModel: () => ({}),
  setTheme: () => {},
  defineTheme: () => {},
  setModelLanguage: () => {}
};

export const languages = {
  register: () => {},
  setMonarchTokensProvider: () => {},
  setLanguageConfiguration: () => {}
};

export const Uri = {
  parse: (path: string) => ({ toString: () => path })
};

export const Range = class {
  constructor(public startLineNumber: number, public startColumn: number, public endLineNumber: number, public endColumn: number) {}
};

export const Position = class {
  constructor(public lineNumber: number, public column: number) {}
};

export default {
  editor,
  languages,
  Uri,
  Range,
  Position
};