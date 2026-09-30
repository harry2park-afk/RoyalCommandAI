import ts from "typescript";

// This initial Preview authority permits presentational panel edits only.
// Model review cannot expand it into executable, network or storage authority.
function executableShape(source: string) {
  const file = ts.createSourceFile("candidate.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const errors = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true, fileName: "candidate.tsx" }).diagnostics || [];
  if (errors.some((error) => error.category === ts.DiagnosticCategory.Error)) throw new Error("CANDIDATE_SYNTAX_ERROR");
  const transformed = ts.transform(file, [(context) => {
    const visit: ts.Visitor = (node) => {
      if (ts.isJsxText(node)) return context.factory.createJsxText("DISPLAY_TEXT");
      if (ts.isJsxAttribute(node) && ["className", "title", "aria-label"].includes(node.name.getText(file)) && node.initializer && ts.isStringLiteral(node.initializer)) {
        if (node.name.getText(file) === "className" && !/^[a-zA-Z0-9 _:#/\[\].%!+\-]*$/.test(node.initializer.text)) throw new Error("UNSAFE_STYLE_VALUE");
        return context.factory.updateJsxAttribute(node, node.name, context.factory.createStringLiteral("DISPLAY_ATTRIBUTE"));
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (root) => ts.visitNode(root, visit) as ts.SourceFile;
  }]);
  // JSX/compiler directives in comments can change imports and execution.
  try { return ts.createPrinter({ removeComments: false, newLine: ts.NewLineKind.LineFeed }).printFile(transformed.transformed[0]); }
  finally { transformed.dispose(); }
}
export function assertPresentationOnly(before: string, after: string) {
  if (executableShape(before) !== executableShape(after)) throw new Error("EXECUTABLE_CHANGE_OUTSIDE_APPROVAL");
}
