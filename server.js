const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

// Configuration du port pour Render
const PORT = process.env.PORT || 3000;

// Utilisation de path.resolve pour garantir un chemin absolu propre
const COURS_DIR = path.resolve(__dirname, "cours");

app.use(express.json());
app.use(express.static("public"));

// --- DÉBOGAGE AU DÉMARRAGE ---
console.log("🚀 Démarrage du serveur...");
console.log("📂 Chemin absolu attendu pour 'cours' :", COURS_DIR);

// On vérifie ce qui existe réellement sur le serveur Render
if (fs.existsSync(COURS_DIR)) {
    console.log("✅ Le dossier 'cours' a été trouvé.");
    console.log("📄 Contenu immédiat :", fs.readdirSync(COURS_DIR));
} else {
    console.error("❌ ERREUR : Le dossier 'cours' est introuvable à la racine !");
    console.log("🔍 Contenu de la racine (__) :", fs.readdirSync(__dirname));
}
// -----------------------------

/**
 * Route de santé pour Render (Health Check)
 */
app.get("/health", (req, res) => {
    res.status(200).send("Serveur opérationnel");
});

/**
 * API : Construit l'arborescence
 */
function buildTree(dirPath) {
    if (!fs.existsSync(dirPath)) return [];
    
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
 * API : Lecture d'un fichier avec sécurité
 */
app.get("/api/file", (req, res) => {
    const requestedPath = req.query.path;

    if (!requestedPath) {
        return res.status(400).json({ error: "Chemin manquant" });
    }

    // Sécurité : on empêche de sortir du dossier cours avec ../
    const safePath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(COURS_DIR, safePath);

    if (!fullPath.startsWith(COURS_DIR)) {
        return res.status(403).json({ error: "Accès interdit" });
    }

    fs.readFile(fullPath, "utf8", (err, data) => {
        if (err) {
            console.error(`❌ Erreur lecture fichier (${fullPath}):`, err);
            return res.status(404).json({ error: "Fichier introuvable" });
        }
        res.json({ content: data });
    });
});

// Écoute sur 0.0.0.0 est crucial pour Render
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Serveur lancé sur http://0.0.0.0:${PORT}`);
});