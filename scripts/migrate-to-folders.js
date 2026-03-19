/**
 * migrate-to-folders.js — Script di migrazione codebase CronoReport
 * 
 * Sposta 26 file JS dalla root in cartelle logiche dentro src/
 * e aggiorna automaticamente tutti gli import relativi.
 * 
 * Usa: node scripts/migrate-to-folders.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ══════════════════════════════════════════════
// MAPPA: file → cartella di destinazione (relativa a ROOT)
// ══════════════════════════════════════════════
const FILE_MAP = {
    // core/
    'appState.js':        'src/core',
    'firebaseConfig.js':  'src/core',
    'notify.js':          'src/core',
    'userPreferences.js': 'src/core',
    'clientColors.js':    'src/core',
    'themeConfig.js':     'src/core',
    // ui/
    'uiComponents.js':    'src/ui',
    'templates.js':       'src/ui',
    // timer/
    'timerInit.js':       'src/timer',
    'timerCard.js':       'src/timer',
    'timerCrud.js':       'src/timer',
    'timerHelpers.js':    'src/timer',
    'timerWidgets.js':    'src/timer',
    // saved-timers/
    'savedTimersUI.js':       'src/saved-timers',
    'savedTimersData.js':     'src/saved-timers',
    'savedTimersEvents.js':   'src/saved-timers',
    // report/
    'reportConfig.js':    'src/report',
    'reportEvents.js':    'src/report',
    'reportHistory.js':   'src/report',
    // recycle-bin/
    'recycleBinTimers.js':  'src/recycle-bin',
    'recycleBinReports.js': 'src/recycle-bin',
    // dashboard/
    'dashboard.js':       'src/dashboard',
    // data/
    'dataManagement.js':  'src/data',
    // pages/
    'main.js':            'src/pages',
    'menu.js':            'src/pages',
};

// ══════════════════════════════════════════════
// STEP 1: Crea le cartelle
// ══════════════════════════════════════════════
const folders = [...new Set(Object.values(FILE_MAP))];
console.log('\n📁 Creazione cartelle...');
for (const folder of folders) {
    const fullPath = path.join(ROOT, folder);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`   ✅ ${folder}/`);
    } else {
        console.log(`   ⏭️  ${folder}/ (esiste già)`);
    }
}

// ══════════════════════════════════════════════
// STEP 2: git mv di tutti i file
// ══════════════════════════════════════════════
console.log('\n📦 Spostamento file con git mv...');
for (const [file, destFolder] of Object.entries(FILE_MAP)) {
    const src = file;
    const dest = `${destFolder}/${file}`;
    try {
        execSync(`git mv "${src}" "${dest}"`, { cwd: ROOT, stdio: 'pipe' });
        console.log(`   ✅ ${src} → ${dest}`);
    } catch (e) {
        console.error(`   ❌ Errore spostando ${src}: ${e.message}`);
    }
}

// ══════════════════════════════════════════════
// STEP 3: Aggiorna gli import in ogni file spostato
// ══════════════════════════════════════════════
console.log('\n🔗 Aggiornamento import...');

/**
 * Dato un file sorgente e un file importato (entrambi nomi base),
 * calcola il nuovo percorso relativo dall'uno all'altro.
 */
function getNewRelativePath(fromFile, toFile) {
    const fromDir = FILE_MAP[fromFile];
    const toDir = FILE_MAP[toFile];
    
    if (!fromDir || !toDir) return null; // file non migrato
    
    if (fromDir === toDir) {
        // Stessa cartella
        return `./${toFile}`;
    }
    
    // Calcola percorso relativo tra le due cartelle
    const rel = path.relative(fromDir, toDir).replace(/\\/g, '/');
    return `${rel}/${toFile}`;
}

let totalImportsUpdated = 0;

for (const [file, destFolder] of Object.entries(FILE_MAP)) {
    const filePath = path.join(ROOT, destFolder, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    
    // Regex per catturare import da './' (file locali nella root originale)
    // Copre: import { x } from './file.js'  e  import './file.js'  e  import * as x from './file.js'
    const importRegex = /from\s+['"]\.\/([^'"]+)['"]/g;
    const sideEffectRegex = /import\s+['"]\.\/([^'"]+)['"]/g;
    
    // Prima passa: import con from
    content = content.replace(importRegex, (match, importedFile) => {
        const newPath = getNewRelativePath(file, importedFile);
        if (newPath) {
            changed = true;
            totalImportsUpdated++;
            return `from '${newPath}'`;
        }
        return match; // non migrato, lascia invariato
    });
    
    // Seconda passa: import side-effect (import './file.js')
    content = content.replace(/import\s+['"]\.\/([^'"]+)['"]/g, (match, importedFile) => {
        if (match.includes('from')) return match; // già gestito sopra
        const newPath = getNewRelativePath(file, importedFile);
        if (newPath) {
            changed = true;
            totalImportsUpdated++;
            return `import '${newPath}'`;
        }
        return match;
    });
    
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`   ✅ ${destFolder}/${file}`);
    }
}

// ══════════════════════════════════════════════
// STEP 4: Aggiorna src/app.js (entry point)
// ══════════════════════════════════════════════
console.log('\n🎯 Aggiornamento src/app.js...');
const appJsPath = path.join(ROOT, 'src', 'app.js');
let appContent = fs.readFileSync(appJsPath, 'utf-8');

// Sostituisci tutti gli import '../file.js' con i nuovi percorsi
for (const [file, destFolder] of Object.entries(FILE_MAP)) {
    // In app.js gli import erano '../file.js' (da src/ alla root)
    // Ora diventano './subfolder/file.js' (da src/ a src/subfolder/)
    const oldImport = `'../${file}'`;
    const subFolder = destFolder.replace('src/', '');
    const newImport = `'./${subFolder}/${file}'`;
    
    if (appContent.includes(oldImport)) {
        appContent = appContent.replace(oldImport, newImport);
    }
}

fs.writeFileSync(appJsPath, appContent, 'utf-8');
console.log('   ✅ src/app.js aggiornato');

// ══════════════════════════════════════════════
// RISULTATO
// ══════════════════════════════════════════════
console.log(`\n✨ Migrazione completata!`);
console.log(`   📦 ${Object.keys(FILE_MAP).length} file spostati`);
console.log(`   🔗 ${totalImportsUpdated} import aggiornati`);
console.log(`   📁 ${folders.length} cartelle create`);
console.log(`\n🔨 Ora esegui: npx vite build`);
