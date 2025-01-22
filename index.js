document.addEventListener('DOMContentLoaded', () => {
    const clipForm = document.getElementById('clipForm');
    const clipsContainer = document.getElementById('clipsContainer');

    loadClips();

    clipForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = clipForm.clipText.value.trim();
        if (!text) return;

        const newClip = {
            id: Date.now(),
            text: text,
            date: new Date().toISOString()
        };

        saveClip(newClip);
        clipForm.reset();
    });

    clipsContainer.addEventListener('click', (e) => {
        const clipElement = e.target.closest('.clip-item');
        if (!clipElement) return;

        const clipId = clipElement.dataset.id;
        
        if (e.target.classList.contains('copy-btn')) {
            handleCopy(clipId, e.target);
        } else if (e.target.classList.contains('delete-btn')) {
            handleDelete(clipId, clipElement);
        }
    });

    document.getElementById('searchInput').addEventListener('input', renderClips);
    renderClips();
});

function renderClips() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const clips = JSON.parse(localStorage.getItem('clips') || '[]');
    const filteredClips = clips.filter(clip => 
        clip.text.toLowerCase().includes(searchTerm)
    );

    clipsContainer.innerHTML = '';
    filteredClips.forEach(clip => {
        const clipElement = createClipElement(clip);
        clipsContainer.appendChild(clipElement);
    });
}

function createClipElement(clip) {
    const clipElement = document.createElement('div');
    clipElement.className = 'clip-item';
    clipElement.dataset.id = clip.id;

    const date = new Date(clip.date).toLocaleString();
    const contentPreview = clip.text.length > 100 
        ? clip.text.substring(0, 100) + '...' 
        : clip.text;

    clipElement.innerHTML = `
        <div class="meta">
            <span class="date">${escapeHTML(date)}</span>
            <div class="actions">
                <button class="copy-btn">📋</button>
                <button class="delete-btn">🗑️</button>
            </div>
        </div>
        <p class="content" title="${escapeHTML(clip.text)}">
            ${escapeHTML(contentPreview)}
        </p>
    `;

    return clipElement;
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function saveClip(clip) {
    const clips = JSON.parse(localStorage.getItem('clips') || '[]');
    clips.unshift(clip);
    localStorage.setItem('clips', JSON.stringify(clips));
    renderClips();
}

function loadClips() {
    const clips = JSON.parse(localStorage.getItem('clips') || '[]');
    clips.forEach(clip => addClipToDOM(clip));
}

function addClipToDOM(clip) {
    const clipElement = document.createElement('div');
    clipElement.className = 'clip-item';
    clipElement.dataset.id = clip.id;

    const date = new Date(clip.date).toLocaleString();
    const contentPreview = clip.text.length > 100 
        ? clip.text.substring(0, 100) + '...' 
        : clip.text;

    clipElement.innerHTML = `
        <div class="meta">
            <span class="date">${escapeHTML(date)}</span>
            <div class="actions">
                <button class="copy-btn">📋</button>
                <button class="delete-btn">🗑️</button>
            </div>
        </div>
        <p class="content" title="${escapeHTML(clip.text)}">
            ${escapeHTML(contentPreview)}
        </p>
    `;

    clipsContainer.prepend(clipElement);
}

async function handleCopy(clipId, button) {
    try {
        const clips = JSON.parse(localStorage.getItem('clips') || '[]');
        const clip = clips.find(c => c.id == clipId);
        
        await navigator.clipboard.writeText(clip.text);
        button.textContent = '✅';
        setTimeout(() => button.textContent = '📋', 2000);
    } catch (err) {
        showToast('コピーに失敗しました');
    }
}

function handleDelete(clipId, element) {
    if (!confirm('本当に削除しますか？')) return;
    
    element.classList.add('fade-out');
    setTimeout(() => {
        element.remove();
        const clips = JSON.parse(localStorage.getItem('clips') || '[]');
        const filtered = clips.filter(c => c.id != clipId);
        localStorage.setItem('clips', JSON.stringify(filtered));
        renderClips();
    }, 300);
}

function deleteAllClips() {
    if (!confirm('全てのクリップを削除しますか？この操作は元に戻せません')) return;
    
    localStorage.removeItem('clips');
    renderClips();
    showToast('全てのクリップを削除しました');
    
    document.querySelectorAll('.clip-item').forEach(item => {
        item.classList.add('fade-out');
        setTimeout(() => item.remove(), 300);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


function exportData() {
    try {
        const clips = localStorage.getItem('clips') || '[]';
        const blob = new Blob([clips], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // 日時フォーマットを修正
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0'); // ゼロパディングヘルパー
        const dateString = [
            now.getFullYear(),
            pad(now.getMonth() + 1), // 月は0から始まるため+1
            pad(now.getDate()),
            pad(now.getHours()),
            pad(now.getMinutes())
        ].join('-');
        
        a.download = `clipstack-export-${dateString}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('エクスポートが完了しました');
    } catch (error) {
        showToast('エクスポートに失敗しました');
        console.error('Export error:', error);
    }
}

document.getElementById('importFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            if (!Array.isArray(importedData)) throw new Error('Invalid format');

            const isValid = importedData.every(item => 
                item.id && item.text && item.date
            );
            
            if (!isValid) throw new Error('Invalid data structure');

            const confirmMerge = confirm(
                `現在のデータ（${JSON.parse(localStorage.getItem('clips') || '[]').length}件）に\n` +
                `新規データ（${importedData.length}件）をマージしますか？\n\n` +
                '「キャンセル」を選択すると上書きされます'
            );

            const currentData = JSON.parse(localStorage.getItem('clips') || '[]');
            const mergedData = confirmMerge 
                ? [...importedData, ...currentData] 
                : [...importedData];

            const uniqueData = mergedData.filter(
                (v, i, a) => a.findIndex(t => t.id === v.id) === i
            );

            localStorage.setItem('clips', JSON.stringify(uniqueData));
            renderClips();
            showToast(`インポート成功: ${importedData.length}件のデータ`);
        } catch (error) {
            showToast('インポートに失敗: ファイル形式が不正です');
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
});