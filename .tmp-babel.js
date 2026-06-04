const fs = require("fs");
const parser = require("@babel/parser");
const p = "src/components/tickets/TicketDetailShell.tsx";
const s = fs.readFileSync(p, "utf8");
try {
  parser.parse(s, { sourceType: "module", plugins: ["typescript", "jsx"] });
  console.log("Babel parse OK");
} catch (e) {
  console.log("Babel error:", e.message);
  if (e.loc) console.log(`at ${e.loc.line}:${e.loc.column+1}`);
}
