const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Dossier des cours (Assure-toi qu'il est bien nommé 'cours' sur GitHub)
const COURS_DIR = path.resolve(__dirname, "cours");

app.use(express.json());
app.use(express.static("public"));

/**
 * 🛠️ CONSTRUCTEUR D'ARBORESCENCE
 * Crée la structure __folders et __files attendue par ton script.js
 */
function buildCustomTree(dirPath) {
    const result = { __folders: {}, __files: [] };
    
    if (!fs.existsSync(dirPath)) return result;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(COURS_DIR, fullPath);

        if (entry.isDirectory()) {
            result.__folders[entry.name] = buildCustomTree(fullPath);
        } else {
            result.__files.push({
                name: entry.name,
                path: relativePath
            });
        }
    }
    return result;
}

// 🌳 API Tree
app.get("/api/tree", (req, res) => {
    try {
        const tree = buildCustomTree(COURS_DIR);
        res.json(tree);
    } catch (err) {
        console.error("Erreur tree:", err);
        res.status(500).json({ error: "Erreur arborescence" });
    }
});

// 📄 API File
app.get("/api/file", (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).send("Path manquant");

    const fullPath = path.join(COURS_DIR, filePath);
    
    // Sécurité
    if (!fullPath.startsWith(COURS_DIR)) return res.status(403).send("Interdit");

    fs.readFile(fullPath, "utf8", (err, data) => {
        if (err) return res.status(404).send("Fichier non trouvé");
        res.send(data); 
    });
});

// 📈 API Visit (Pour éviter l'erreur 404)
app.post("/api/visit", (req, res) => {
    res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Serveur prêt sur le port ${PORT}`);
});