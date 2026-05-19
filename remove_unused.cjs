const { Project, SyntaxKind } = require("ts-morph");

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
    compilerOptions: {
        noUnusedLocals: true,
        noUnusedParameters: true
    }
});

project.addSourceFilesAtPaths("src/App.tsx");
project.addSourceFilesAtPaths("src/AdminApp.tsx");

const diagnostics = project.getPreEmitDiagnostics();
let removedCount = 0;

diagnostics.forEach(diag => {
    const code = diag.getCode();
    // TS6133 is '... is declared but its value is never read.'
    if (code === 6133) {
        const file = diag.getSourceFile();
        if (file) {
            const start = diag.getStart();
            if (start) {
                const node = file.getDescendantAtPos(start);
                if (node) {
                    try {
                        // If it's an import specifier (e.g., Mail in import { Mail } from '...')
                        if (node.getParent() && node.getParent().getKindName() === 'ImportSpecifier') {
                            const specifier = node.getParent();
                            const importDecl = specifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
                            specifier.remove();
                            removedCount++;
                            // If import declaration is now empty, remove it
                            if (importDecl && importDecl.getNamedImports().length === 0 && !importDecl.getDefaultImport()) {
                                importDecl.remove();
                            }
                        } else if (node.getParent() && node.getParent().getKindName() === 'VariableDeclaration') {
                            const varDecl = node.getParent();
                            const stmt = varDecl.getFirstAncestorByKind(240); // VariableStatement
                            if (stmt) {
                                stmt.remove();
                                removedCount++;
                            }
                        } else if (node.getParent() && node.getParent().getKindName() === 'FunctionDeclaration') {
                            node.getParent().remove();
                            removedCount++;
                        } else if (node.getParent() && node.getParent().getKindName() === 'BindingElement') { // Array destructuring for useState
                            const varDecl = node.getParent().getFirstAncestorByKind(257); // VariableDeclaration
                            if (varDecl) {
                                const stmt = varDecl.getFirstAncestorByKind(240); // VariableStatement
                                if (stmt) {
                                    stmt.remove();
                                    removedCount++;
                                }
                            }
                        }
                    } catch (e) {
                        console.log("Error removing node at", start, e.message);
                    }
                }
            }
        }
    }
});

project.saveSync();
console.log("Removed", removedCount, "unused elements.");
