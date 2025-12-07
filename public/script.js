const API_URL = ''; // Relatif pour Runawail

let coursesData = {};
let allFiles = [];
let currentPath = [];
let currentFolder = {};
let currentFilePath = null;

// --- Chargement des cours ---
async function loadCoursesTree() {
    try {
        const response = await fetch(`${API_URL}/api/tree`);
        if (!response.ok) throw new Error('Erreur lors du chargement');

        coursesData = await response.json();
        currentFolder = coursesData;

        initializeFilesList();
        renderCurrentFolder();
    } catch (error) {
        document.getElementById('folderTree').innerHTML = `
            <div class="error">
                <div class="empty-folder-icon">❌</div>
                <p>Erreur de connexion au serveur</p>
            </div>
        `;
        console.error(error);
    }
}

// --- Liste globale fichiers ---
function initializeFilesList() {
    allFiles = [];
    function collectFiles(folderObj, path = []) {
        if (folderObj.__files) {
            folderObj.__files.forEach(file => {
                allFiles.push({
                    name: file.name,
                    path: [...path, file.name].join(' / '),
                    filePath: file.path,
                    folderPath: path
                });
            });
        }
        if (folderObj.__folders) {
            Object.keys(folderObj.__folders).forEach(folderName => {
                collectFiles(folderObj.__folders[folderName], [...path, folderName]);
            });
        }
    }
    Object.keys(coursesData.__folders || {}).forEach(root =>
        collectFiles(coursesData.__folders[root], [root])
    );
}

// --- Recherche ---
document.getElementById('searchInput').addEventListener('input', handleSearch);

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    if (searchTerm === '') return renderCurrentFolder();

    const filtered = allFiles.filter(f =>
        f.name.toLowerCase().includes(searchTerm) ||
        f.path.toLowerCase().includes(searchTerm)
    );

    renderSearchResults(filtered, searchTerm);
}

// --- Résultats recherche ---
function renderSearchResults(files, searchTerm) {
    const container = document.getElementById('folderTree');
    container.innerHTML = '';
    document.getElementById('breadcrumb').style.display = 'none';

    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';

    files.forEach(f => {
        const displayName = f.name.replace(/_/g, ' ').replace(/\.html$/, '');
        const box = document.createElement('div');
        box.className = 'item-box';
        box.innerHTML = `<div class="item-icon">📄</div><div class="item-name">${displayName}</div>`;
        box.onclick = () => openFile(f.filePath, box);
        folderContent.appendChild(box);
    });

    if (files.length === 0) {
        folderContent.innerHTML = `
            <div class="empty-folder">
                <div class="empty-folder-icon">🔍</div>
                <p>Aucun fichier trouvé</p>
            </div>`;
    }

    container.appendChild(folderContent);
}

// --- Affiche le dossier courant ---
function renderCurrentFolder() {
    const container = document.getElementById('folderTree');
    const breadcrumb = document.getElementById('breadcrumb');
    container.innerHTML = '';

    if (currentPath.length > 0) {
        breadcrumb.style.display = 'block';
        breadcrumb.innerHTML =
            '🏠 <span onclick="goToRoot()">Accueil</span>' +
            currentPath.map((p, i) =>
                ` / <span onclick="goToPath(${i})">${p.replace(/_/g, ' ')}</span>`
            ).join('');
    } else breadcrumb.style.display = 'none';

    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';

    let hasContent = false;

    // Dossiers
    if (currentFolder.__folders) {
        Object.keys(currentFolder.__folders).forEach(sub => {
            hasContent = true;
            const box = document.createElement('div');
            box.className = 'item-box folder-box';
            box.innerHTML = `<div class="item-icon">📁</div><div class="item-name">${sub.replace(/_/g, ' ')}</div>`;
            box.onclick = () => navigateToFolder(sub);
            folderContent.appendChild(box);
        });
    }

    // Fichiers
    if (currentFolder.__files) {
        currentFolder.__files.forEach(f => {
            hasContent = true;
            const name = f.name.replace(/_/g, ' ').replace(/\.html$/, '');
            const box = document.createElement('div');
            box.className = 'item-box';
            box.innerHTML = `<div class="item-icon">📄</div><div class="item-name">${name}</div>`;
            box.onclick = () => openFile(f.path, box);
            folderContent.appendChild(box);
        });
    }

    if (!hasContent) {
        folderContent.innerHTML = `
            <div class="empty-folder">
                <div class="empty-folder-icon">📂</div>
                <p>Pas encore de cours disponibles</p>
            </div>`;
    }

    container.appendChild(folderContent);
}

// --- Navigation ---
function navigateToFolder(name) {
    currentPath.push(name);
    currentFolder = currentFolder.__folders[name];
    renderCurrentFolder();
}

function goToRoot() {
    currentPath = [];
    currentFolder = coursesData;
    renderCurrentFolder();
}

function goToPath(index) {
    currentPath = currentPath.slice(0, index + 1);
    currentFolder = coursesData;
    currentPath.forEach(p => currentFolder = currentFolder.__folders[p]);
    renderCurrentFolder();
}

// --- Ouverture fichier ---
async function openFile(filePath, box) {
    if (filePath.endsWith('.md')) {
        document.querySelector('.content').innerHTML = `
            <div class="content-empty">
                <div class="content-empty-icon">❌</div>
                <h3>Lecture interdite</h3>
                <p>Les fichiers .md ne peuvent pas être ouverts.</p>
            </div>`;
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/file/${encodeURIComponent(filePath)}`);
        if (!res.ok) throw new Error();

        const content = await res.text();
        currentFilePath = filePath;

        const div = document.querySelector('.content');
        div.innerHTML = content;

        document.querySelectorAll('.item-box').forEach(i => i.classList.remove('active'));
        if (box) box.classList.add('active');
    } catch {
        document.querySelector('.content').innerHTML = `
            <div class="content-empty">
                <div class="content-empty-icon">❌</div>
                <h3>Erreur de chargement</h3>
                <p>Impossible de charger ce fichier…</p>
            </div>`;
    }
}

/* --- Bouton Mobile --- */
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}

// Lancer l'app
loadCoursesTree();
