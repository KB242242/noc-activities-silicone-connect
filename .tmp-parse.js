const ts = require("typescript");
const fs = require("fs");
const p = "src/components/tickets/TicketDetailShell.tsx";
const s = fs.readFileSync(p, "utf8");
const sf = ts.createSourceFile(p, s, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
if (!sf.parseDiagnostics.length) {
  console.log("No parse diagnostics");
  process.exit(0);
}
for (const d of sf.parseDiagnostics) {
  const pos = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`${pos.line + 1}:${pos.character + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
}
process.exit(1);
