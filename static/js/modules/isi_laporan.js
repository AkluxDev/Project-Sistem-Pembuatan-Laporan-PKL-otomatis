/* ============================================================
   modules/isi_laporan.js — v5.0

   PERBAIKAN v5.0:
   - Gambar bisa ditambahkan di dalam list item (simple & title)
   - Gambar bisa ditambahkan di dalam nested list item
   - Gambar bisa ditambahkan setelah paragraf (sudah ada sebelumnya)
   - Data gambar di dalam list di-collect dengan benar
   - doc_generator.py harus support render gambar dalam list item
   ============================================================ */
'use strict';

import { getImage, saveImage } from './image_db.js';

/* ── STATE ──────────────────────────────────────────────────── */
let _babCounter  = 0;
let _sortables   = [];

/* ── INIT ───────────────────────────────────────────────────── */
export function initIsi() {
    const c = document.getElementById('containerIsi');
    if (!c) return;
    c.innerHTML = '';
    _babCounter = 0;
    _sortables.forEach(s => { try { s.destroy(); } catch {} });
    _sortables = [];
    _makeSortable(c, { onEnd: () => { _renumberBab(); _renumberAllSubs(); } });
}

/* ── SORTABLE HELPER ────────────────────────────────────────── */
function _makeSortable(el, opts = {}) {
    if (!el || el.__sortable) return;
    const s = new Sortable(el, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        ...opts,
    });
    el.__sortable = s;
    _sortables.push(s);
    return s;
}

/* ── LABEL UTILS ────────────────────────────────────────────── */
function _buildLabel(style, n) {
    switch (style) {
        case '1':      return `${n}.`;
        case 'a':      return `${String.fromCharCode(96 + n)}.`;
        case 'A':      return `${String.fromCharCode(64 + n)}.`;
        case 'i':      return `${_toRoman(n).toLowerCase()}.`;
        case 'I':      return `${_toRoman(n)}.`;
        case 'bullet': return '•';
        case 'none':   return '';
        default:       return `${n}.`;
    }
}

function _toRoman(n) {
    const v = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
               [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    let r = '';
    for (const [val, sym] of v) while (n >= val) { r += sym; n -= val; }
    return r;
}

function _stripLeadingLabel(text, label) {
    const raw = (text || '').trim();
    const prefix = (label || '').trim();
    if (!raw || !prefix) return raw;
    const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`^${escape(prefix)}\\s*`, 'i');
    return raw.replace(rx, '').trim();
}

/* ── RENUMBER ────────────────────────────────────────────────── */
function _renumberBab() {
    _babCounter = 0;
    document.querySelectorAll('#containerIsi > .isi-bab').forEach(bab => {
        _babCounter++;
        const lbl = bab.querySelector('.bab-label');
        if (lbl) lbl.textContent = `BAB ${_babCounter}`;
    });
}

function _renumberAllSubs() {
    document.querySelectorAll('.sub-container').forEach(container => {
        const subs = [...container.querySelectorAll(':scope > .isi-sub')];
        if (!subs.length) return;
        const style = subs[0].querySelector('.sub-style')?.value ?? 'A';
        subs.forEach((sub, i) => {
            const sel = sub.querySelector('.sub-style');
            const lbl = sub.querySelector('.sub-label');
            if (i === 0) {
                if (sel) sel.style.display = 'inline-block';
                if (lbl) lbl.style.display  = 'none';
            } else {
                if (sel) { sel.value = style; sel.style.display = 'none'; }
                const labelStr = _buildLabel(style, i + 1);
                if (lbl) { lbl.textContent = labelStr; lbl.style.display = labelStr ? 'inline-block' : 'none'; }
            }
        });
    });
}

export function refreshAllSubNumbering() { _renumberAllSubs(); }

function _renumberListItems(container, style) {
    const items = [...container.querySelectorAll(':scope > .list-item')];
    items.forEach((item, i) => {
        let lbl = item.querySelector(':scope > .list-item-label');
        if (!lbl) {
            lbl = document.createElement('span');
            lbl.className = 'list-item-label fw-bold flex-shrink-0 mt-2';
            lbl.style.cssText = 'min-width:1.8rem;display:inline-block;';
            item.prepend(lbl);
        }
        const txt = _buildLabel(style, i + 1);
        lbl.textContent = txt;
        lbl.style.display = txt ? 'inline-block' : 'none';
    });
}

export function refreshAllListNumbering() {
    document.querySelectorAll('[data-list-wrapper]').forEach(w => {
        const style = w.querySelector(':scope > .list-header > .list-style')?.value ?? '1';
        const cont  = w.querySelector(':scope > .list-items-container');
        if (cont) _renumberListItems(cont, style);
        w.querySelectorAll('[data-list-wrapper]').forEach(nw => {
            const ns = nw.querySelector(':scope > .list-header > .list-style')?.value ?? 'a';
            const nc = nw.querySelector(':scope > .list-items-container');
            if (nc) _renumberListItems(nc, ns);
        });
    });
}

/* ── TAMBAH BAB ─────────────────────────────────────────────── */
export function tambahBab() {
    const c = document.getElementById('containerIsi');
    if (!c) return;
    _babCounter++;
    const bab = document.createElement('div');
    bab.className = 'isi-bab card p-3 mt-3';
    bab.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
            <div class="d-flex align-items-center gap-2">
                <i class="bi bi-list drag-handle" style="cursor:grab" title="Seret untuk urut ulang"></i>
                <strong class="bab-label">BAB ${_babCounter}</strong>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="hapusBab(this)">
                <i class="bi bi-trash"></i> Hapus BAB
            </button>
        </div>
        <input type="text" class="form-control mb-2" placeholder="Judul BAB (mis: PENDAHULUAN)">
        <div class="sub-container"></div>
        <button class="btn btn-sm btn-primary mt-2" onclick="tambahSub(this)">
            <i class="bi bi-plus-circle me-1"></i> Tambah Sub Judul
        </button>`;
    c.appendChild(bab);
    _renumberBab();
}

export function hapusBab(btn) {
    btn.closest('.isi-bab')?.remove();
    _renumberBab();
}

/* ── TAMBAH SUB ─────────────────────────────────────────────── */
export function tambahSub(btn) {
    const babEl = btn.closest('.isi-bab');
    const subCont = babEl?.querySelector('.sub-container');
    if (!subCont) return;

    const sub = document.createElement('div');
    sub.className = 'isi-sub border rounded p-2 mt-2';
    sub.setAttribute('data-removable', 'sub');
    sub.innerHTML = `
        <div class="d-flex gap-2 align-items-center flex-wrap mb-2">
            <i class="bi bi-list drag-handle" style="cursor:grab"></i>
            <select class="form-select form-select-sm w-auto sub-style" onchange="refreshAllSubNumbering()">
                <option value="A">A.</option>
                <option value="1">1.</option>
                <option value="a">a.</option>
                <option value="I">I.</option>
                <option value="i">i.</option>
                <option value="bullet">•</option>
                <option value="none">Tanpa</option>
            </select>
            <span class="sub-label fw-bold" style="display:none;"></span>
            <input type="text" class="form-control flex-grow-1" style="min-width:0;" placeholder="Judul Sub Bab (mis: A. Latar Belakang)">
            <button class="btn btn-sm btn-outline-danger ms-auto" onclick="hapusItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <div class="content-container"></div>
        <div class="d-flex gap-2 mt-2 flex-wrap">
            <button class="btn btn-sm btn-outline-secondary" onclick="tambahParagraf(this)">
                <i class="bi bi-text-paragraph me-1"></i>+ Paragraf
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="tambahList(this)">
                <i class="bi bi-list-ol me-1"></i>+ List
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="tambahGambar(this)">
                <i class="bi bi-image me-1"></i>+ Gambar
            </button>
        </div>`;
    subCont.appendChild(sub);

    _makeSortable(subCont, { onEnd: () => { _renumberAllSubs(); refreshAllListNumbering(); } });
    _makeSortable(sub.querySelector('.content-container'), { onEnd: () => refreshAllListNumbering() });
    _renumberAllSubs();
}

/* ── TAMBAH PARAGRAF ────────────────────────────────────────── */
export function tambahParagraf(btn) {
    const cc = btn.closest('.isi-sub')?.querySelector('.content-container');
    if (!cc) return;
    const div = document.createElement('div');
    div.className = 'mt-2 d-flex gap-2 align-items-start content-item';
    div.setAttribute('data-removable', 'content');
    div.innerHTML = `
        <i class="bi bi-list drag-handle mt-2 flex-shrink-0" style="cursor:grab"></i>
        <textarea class="form-control" rows="3" placeholder="Isi paragraf..."></textarea>
        <button class="btn btn-sm btn-outline-danger flex-shrink-0 mt-1" onclick="hapusItem(this)">
            <i class="bi bi-trash"></i>
        </button>`;
    cc.appendChild(div);
}

/* ── TAMBAH GAMBAR (helper reusable) ────────────────────────── */
/**
 * Buat elemen gambar yang bisa dipakai di:
 * - content-container (sub bab)
 * - item-extra-container (dalam list item)
 */
function _createGambarEl() {
    const uid = Date.now() + Math.random().toString(36).slice(2, 6);
    const div = document.createElement('div');
    div.className = 'mt-2 content-item gambar-item';
    div.setAttribute('data-removable', 'content');
    div.setAttribute('data-type', 'gambar');
    div.innerHTML = `
        <div class="d-flex gap-2 align-items-center">
            <i class="bi bi-list drag-handle flex-shrink-0" style="cursor:grab"></i>
            <div class="flex-grow-1">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi bi-image text-muted"></i>
                    <span class="small text-muted fw-semibold">Gambar</span>
                </div>
                <input type="file" accept="image/*" class="form-control form-control-sm input-gambar">
                <div class="preview-gambar mt-1" id="prev-${uid}"></div>
                <input type="text" class="form-control form-control-sm mt-1 input-caption" placeholder="Caption gambar (opsional)">
            </div>
            <button class="btn btn-sm btn-outline-danger flex-shrink-0" onclick="hapusItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>`;
    const fileInput = div.querySelector('.input-gambar');
    const preview   = div.querySelector(`#prev-${uid}`);
    fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const id = 'img_' + Date.now() + Math.random().toString(36).slice(2, 6);
        await saveImage(id, file);
        div.dataset.imgId = id;
        _renderImagePreview(preview, file);
    });

    return div;
}

function _renderImagePreview(previewEl, file) {
    if (!previewEl || !file) return;
    const url = URL.createObjectURL(file);
    previewEl.innerHTML = `
        <img src="${url}"
        style="max-width:200px;max-height:120px;object-fit:contain;border-radius:4px;border:1px solid #dee2e6;">
    `;
}

async function _imagePayloadFromElement(gambarEl) {
    if (!gambarEl) return null;
    const imgId = gambarEl.dataset.imgId || null;
    const caption = gambarEl.querySelector('.input-caption')?.value?.trim() ?? '';
    if (!imgId) return null;

    const file = await getImage(imgId);
    if (!file) return null;

    return {
        type: 'gambar',
        imgId,
        data: await _readBase64(file),
        caption,
    };
}

/* ── TAMBAH GAMBAR di sub bab ───────────────────────────────── */
// [F-10] TAMBAH GAMBAR (support semua lokasi: sub & list item)
export function tambahGambar(btn) {
    // Prioritas 1: dalam sub bab
    let container = btn.closest('.isi-sub')?.querySelector('.content-container');

    // Prioritas 2: dalam list item
    if (!container) {
        container = btn.closest('.item-extra-container');
    }

    // Prioritas 3: fallback (debug)
    if (!container) {
        console.error('[tambahGambar] Container tidak ditemukan');
        return;
    }

    container.appendChild(_createGambarEl());
}

/* ── TAMBAH GAMBAR di dalam list item ──────────────────────── */
export function tambahGambarDiItem(btn) {
    const extraCont = btn.closest('.list-item')?.querySelector('.item-extra-container');
    if (!extraCont) return;
    extraCont.appendChild(_createGambarEl());
}

/* ── TAMBAH LIST ────────────────────────────────────────────── */
export function tambahList(btn) {
    const cc = btn.closest('.isi-sub')?.querySelector('.content-container');
    if (!cc) return;
    const div = document.createElement('div');
    div.className = 'mt-2 border rounded p-2 content-item';
    div.setAttribute('data-removable', 'content');
    div.setAttribute('data-list-wrapper', 'true');
    div.innerHTML = `
        <div class="list-header d-flex gap-2 mb-2 align-items-center flex-wrap">
            <i class="bi bi-list drag-handle" style="cursor:grab"></i>
            <span class="text-muted small">List</span>
            <select class="form-select form-select-sm w-auto list-style" onchange="refreshAllListNumbering()">
                <option value="1">1. (angka)</option>
                <option value="a">a. (huruf kecil)</option>
                <option value="A">A. (huruf besar)</option>
                <option value="i">i. (romawi kecil)</option>
                <option value="I">I. (romawi besar)</option>
                <option value="bullet">• (bullet)</option>
                <option value="none">— tanpa nomor</option>
            </select>
            <select class="form-select form-select-sm w-auto list-mode">
                <option value="simple">Isi saja</option>
                <option value="title">Judul + Isi</option>
            </select>
            <button class="btn btn-sm btn-primary" onclick="tambahListItem(this)">
                <i class="bi bi-plus me-1"></i>Tambah Item
            </button>
            <button class="btn btn-sm btn-outline-danger ms-auto" onclick="hapusItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <div class="list-items-container"></div>`;
    cc.appendChild(div);
    const itemsCont = div.querySelector('.list-items-container');
    _makeSortable(itemsCont, { onEnd: () => refreshAllListNumbering() });
    _addListItemToContainer(div);
}

/* ── TAMBAH LIST ITEM ───────────────────────────────────────── */
export function tambahListItem(btn) {
    const wrapper = btn.closest('[data-list-wrapper]');
    if (!wrapper) return;
    _addListItemToContainer(wrapper);
}

/**
 * Buat tombol aksi ekstra dalam list item (sub list + gambar)
 */
function _itemActionButtons() {
    return `
        <div class="d-flex gap-1 mt-1 flex-wrap">
            <button class="btn btn-xs btn-outline-secondary py-0 px-1" style="font-size:.72rem;" onclick="tambahNestedList(this)">
                <i class="bi bi-diagram-3 me-1"></i>+ Sub List
            </button>
            <button class="btn btn-xs btn-outline-secondary py-0 px-1" style="font-size:.72rem;" onclick="tambahGambarDiItem(this)">
                <i class="bi bi-image me-1"></i>+ Gambar
            </button>
        </div>
        <div class="nested-list-container mt-1"></div>
        <div class="item-extra-container mt-1"></div>`;
}

function _addListItemToContainer(wrapper) {
    const cont  = wrapper.querySelector(':scope > .list-items-container');
    const mode  = wrapper.querySelector(':scope > .list-header > .list-mode')?.value ?? 'simple';
    const style = wrapper.querySelector(':scope > .list-header > .list-style')?.value ?? '1';
    if (!cont) return;

    const item = document.createElement('div');
    item.className = 'd-flex gap-2 mb-1 align-items-start list-item';
    item.setAttribute('data-removable', 'list-item');

    const label = _buildLabel(style, cont.children.length + 1);

    if (mode === 'title') {
        item.innerHTML = `
            <span class="list-item-label fw-bold flex-shrink-0 mt-2" style="min-width:1.8rem;">${label}</span>
            <i class="bi bi-list drag-handle mt-2 flex-shrink-0" style="cursor:grab"></i>
            <div class="flex-grow-1" style="min-width:0;">
                <input type="text" class="form-control form-control-sm mb-1 input-judul-item" placeholder="Judul item">
                <textarea class="form-control form-control-sm input-teks-item" rows="2" placeholder="Deskripsi / isi"></textarea>
                ${_itemActionButtons()}
            </div>
            <button class="btn btn-sm btn-outline-danger flex-shrink-0" onclick="hapusItem(this)">
                <i class="bi bi-trash"></i>
            </button>`;
    } else {
        item.innerHTML = `
            <span class="list-item-label fw-bold flex-shrink-0 mt-2" style="min-width:1.8rem;">${label}</span>
            <i class="bi bi-list drag-handle mt-2 flex-shrink-0" style="cursor:grab"></i>
            <div class="flex-grow-1" style="min-width:0;">
                <input type="text" class="form-control form-control-sm input-teks-item" placeholder="Isi item list">
                ${_itemActionButtons()}
            </div>
            <button class="btn btn-sm btn-outline-danger flex-shrink-0" onclick="hapusItem(this)">
                <i class="bi bi-trash"></i>
            </button>`;
    }

    cont.appendChild(item);
    _makeSortable(cont, { onEnd: () => refreshAllListNumbering() });
    _renumberListItems(cont, style);
}

/* ── NESTED LIST ────────────────────────────────────────────── */
export function tambahNestedList(btn) {
    // Cari .nested-list-container yang merupakan sibling setelah tombol ini
    // Struktur: tombol ada di dalam div.flex-grow-1, lalu ada .nested-list-container
    const flexDiv = btn.closest('.flex-grow-1');
    const nestedCont = flexDiv?.querySelector('.nested-list-container');
    if (!nestedCont) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mt-2 border rounded p-2 bg-light';
    wrapper.setAttribute('data-list-wrapper', 'true');
    wrapper.setAttribute('data-removable', 'nested');
    wrapper.innerHTML = `
        <div class="list-header d-flex gap-2 mb-2 align-items-center flex-wrap">
            <span class="text-muted small">Sub List</span>
            <select class="form-select form-select-sm w-auto list-style" onchange="refreshAllListNumbering()">
                <option value="a">a. (huruf kecil)</option>
                <option value="1">1. (angka)</option>
                <option value="A">A. (huruf besar)</option>
                <option value="i">i. (romawi kecil)</option>
                <option value="I">I. (romawi besar)</option>
                <option value="bullet">• (bullet)</option>
                <option value="none">— tanpa nomor</option>
            </select>
            <select class="form-select form-select-sm w-auto list-mode">
                <option value="simple">Isi saja</option>
                <option value="title">Judul + Isi</option>
            </select>
            <button class="btn btn-sm btn-primary btn-sm" onclick="tambahListItem(this)">
                <i class="bi bi-plus me-1"></i>Item
            </button>
            <button class="btn btn-sm btn-outline-danger ms-auto" onclick="hapusItem(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <div class="list-items-container"></div>`;
    nestedCont.appendChild(wrapper);
    _addListItemToContainer(wrapper);
}

/* ── HAPUS ITEM ─────────────────────────────────────────────── */
export function hapusItem(btn) {
    const target = btn.closest('[data-removable]') ?? btn.parentElement;
    if (!target) return;
    target.remove();
    refreshAllListNumbering();
    _renumberAllSubs();
}

/* ── DATA COLLECTION ────────────────────────────────────────── */
export async function collectIsiLaporanAsync() {
    const result = [];
    let babIdx = 0;

    for (const bab of document.querySelectorAll('#containerIsi > .isi-bab')) {
        babIdx++;

        const labelBab = bab.querySelector('.bab-label')?.textContent?.trim() ?? `BAB ${babIdx}`;
        const judulBab = bab.querySelector(':scope > input[type="text"]')?.value?.trim() ?? '';

        const babObj = {
            judul_bab: judulBab ? `${labelBab} - ${judulBab}` : labelBab,
            subs: [],
        };

        const subElements = [...bab.querySelectorAll(':scope > .sub-container > .isi-sub')];
        for (const [subIndex, sub] of subElements.entries()) {
            const styleSub = sub.querySelector('.sub-style')?.value ?? 'A';
            const labelSub = _buildLabel(styleSub, subIndex + 1);
            const judulSubRaw = sub.querySelector('input[type="text"]')?.value?.trim() ?? '';
            const judulSub = _stripLeadingLabel(judulSubRaw, labelSub);

            const subObj = {
                judul_sub: `${labelSub} ${judulSub}`.trim(),
                contents: []
            };

            const contents = sub.querySelector(':scope > .content-container');

            for (const child of contents?.children ?? []) {

                // ✅ GAMBAR (IndexedDB)
                if (child.getAttribute('data-type') === 'gambar') {
                    const payload = await _imagePayloadFromElement(child);
                    if (payload) {
                        subObj.contents.push(payload);
                    }
                }

                // ✅ PARAGRAF
                else if (child.querySelector('textarea') && !child.hasAttribute('data-list-wrapper')) {
                    const teks = child.querySelector('textarea')?.value?.trim() ?? '';
                    if (teks) {
                        subObj.contents.push({
                            type: 'paragraf',
                            teks
                        });
                    }
                }

                // ✅ LIST
                else if (child.hasAttribute('data-list-wrapper')) {
                    const lst = await _collectListData(child);
                    if (lst?.items?.length) {
                        subObj.contents.push(lst);
                    }
                }
            }

            babObj.subs.push(subObj);
        }

        result.push(babObj);
    }

    return result;
}

/**
 * Collect data list termasuk gambar di dalam setiap item
 */
async function _collectListData(wrapper) {
    const style = wrapper.querySelector(':scope > .list-header > .list-style')?.value ?? '1';
    const mode  = wrapper.querySelector(':scope > .list-header > .list-mode')?.value  ?? 'simple';
    const cont  = wrapper.querySelector(':scope > .list-items-container');
    if (!cont) return null;
    const items = [];
    for (const item of cont.querySelectorAll(':scope > .list-item')) {
        const obj = { type: mode, anak: [], gambar_items: [] };
        if (mode === 'title') {
            obj.judul = item.querySelector('.input-judul-item')?.value?.trim() ?? '';
            obj.teks  = item.querySelector('.input-teks-item')?.value?.trim() ?? '';
        } else {
            obj.teks = item.querySelector('.input-teks-item')?.value?.trim() ?? '';
        }

        // Kumpulkan gambar dari item-extra-container
        const extraCont = item.querySelector('.item-extra-container');
        if (extraCont) {
            for (const gambarEl of extraCont.querySelectorAll('.gambar-item')) {
                const payload = await _imagePayloadFromElement(gambarEl);
                if (payload) {
                    obj.gambar_items.push(payload);
                }
            }
        }

        // Nested lists
        const nestedContainer = item.querySelector('.nested-list-container');
        if (nestedContainer) {
            for (const nw of nestedContainer.querySelectorAll(':scope > [data-list-wrapper]')) {
                const nested = await _collectListData(nw);
                if (nested?.items?.length) obj.anak.push(nested);
            }
        }
        items.push(obj);
    }
    return { type: 'list', style, mode, items };
}

function _readBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result);
        r.onerror = () => rej(new Error('FileReader error'));
        r.readAsDataURL(file);
    });
}

/* ── GLOBAL EXPORTS ─────────────────────────────────────────── */
Object.assign(window, {
    tambahBab, hapusBab,
    tambahSub,
    tambahParagraf, tambahGambar, tambahGambarDiItem,
    tambahList, tambahListItem, tambahNestedList,
    hapusItem,
    refreshAllListNumbering, refreshAllSubNumbering,
    collectIsiLaporanAsync,
});
