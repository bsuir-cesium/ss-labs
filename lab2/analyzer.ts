import * as ts from 'typescript';

export interface Entry { line: number; text: string; kind: string; depth?: number; scope: string; }
export interface Result {
  CL: number; N: number; cl: number | null; CLI: number;
  branches: Entry[]; statements: Entry[]; profile: string;
}
export function analyze(source: string): Result {
  if (!source.trim()) throw new Error('Введите исходный код TypeScript.');
  if (source.length > 120_000) throw new Error('Код должен содержать не больше 120 000 символов.');
  const file = ts.createSourceFile('input.ts', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const options: ts.CompilerOptions = {target: ts.ScriptTarget.ES2022, noLib: true, noResolve: true};
  // A closed in-memory host: imports are never fetched and no source is executed.
  const host: ts.CompilerHost = {
    getSourceFile: name => name === 'input.ts' ? file : undefined,
    getDefaultLibFileName: () => '', writeFile: () => {}, getCurrentDirectory: () => '',
    getDirectories: () => [], fileExists: name => name === 'input.ts',
    readFile: name => name === 'input.ts' ? source : undefined,
    getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true, getNewLine: () => '\n'
  };
  const program = ts.createProgram(['input.ts'], options, host);
  const diagnostics = program.getSyntacticDiagnostics(file);
  if (diagnostics.length) throw new Error(diagnostics.slice(0, 5).map(d => {
    const p = file.getLineAndCharacterOfPosition(d.start ?? 0);
    return `Строка ${p.line + 1}:${p.character + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
  }).join('\n'));
  const statements: Entry[] = [], branches: Entry[] = [];
  let scope = 'верхний уровень';
  let nesting = 0;
  const entry = (node: ts.Node, kind: string): Entry => ({
    line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
    text: node.getText(file).split('\n')[0].trim().slice(0, 160), kind, scope
  });
  const branch = (node: ts.Node, kind: string, depth: number) => branches.push({...entry(node, kind), depth});
  const unsupported = (node: ts.Node): never => {
    throw new Error(`Строка ${entry(node, '').line}: ${ts.SyntaxKind[node.kind]} не поддерживается учебным профилем. Результат не вычислен.`);
  };
  function expr(node: ts.Node | undefined, depth: number): void {
    if (!node) return;
    if (++nesting > 350) throw new Error('Слишком большая вложенность кода.');
    if (ts.isTypeNode(node)) { nesting--; return; }
    if (ts.isMethodDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) unsupported(node);
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (ts.isFunctionExpression(node) && node.asteriskToken) unsupported(node);
      const previous = scope; scope = `функция, строка ${entry(node, '').line}`;
      node.parameters.forEach(p => expr(p, 0));
      if (ts.isBlock(node.body)) walk(node.body, 0, 0, 0);
      else {statements.push(entry(node.body, 'неявный return')); expr(node.body, 0);}
      scope = previous;
    } else if (ts.isConditionalExpression(node)) {
      branch(node, '?:', depth);
      expr(node.condition, depth); expr(node.whenTrue, depth + 1); expr(node.whenFalse, depth + 1);
    } else if (ts.isClassExpression(node) || ts.isYieldExpression(node) || ts.isTaggedTemplateExpression(node)) {
      unsupported(node);
    } else {
      // &&, ||, ?? and optional chaining do not add decisions in this profile.
      ts.forEachChild(node, child => { expr(child, depth); });
    }
    nesting--;
  }
  function walk(node: ts.Statement, depth: number, loops: number, switches: number): void {
    if (++nesting > 350) throw new Error('Слишком большая вложенность кода.');
    if (ts.isBlock(node)) node.statements.forEach(s => walk(s, depth, loops, switches));
    else if (ts.isFunctionDeclaration(node)) {
      if (node.asteriskToken) unsupported(node);
      const previous = scope; scope = node.name?.text ?? 'функция';
      node.parameters.forEach(p => expr(p, 0));
      if (node.body) walk(node.body, 0, 0, 0);
      scope = previous;
    } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)
      || ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      // Type-only structure and module declarations have no counted statements.
    } else if (ts.isIfStatement(node)) {
      statements.push(entry(node, 'if')); branch(node, 'if', depth);
      expr(node.expression, depth); walk(node.thenStatement, depth + 1, loops, switches);
      if (node.elseStatement) walk(node.elseStatement, depth + 1, loops, switches);
    } else if (ts.isSwitchStatement(node)) {
      statements.push(entry(node, 'switch')); expr(node.expression, depth);
      const count = node.caseBlock.clauses.filter(ts.isCaseClause).length;
      if (node.caseBlock.clauses.length - count > 1) throw new Error('В switch допускается только один default.');
      let index = 0;
      for (const clause of node.caseBlock.clauses) {
        let bodyDepth: number;
        if (ts.isCaseClause(clause)) {
          branch(clause, 'case', depth + index);
          expr(clause.expression, depth + index);
          bodyDepth = depth + ++index;
        } else bodyDepth = depth + count;
        clause.statements.forEach(s => walk(s, bodyDepth, loops, switches + 1));
      }
    } else if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
      const kind = ts.isForStatement(node) ? 'for' : ts.isForInStatement(node) ? 'for-in' : 'for-of';
      statements.push(entry(node, kind)); branch(node, kind, depth);
      // ECMAScript initializer is NOT a separate Statement (unlike C++ init-statement).
      expr(node.initializer, depth);
      if (ts.isForStatement(node)) {expr(node.condition, depth); expr(node.incrementor, depth + 1);}
      else expr(node.expression, depth);
      walk(node.statement, depth + 1, loops + 1, switches);
    } else if (ts.isWhileStatement(node) || ts.isDoStatement(node)) {
      const kind = ts.isDoStatement(node) ? 'do-while' : 'while';
      statements.push(entry(node, kind)); branch(node, kind, depth);
      expr(node.expression, depth); walk(node.statement, depth + 1, loops + 1, switches);
    } else if (ts.isVariableStatement(node)) {
      statements.push(entry(node, 'объявление'));
      node.declarationList.declarations.forEach(d => expr(d, depth));
    } else if (ts.isExpressionStatement(node) || ts.isReturnStatement(node) || ts.isThrowStatement(node)) {
      if (ts.isReturnStatement(node) && scope === 'верхний уровень') throw new Error('return вне функции.');
      statements.push(entry(node, ts.isReturnStatement(node) ? 'return' : ts.isThrowStatement(node) ? 'throw' : 'выражение'));
      expr(node.expression, depth);
    } else if (ts.isBreakStatement(node) || ts.isContinueStatement(node)) {
      if (node.label) unsupported(node);
      if (ts.isBreakStatement(node) ? !loops && !switches : !loops) throw new Error('break/continue вне допустимого цикла или switch.');
      statements.push(entry(node, ts.isBreakStatement(node) ? 'break' : 'continue'));
    } else if (ts.isEmptyStatement(node) || ts.isDebuggerStatement(node)) {
      statements.push(entry(node, ts.isEmptyStatement(node) ? 'пустой оператор' : 'debugger'));
    } else unsupported(node);
    nesting--;
  }
  try {file.statements.forEach(node => walk(node, 0, 0, 0));}
  catch (error) {
    if (error instanceof RangeError) throw new Error('Слишком большая вложенность кода.');
    throw error;
  }
  const CL = branches.length, N = statements.length;
  return {CL, N, cl: N ? CL / N : null, CLI: Math.max(0, ...branches.map(b => b.depth ?? 0)),
    branches: branches.sort((a,b) => a.line - b.line), statements: statements.sort((a,b) => a.line - b.line),
    profile: 'gilb-typescript-classroom-v1'};
}
