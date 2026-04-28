const { Project } = require("ts-morph");

const project = new Project();
project.addSourceFilesAtPaths("../apps/web/**/*.ts");
project.addSourceFilesAtPaths("../apps/web/**/*.tsx");
project.addSourceFilesAtPaths("../apps/market-engine/**/*.ts");
project.addSourceFilesAtPaths("../packages/**/*.ts");
project.addSourceFilesAtPaths("../packages/**/*.tsx");

const fnsToFind = ["formatCurrency", "formatPct", "toFiniteNumber", "toDateKey"];

for (const sourceFile of project.getSourceFiles()) {
    let changed = false;
    const removedFns = [];

    // Find and remove functions and arrow functions
    for (const fnName of fnsToFind) {
        // Function declarations
        const fnDecls = sourceFile.getFunctions().filter(f => f.getName() === fnName);
        for (const f of fnDecls) {
            f.remove();
            changed = true;
            if (!removedFns.includes(fnName)) removedFns.push(fnName);
        }

        // Variable declarations (arrow functions)
        const varDecls = sourceFile.getVariableDeclarations().filter(v => v.getName() === fnName);
        for (const v of varDecls) {
            const parent = v.getFirstAncestorByKind(require("ts-morph").SyntaxKind.VariableStatement);
            if (parent) {
                parent.remove();
                changed = true;
                if (!removedFns.includes(fnName)) removedFns.push(fnName);
            }
        }
    }

    if (changed) {
        // Also figure out if we actually need the imports.
        // We only add them if there's an unresolved reference or if we removed them and the file still uses the name.
        // The simplest way is just to add the import if it's used as an identifier somewhere other than an import statement.
        let stillUsed = [];
        for (const fnName of fnsToFind) {
            const ids = sourceFile.getDescendantsOfKind(require("ts-morph").SyntaxKind.Identifier);
            if (ids.some(id => id.getText() === fnName)) {
                stillUsed.push(fnName);
            }
        }

        if (stillUsed.length > 0) {
            // Check if @paper-market/core is already imported
            const existingImport = sourceFile.getImportDeclaration(dec => dec.getModuleSpecifierValue() === "@paper-market/core");
            if (existingImport) {
                for (const fnName of stillUsed) {
                    const hasImport = existingImport.getNamedImports().some(ni => ni.getName() === fnName);
                    if (!hasImport) {
                        existingImport.addNamedImport(fnName);
                    }
                }
            } else {
                sourceFile.addImportDeclaration({
                    moduleSpecifier: "@paper-market/core",
                    namedImports: stillUsed
                });
            }
        }
        
        console.log(`Updated ${sourceFile.getFilePath()}`);
    }
}

project.saveSync();
console.log("Done refactoring with ts-morph.");
