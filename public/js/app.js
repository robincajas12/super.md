let currentFilePath = null;
let currentFileName = null;

async function loadFileList() {
    const res = await fetch('/api/files');
    const data = await res.json();
    
    const renderList = (files, elementId) => {
        const list = document.getElementById(elementId);
        list.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.name;
            li.onclick = () => openFile(file.path, file.name);
            list.appendChild(li);
        });
    };

    renderList(data.sourceFiles, 'source-list');
    renderList(data.scriptFiles, 'script-list');
}

async function openFile(path, name) {
    currentFilePath = path;
    currentFileName = name;
    document.getElementById('current-filename').textContent = name;
    
    const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    document.getElementById('editor').value = data.content;
    
    // Si es un archivo de texto/md, intentar ver la previa procesada
    if (name.endsWith('.txt') || name.endsWith('.md')) {
        updatePreview(name);
    } else {
        document.getElementById('preview-content').textContent = "Solo disponible para archivos de texto/md en el punto de montaje.";
    }
}

async function saveFile() {
    if (!currentFilePath) return;
    const content = document.getElementById('editor').value;
    
    const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: currentFilePath, content })
    });
    
    if (res.ok) {
        console.log("Guardado correctamente");
        if (currentFileName.endsWith('.txt') || currentFileName.endsWith('.md')) {
            // Pequeño delay para dejar que FUSE procese el cambio
            setTimeout(() => updatePreview(currentFileName), 200);
        }
    }
}

async function updatePreview(name) {
    const res = await fetch(`/api/view?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    document.getElementById('preview-content').textContent = data.content;
}

// Eventos
document.getElementById('save-btn').onclick = saveFile;

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
});

// Inicio
loadFileList();
