const API_URL = ''; // relatif pour Runawail

let coursesData = {};
let allFiles = [];
let currentPath = [];
let currentFolder = {};
let currentFilePath = null;

// --- Chargement des cours ---
async function loadCoursesTree() {
    console.log('📥 Chargement de l’arborescence...');
    try {
        const response = await fetch(`${API_URL}/api/tree`);
        console.log('Réponse /api/tree:', response.status);
        if (!response.ok) throw new Error('Erreur lors du chargement');

        coursesData = await response.json();
        currentFolder = coursesData;

        initializeFilesList();
        renderCurrentFolder();

        console.log('✅ Arborescence chargée avec succès');
    } catch (error) {
        document.getElementById('folderTree').innerHTML = `
            <div class="error">
                <div class="empty-folder-icon">❌</div>
                <p>Erreur de connexion au serveur</p>
            </div>
        `;
        console.error('Erreur loadCoursesTree:', error);
    }
}

// --- Création liste fichiers ---
function initializeFilesList() {
    console.log('📂 Initialisation de la liste globale des fichiers...');
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

    Object.keys(coursesData.__folders || {}).forEach(rootFolder => {
        collectFiles(coursesData.__folders[rootFolder], [rootFolder]);
    });
    console.log('📌 Tous les fichiers collectés:', allFiles.length);
}

// --- Recherche ---
document.getElementById('searchInput').addEventListener('input', handleSearch);

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    if (searchTerm === '') {
        renderCurrentFolder();
        return;
    }

    const filteredFiles = allFiles.filter(fileInfo =>
        fileInfo.name.toLowerCase().includes(searchTerm) ||
        fileInfo.path.toLowerCase().includes(searchTerm)
    );

    renderSearchResults(filteredFiles, searchTerm);
}

// --- Affichage résultats recherche ---
function renderSearchResults(files, searchTerm) {
    const container = document.getElementById('folderTree');
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.style.display = 'none';
    container.innerHTML = '';

    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';

    const matchingFolders = [];
    function searchFolders(folderObj, path = []) {
        if (!folderObj.__folders) return;
        Object.keys(folderObj.__folders).forEach(folderName => {
            const child = folderObj.__folders[folderName];
            const fullPath = [...path, folderName].join(' / ');

            if (folderName.toLowerCase().includes(searchTerm) || fullPath.toLowerCase().includes(searchTerm)) {
                matchingFolders.push({ name: folderName, folderObj: child, path: [...path] });
            }
        });
    }
    searchFolders(coursesData);

    matchingFolders.forEach(f => {
        const folderBox = document.createElement('div');
        folderBox.className = 'item-box folder-box';
        folderBox.tabIndex = 0;
        folderBox.innerHTML = `<div class="item-icon">📁</div><div class="item-name">${f.name.replace(/_/g,' ')}</div>`;
        folderBox.onclick = () => {
            currentPath = [...f.path, f.name];
            currentFolder = f.folderObj;
            renderCurrentFolder();
        };
        folderBox.onkeydown = e => { if(e.key==='Enter') folderBox.onclick(); };
        folderContent.appendChild(folderBox);
    });

    files.forEach(f => {
        const parentFolderPath = f.folderPath.join(' / ');
        const isInsideDisplayedFolder = matchingFolders.some(d => {
            const fullPath = [...d.path, d.name].join(' / ');
            return parentFolderPath.startsWith(fullPath);
        });
        if (isInsideDisplayedFolder) return;

        const displayName = f.name.replace(/_/g,' ').replace(/\.html$/i,'');
        const fileBox = document.createElement('div');
        fileBox.className = 'item-box';
        fileBox.tabIndex = 0;
        fileBox.innerHTML = `<div class="item-icon">📄</div><div class="item-name">${displayName}</div>`;
        if(f.filePath === currentFilePath) fileBox.classList.add('active');
        fileBox.onclick = () => openFile(f.filePath, fileBox);
        fileBox.onkeydown = e => { if(e.key==='Enter') openFile(f.filePath, fileBox); };
        folderContent.appendChild(fileBox);
    });

    if (matchingFolders.length === 0 && files.length === 0) {
        folderContent.innerHTML = `
            <div class="empty-folder">
                <div class="empty-folder-icon">🔍</div>
                <p>Aucun fichier ou dossier trouvé</p>
            </div>
        `;
    }

    container.appendChild(folderContent);
}

// --- Affichage dossier courant ---
function renderCurrentFolder() {
    const container = document.getElementById('folderTree');
    const breadcrumb = document.getElementById('breadcrumb');
    container.innerHTML = '';

    if (currentPath.length > 0) {
        breadcrumb.style.display = 'block';
        breadcrumb.innerHTML = '🏠 <span onclick="goToRoot()">Accueil</span>' +
            currentPath.map((folder, index) =>
                ` / <span onclick="goToPath(${index})">${folder.replace(/_/g,' ')}</span>`
            ).join('');
    } else breadcrumb.style.display = 'none';

    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';

    let hasContent = false;

    if (currentFolder.__folders && Object.keys(currentFolder.__folders).length > 0) {
        hasContent = true;
        Object.keys(currentFolder.__folders).forEach(subFolderName => {
            const folderBox = document.createElement('div');
            folderBox.className = 'item-box folder-box';
            folderBox.innerHTML = `<div class="item-icon">📁</div><div class="item-name">${subFolderName.replace(/_/g,' ')}</div>`;
            folderBox.onclick = () => navigateToFolder(subFolderName);
            folderContent.appendChild(folderBox);
        });
    }

    if (currentFolder.__files && currentFolder.__files.length > 0) {
        hasContent = true;
        currentFolder.__files.forEach(fileInfo => {
            const displayName = fileInfo.name.replace(/_/g,' ').replace(/\.html$/i,'');
            const fileBox = document.createElement('div');
            fileBox.className = 'item-box';
            fileBox.innerHTML = `<div class="item-icon">📄</div><div class="item-name">${displayName}</div>`;
            fileBox.onclick = () => openFile(fileInfo.path, fileBox);
            folderContent.appendChild(fileBox);
        });
    }

    if (!hasContent) folderContent.innerHTML = `<div class="empty-folder"><div class="empty-folder-icon">📂</div><p>Pas encore de cours</p></div>`;

    container.appendChild(folderContent);
}

// --- Navigation ---
function navigateToFolder(folderName) {
    currentPath.push(folderName);
    currentFolder = currentFolder.__folders[folderName];
    renderCurrentFolder();
}

function goToRoot() {
    currentPath = [];
    currentFolder = coursesData;
    renderCurrentFolder();
}

function goToPath(index) {
    currentPath = currentPath.slice(0,index+1);
    currentFolder = coursesData;
    for(let i=0;i<currentPath.length;i++) currentFolder = currentFolder.__folders[currentPath[i]];
    renderCurrentFolder();
}

// --- Ouverture d’un fichier (bloque .md) ---
async function openFile(filePath, fileBox) {
    if(filePath.endsWith('.md')) {
        const contentDiv = document.querySelector('.content');
        contentDiv.innerHTML = `
            <div class="content-empty">
                <div class="content-empty-icon">❌</div>
                <h3>Lecture interdite</h3>
                <p>Les fichiers Markdown (.md) ne peuvent pas être ouverts.</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/file/${encodeURIComponent(filePath)}`);
        if(!response.ok) throw new Error('Fichier non trouvé ou interdit');
        const content = await response.text();
        currentFilePath = filePath;

        const contentDiv = document.querySelector('.content');
        contentDiv.innerHTML = content;

        document.querySelectorAll('.item-box').forEach(item => item.classList.remove('active'));
        if(fileBox) fileBox.classList.add('active');
    } catch(error) {
        const contentDiv = document.querySelector('.content');
        contentDiv.innerHTML = `
            <div class="content-empty">
                <div class="content-empty-icon">❌</div>
                <h3>Erreur de chargement</h3>
                <p>Impossible de charger le fichier</p>
            </div>
        `;
        console.error('Erreur openFile:', error);
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('open');
}


// --- Initialisation ---
loadCoursesTree();
