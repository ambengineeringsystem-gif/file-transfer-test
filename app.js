// This client is the same as the one in public/, but placed at repo root for GitHub Pages upload
const $ = sel => document.querySelector(sel);
function sanitizeBackend(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  if (s.endsWith('/')) s = s.slice(0, -1);
  return s;
}
const paramBackend = new URLSearchParams(location.search).get('backend');
const BACKEND = sanitizeBackend(paramBackend || window.BACKEND || '');

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  const text = await res.text();
  try { return { ok: res.ok, data: JSON.parse(text), status: res.status }; }
  catch (e) { return { ok: res.ok, data: text, status: res.status }; }
}

async function listItems() {
  if (!BACKEND) {
    const tbody = document.querySelector('#itemsTable tbody');
    tbody.innerHTML = '<tr><td colspan="4">Backend not configured. Add <code>?backend=https://your-backend</code> to the URL or run <code>window.BACKEND = "https://your-backend"</code> in the console.</td></tr>';
    return;
  }
  const res = await fetchJson(BACKEND + '/list');
  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = '';
  if (!res.ok) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4">Error fetching list: ${res.status} ${JSON.stringify(res.data)}</td>`;
    tbody.appendChild(tr);
    return;
  }
  const data = res.data || {};
  (data.items || []).forEach(it => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${it.Key}</td><td>${it.Size}</td><td>${it.LastModified || ''}</td><td></td>`;
    const actions = tr.querySelector('td:last-child');
    const dl = document.createElement('button');
    dl.textContent = 'Download';
    dl.className = 'btn';
    dl.addEventListener('click', () => downloadKey(it.Key));
    actions.appendChild(dl);
    tbody.appendChild(tr);
  });
}

async function downloadKey(key) {
  const res = await fetchJson(BACKEND + '/presign-download', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
  if (!res.ok) return alert('Server error (' + res.status + '): ' + (res.data && typeof res.data === 'string' ? res.data : JSON.stringify(res.data)));
  const data = res.data;
  if (data.error) return alert(data.error);
  window.open(data.url, '_blank');
}

function createFileItem(file) {
  const wrap = document.createElement('div');
  wrap.className = 'file-item card';
  const meta = document.createElement('div'); meta.className = 'file-meta';
  const name = document.createElement('div'); name.className = 'file-name'; name.textContent = file.name;
  const sub = document.createElement('div'); sub.className = 'file-sub'; sub.textContent = `${(file.size/1024).toFixed(1)} KB · ${file.type || 'n/a'}`;
  meta.appendChild(name); meta.appendChild(sub);

  const progressWrap = document.createElement('div'); progressWrap.style.width = '280px';
  const progress = document.createElement('div'); progress.className = 'progress';
  const bar = document.createElement('i'); progress.appendChild(bar); progressWrap.appendChild(progress);

  const status = document.createElement('div'); status.className = 'status'; status.textContent = 'Queued';

  const actions = document.createElement('div');
  const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel'; cancelBtn.className = 'btn secondary';

  actions.appendChild(cancelBtn);

  wrap.appendChild(meta);
  wrap.appendChild(progressWrap);
  wrap.appendChild(status);
  wrap.appendChild(actions);

  return { wrap, bar, status, cancelBtn };
}

async function presignForKey(key, contentType) {
  if (!BACKEND) return { ok: false, data: 'Backend not configured' };
  const res = await fetchJson(BACKEND + '/presign-upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, contentType }) });
  return res;
}

async function handleUploadFiles(files) {
  if (!BACKEND) {
    alert('Backend not configured. Add ?backend=https://your-backend to the URL or set window.BACKEND in the console.');
    return;
  }
  const prefix = document.getElementById('prefix').value || '';
  const container = document.getElementById('fileList');
  for (let file of files) {
    const key = prefix + file.name;
    const item = createFileItem(file);
    container.appendChild(item.wrap);
    item.status.textContent = 'Getting upload URL...';
    try {
      const pres = await presignForKey(key, file.type);
      if (!pres.ok) throw new Error('Presign failed: ' + pres.status + ' ' + JSON.stringify(pres.data));
      if (pres.data && pres.data.error) throw new Error(pres.data.error);
      const url = pres.data.url;
      item.status.textContent = 'Uploading...';

      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = ev => { if (ev.lengthComputable) item.bar.style.width = ((ev.loaded/ev.total)*100).toFixed(1) + '%'; };
      xhr.onload = () => {
        if (xhr.status >=200 && xhr.status <300) {
          item.bar.style.width = '100%';
          item.status.textContent = 'Uploaded';
          item.status.classList.add('success');
        } else { item.status.textContent = `Upload failed (${xhr.status})`; }
      };
      xhr.onerror = () => { item.status.textContent = 'Upload error'; };
      xhr.onabort = () => { item.status.textContent = 'Cancelled'; };
      item.cancelBtn.addEventListener('click', () => { try { xhr.abort(); } catch(e){} });
      xhr.send(file);

    } catch (err) {
      console.error(err);
      item.status.textContent = 'Error: ' + (err && err.message || err);
    }
  }
  setTimeout(listItems, 1200);
}

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); dropzone.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files || []);
  if (files.length) handleUploadFiles(files);
});

fileInput.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length) handleUploadFiles(files);
  e.target.value = '';
});

document.getElementById('refreshBtn').addEventListener('click', listItems);
listItems();
