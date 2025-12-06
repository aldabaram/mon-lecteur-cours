const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS pour le frontend
app.use(cors());

// Dossier statique pour ton frontend
app.use(express.static('public'));

// 📂 Dossier des cours (corrigé pour ton projet)
const COURSES_DIR = path.join(__dirname, 'cours');

// --- Fonction pour générer l’arborescence ---
function getFolderTree(dirPath) {
    const folderObj = { __folders: {}, __files: [] };
    console.log(`📥 Lecture du dossier : ${dirPath}`);

    let items;
    try {
        items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (err) {
        console.error(`❌ Erreur lecture dossier ${dirPath}:`, err);
        throw err;
    }

    for (let item of items) {
        const itemFullPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
            try {
                folderObj.__folders[item.name] = getFolderTree(itemFullPath);
            } catch (err) {
                console.error(`❌ Erreur dans dossier ${item.name}:`, err);
            }
        } else if (item.isFile()) {
            folderObj.__files.push({
                name: item.name,
                path: path.relative(COURSES_DIR, itemFullPath)
            });
        }
    }
    return folderObj;
}

// --- Route arborescence ---
app.get('/api/tree', (req, res) => {
    console.log('📌 Appel API /api/tree');
    try {
        if (!fs.existsSync(COURSES_DIR)) {
            console.error(`❌ Dossier des cours non trouvé : ${COURSES_DIR}`);
            return res.status(500).json({ error: 'Dossier des cours non trouvé' });
        }

        console.log(`📂 Dossier trouvé : ${COURSES_DIR}`);
        const tree = getFolderTree(COURSES_DIR);
        console.log('✅ Arborescence générée avec succès');
        res.json(tree);
    } catch (e) {
        console.error('💥 Erreur serveur /api/tree :', e);
        res.status(500).json({ error: 'Impossible de lire les fichiers' });
    }
});

// --- Route fichier (corrigée pour tous les chemins) ---
app.get('/api/file/*', (req, res) => {
    try {
        const requestedPath = req.params[0]; // prend tout après /api/file/
        const filePath = path.join(COURSES_DIR, requestedPath);
        console.log(`📌 Appel API /api/file/${requestedPath}`);

        if (!fs.existsSync(filePath)) {
            console.error(`❌ Fichier non trouvé: ${filePath}`);
            return res.status(404).send('Fichier non trouvé');
        }

        res.sendFile(filePath);
        console.log(`✅ Fichier envoyé: ${filePath}`);
    } catch (e) {
        console.error(`💥 Erreur serveur /api/file:`, e);
        res.status(500).send('Erreur serveur');
    }
});

// --- Lancement serveur ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
