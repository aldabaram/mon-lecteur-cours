const API_URL = 'https://mon-lecteur-cours-production.up.railway.app';
let coursesData = {};
let allFiles = [];
let currentPath = [];
let currentFolder = {};
let currentFilePath = null;

// Chargement de l'arborescence
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
            <div class="empty-folder">
                <div class="empty-folder-icon">❌</div>
                <p>Erreur de connexion au serveur</p>
                <p style="font-size:14px;margin-top:10px;">Assure-toi que le serveur Node.js est lancé</p>
            </div>
        `;
        console.error(error);
    }
}

// Liste de tous les fichiers
function initializeFilesList() {
    allFiles = [];
    function collectFiles(folderObj, path=[]) {
        if(folderObj.__files) {
            folderObj.__files.forEach(file => {
                allFiles.push({
                    name: file.name,
                    path: [...path, file.name].join(' / '),
                    filePath: file.path,
                    folderPath: path
                });
            });
        }
        if(folderObj.__folders) {
            Object.keys(folderObj.__folders).forEach(f => collectFiles(folderObj.__folders[f],[...path,f]));
        }
    }
    Object.keys(coursesData).forEach(root => collectFiles(coursesData[root],[root]));
}

// Recherche
document.getElementById('searchInput').addEventListener('input', handleSearch);
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    if(searchTerm==='') { renderCurrentFolder(); return; }
    const filtered = allFiles.filter(f => f.name.toLowerCase().includes(searchTerm) || f.path.toLowerCase().includes(searchTerm));
    renderSearchResults(filtered);
}

// Affichage résultats recherche (fichiers + dossiers)
function renderSearchResults(files) {
    const container = document.getElementById('folderTree');
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.style.display = 'none';
    container.innerHTML = '';

    const fragment = document.createDocumentFragment();
    const folderContent = document.createElement('div');
    folderContent.className = 'folder-content';

    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

    // Dossiers correspondants
    const matchingFolders = [];
    function searchFolders(folderObj, path = []) {
        Object.keys(folderObj.__folders || {}).forEach(folderName => {
            const fullPath = [...path, folderName].join(' / ');
            if (folderName.toLowerCase().includes(searchTerm) || fullPath.toLowerCase().includes(searchTerm)) {
                matchingFolders.push({ name: folderName, folderObj: folderObj.__folders[folderName], path: [...path] });
            }
            searchFolders(folderObj.__folders[folderName], [...path, folderName]);
        });
    }
    searchFolders(coursesData);

    if (files.length === 0 && matchingFolders.length === 0) {
        folderContent.innerHTML = `
            <div class="empty-folder">
                <div class="empty-folder-icon">🔍</div>
                <p>Aucun fichier ou dossier trouvé</p>
            </div>
        `;
    } else {
        // Affichage des dossiers
        matchingFolders.forEach(f => {
            const folderBox = document.createElement('div');
            folderBox.className = 'item-box folder-box';
            folderBox.tabIndex = 0;
            folderBox.innerHTML = `<div class="item-icon">📁</div><div class="item-name">${f.name.replace(/_/g, ' ')}</div>`;
            folderBox.onclick = () => {
                currentPath = [...f.path, f.name];
                currentFolder = f.folderObj;
                renderCurrentFolder();
            };
            folderBox.onkeydown = e => { if (e.key === 'Enter') folderBox.onclick(); };
            folderContent.appendChild(folderBox);
        });

        // Affichage des fichiers
        files.forEach(f => {
            const displayName = f.name.replace(/_/g, ' ').replace(/\.html$/i, '');
            const fileBox = document.createElement('div');
            fileBox.className = 'item-box';
            fileBox.tabIndex = 0;
            fileBox.innerHTML = `<div class="item-icon">📄</div><div class="item-name">${displayName}</div>`;
            if (f.filePath === currentFilePath) fileBox.classList.add('active');
            fileBox.onclick = () => openFile(f.filePath, fileBox);
            fileBox.onkeydown = e => { if (e.key === 'Enter') openFile(f.filePath, fileBox); };
            folderContent.appendChild(fileBox);
        });
    }

    fragment.appendChild(folderContent);
    container.appendChild(fragment);
}

// Navigation dans les dossiers
function renderCurrentFolder() {
    const container = document.getElementById('folderTree');
    const breadcrumb = document.getElementById('breadcrumb');
    container.innerHTML='';
    if(currentPath.length>0){
        breadcrumb.style.display='block';
        breadcrumb.innerHTML = '🏠 <span onclick="goToRoot()">Accueil</span>' + currentPath.map((f,i)=>` / <span onclick="goToPath(${i})">${f.replace(/_/g,' ')}</span>`).join('');
    } else breadcrumb.style.display='none';
    
    const fragment = document.createDocumentFragment();
    const folderContent = document.createElement('div');
    folderContent.className='folder-content';
    let hasContent=false;

    if(currentFolder.__folders && Object.keys(currentFolder.__folders).length>0){
        hasContent=true;
        Object.keys(currentFolder.__folders).forEach(f=>{
            const box=document.createElement('div');
            box.className='item-box folder-box';
            box.tabIndex=0;
            box.innerHTML=`<div class="item-icon">📁</div><div class="item-name">${f.replace(/_/g,' ')}</div>`;
            box.onclick = ()=>navigateToFolder(f);
            box.onkeydown = e=>{if(e.key==='Enter') navigateToFolder(f);};
            folderContent.appendChild(box);
        });
    }

    if(currentFolder.__files && currentFolder.__files.length>0){
        hasContent=true;
        currentFolder.__files.forEach(f=>{
            const displayName = f.name.replace(/_/g,' ').replace(/\.html$/i,'');
            const box=document.createElement('div');
            box.className='item-box';
            box.tabIndex=0;
            box.innerHTML=`<div class="item-icon">📄</div><div class="item-name">${displayName}</div>`;
            if(f.path===currentFilePath) box.classList.add('active');
            box.onclick = ()=>openFile(f.path, box);
            box.onkeydown = e=>{if(e.key==='Enter') openFile(f.path, box);};
            folderContent.appendChild(box);
        });
    }

    if(!hasContent){
        folderContent.innerHTML=`<div class="empty-folder">
            <div class="empty-folder-icon">📂</div>
            <p>Pas encore de cours</p>
        </div>`;
    }

    fragment.appendChild(folderContent);
    container.appendChild(fragment);
}

// Navigation
function navigateToFolder(f){ currentPath.push(f); currentFolder=currentFolder.__folders[f]; renderCurrentFolder(); }
function goToRoot(){ currentPath=[]; currentFolder=coursesData; renderCurrentFolder(); }
function goToPath(i){ currentPath=currentPath.slice(0,i+1); currentFolder=coursesData; for(let j=0;j<currentPath.length;j++) currentFolder=currentFolder.__folders[currentPath[j]]; renderCurrentFolder(); }

// Chargement d’un fichier
async function openFile(path, boxElem){
    try{
        const response = await fetch(`${API_URL}/api/file/${encodeURIComponent(path)}`);
        if(!response.ok) throw new Error('Fichier non trouvé');
        const content = await response.text();
        document.querySelector('.content').innerHTML = content;
        currentFilePath = path;
        document.querySelectorAll('.item-box').forEach(item=>item.classList.remove('active'));
        if(boxElem) boxElem.classList.add('active');
    }catch(e){
        document.querySelector('.content').innerHTML=`<div class="content-empty">
            <div class="content-empty-icon">❌</div>
            <h3>Erreur de chargement</h3>
            <p>Impossible de charger le fichier</p>
        </div>`;
        console.error(e);
    }
}

loadCoursesTree();
