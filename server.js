const express = require('express');
const fs = require('fs');
const path = require('path');
const marked = require('marked');

const app = express();
const PORT = process.env.PORT || 3000;

const coursesDir = path.join(__dirname, 'cours');

// Middleware pour servir le front-end
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint pour lister les fichiers et dossiers
app.get('/api/tree', (req, res) => {
    function readDir(dirPath) {
        const result = { __folders: {}, __files: [] };
        const items = fs.readdirSync(dirPath, { withFileTypes: true });

        items.forEach(item => {
            if (item.isDirectory()) {
                result.__folders[item.name] = readDir(path.join(dirPath, item.name));
            } else if (item.isFile()) {
                result.__files.push({
                    name: item.name,
                    path: path.relative(coursesDir, path.join(dirPath, item.name))
                });
            }
        });
        return result;
    }

    const tree = readDir(coursesDir);
    res.json(tree);
});

// Endpoint pour récupérer le contenu d'un fichier
app.get('/api/file/*', (req, res) => {
    const filePath = path.join(coursesDir, req.params[0]);
    if (!fs.existsSync(filePath)) return res.status(404).send('Fichier non trouvé');

    const content = fs.readFileSync(filePath, 'utf-8');
    // Convertir Markdown en HTML
    const html = marked.parse(content);
    res.send(html);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
