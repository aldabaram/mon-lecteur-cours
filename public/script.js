const API_URL = 'http://localhost:3000';
let coursesData = {};
let allFiles = [];
let currentPath = [];
let currentFolder = {};

async function loadCoursesTree() {
    try {
        const response = await fetch(`${API_URL}/api/tree`);
        if (!response.ok) throw new Error('Erreur lors du chargement');
        coursesData = await response.json();
        currentFolder = coursesData;
        initializeFilesList();
        renderCurrentFolder();
    } catch (error) {
        document.getElementById('folderTree').innerHTML = `<div class="error">Erreur de connexion</div>`;
        console.error(error);
    }
}

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
    Object.keys(coursesData).forEach(rootFolder => {
        collectFiles(coursesData[rootFolder], [rootFolder]);
    });
}

document.getElementById('searchInput').addEventListener('input', e => {
    const searchTerm = e.target.value.toLowerCase();
    if (!searchTerm) return renderCurrentFolder();
    const filtered = allFiles.filter(f => f.name.toLowerCase().includes(searchTerm));
    renderSearchResults(filtered);
});

function renderSearchResults(files) {
    const container = document.getElementById('folderTree');
    container.innerHTML = '';
    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';
    if (files.length === 0) folderContent.innerHTML = `<div class="empty-folder"><p>Aucun fichier trouvé</p></div>`;
    else files.forEach(f => {
        const fileBox = document.createElement('div');
        fileBox.className = 'item-box';
        fileBox.innerHTML = `<div class="item-icon">📄</div><div class="item-name">${f.name}</div>`;
        fileBox.onclick = () => loadFile(f.filePath);
        folderContent.appendChild(fileBox);
    });
    container.appendChild(folderContent);
}

function renderCurrentFolder() { /* ton code précédent pour afficher les dossiers */ }
function navigateToFolder(folderName) { /* idem */ }
function goToRoot() { /* idem */ }
function goToPath(index) { /* idem */ }

async function loadFile(filePath) {
    try {
        const res = await fetch(`${API_URL}/api/file/${filePath}`);
        const content = await res.text();
        document.querySelector('.content').innerHTML = content;
    } catch (err) {
        document.querySelector('.content').innerHTML = `<p>Erreur de chargement</p>`;
    }
}

loadCoursesTree();
