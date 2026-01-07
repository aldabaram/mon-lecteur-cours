const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// 🔥 IMPORTANT POUR RAILWAY
const PORT = process.env.PORT || 3000;

// 📁 dossier des cours (ATTENTION À LA CASSE)
const COURS_DIR = path.join(__dirname, "cours");

app.use(express.json());
app.use(express.static("public"));

console.log("📂 Dossier cours utilisé :", COURS_DIR);

/**
 * Vérification que le dossier existe
 */
if (!fs.existsSync(COURS_DIR)) {
    console.error("❌ Le dossier 'cours' est introuvable !");
}

/**
 * Construit l'arborescence
 */
function buildTree(dirPath) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    return entries.map(entry => {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(COURS_DIR, fullPath);

        if (entry.isDirectory()) {
            return {
                name: entry.name,
                type: "folder",
                path: relativePath,
                children: buildTree(fullPath)
            };
        } else {
            return {
                name: entry.name,
                type: "file",
                path: relativePath
            };
        }
    });
}

/**
 * 🌳 API tree
 */
app.get("/api/tree", (req, res) => {
    try {
        const tree = buildTree(COURS_DIR);
        res.json(tree);
    } catch (err) {
        console.error("❌ Erreur tree:", err);
        res.status(500).json({ error: "Erreur lors du chargement de l'arborescence" });
    }
});

/**
 * 📄 API file
 */
app.get("/api/file", (req, res) => {
    const filePath = req.query.path;

    if (!filePath) {
        return res.status(400).json({ error: "Chemin manquant" });
    }

    const fullPath = path.join(COURS_DIR, filePath);

    // 🔐 sécurité
    if (!fullPath.startsWith(COURS_DIR)) {
        return res.status(403).json({ error: "Accès interdit" });
    }

    fs.readFile(fullPath, "utf8", (err, data) => {
        if (err) {
            console.error("❌ Erreur lecture fichier:", err);
            return res.status(500).json({ error: "Impossible de lire le fichier" });
        }
        res.json({ content: data });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur le port ${PORT}`);
});
