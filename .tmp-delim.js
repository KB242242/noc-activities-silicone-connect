const ts = require("typescript");
const fs = require("fs");
const p = "src/components/tickets/TicketDetailShell.tsx";
const s = fs.readFileSync(p, "utf8");
const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.JSX, s);
const openToClose = new Map([
  [ts.SyntaxKind.OpenBraceToken, ts.SyntaxKind.CloseBraceToken],
  [ts.SyntaxKind.OpenParenToken, ts.SyntaxKind.CloseParenToken],
  [ts.SyntaxKind.OpenBracketToken, ts.SyntaxKind.CloseBracketToken],
]);
const closeToOpen = new Map([
  [ts.SyntaxKind.CloseBraceToken, ts.SyntaxKind.OpenBraceToken],
  [ts.SyntaxKind.CloseParenToken, ts.SyntaxKind.OpenParenToken],
  [ts.SyntaxKind.CloseBracketToken, ts.SyntaxKind.OpenBracketToken],
]);
const stack = [];
const mismatches = [];
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  if (openToClose.has(token)) {
    stack.push({ kind: token, pos: scanner.getTokenPos() });
  } else if (closeToOpen.has(token)) {
    const expectedOpen = closeToOpen.get(token);
    const top = stack[stack.length - 1];
    if (!top || top.kind !== expectedOpen) {
      mismatches.push({ token, pos: scanner.getTokenPos(), top });
    } else {
      stack.pop();
    }
  }
  token = scanner.scan();
}
const sf = ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log(`Mismatches: ${mismatches.length}`);
for (const m of mismatches.slice(0,10)) {
  const lc = sf.getLineAndCharacterOfPosition(m.pos);
  const topInfo = m.top ? `${ts.SyntaxKind[m.top.kind]} at ${(() => {const t=sf.getLineAndCharacterOfPosition(m.top.pos); return (t.line+1)+":"+(t.character+1);})()}` : "none";
  console.log(`close ${ts.SyntaxKind[m.token]} at ${lc.line+1}:${lc.character+1}; top=${topInfo}`);
}
console.log(`Unclosed: ${stack.length}`);
for (const item of stack.slice(-10)) {
  const lc = sf.getLineAndCharacterOfPosition(item.pos);
  console.log(`${ts.SyntaxKind[item.kind]} at ${lc.line+1}:${lc.character+1}`);
}
