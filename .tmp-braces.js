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
let token = scanner.scan();
while (token !== ts.SyntaxKind.EndOfFileToken) {
  if (openToClose.has(token)) {
    stack.push({ kind: token, pos: scanner.getTokenPos() });
  } else if (closeToOpen.has(token)) {
    const expectedOpen = closeToOpen.get(token);
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].kind === expectedOpen) {
        stack.splice(i, 1);
        break;
      }
    }
  }
  token = scanner.scan();
}
const sf = ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
console.log(`Unclosed tokens: ${stack.length}`);
for (const item of stack.slice(-20)) {
  const lc = sf.getLineAndCharacterOfPosition(item.pos);
  console.log(`${ts.SyntaxKind[item.kind]} at ${lc.line + 1}:${lc.character + 1}`);
}
