/* ============================================================
   main.js  —  v3.0
   Entry point aplikasi Sistem Laporan PKL

   v3.0:
   - Full data persistence: ALL form sections saved to localStorage
   - Multi-paragraph kata pembuka/penutup support
   - Image upload bug fix (return div)
   ============================================================ */

'use strict';

// ── Imports ───────────────────────────────────────────────────
import { initNavbarScroll }                         from './modules/navbar.js';
import { initWizard, nextStep, prevStep, goToStep } from './modules/wizard.js';
import { initLiveValidationClear }                  from './modules/validation.js';

import {
    renderPengesahanInitial, tambahPengesahan, hapusPengesahan,
    tambahTTD, handleCustomJabatan,
} from './modules/pengesahan.js';

import {
    initKataPengantar, tambahUcapan, hapusUcapan,
    handleUcapanJabatanSelect,
    tambahParagrafPembuka, hapusParagrafPembuka,
    tambahParagrafPenutup, hapusParagrafPenutup,
    collectKataPengantar,
} from './modules/kata-pengantar.js';

import {
    initIsi,
    tambahBab, tambahSub, tambahParagraf,
    tambahList, tambahListItem, tambahNestedList,
    tambahGambar, tambahGambarDiItem, hapusItem, hapusBab,
    refreshAllListNumbering, refreshAllSubNumbering,
    collectIsiLaporanAsync,
} from './modules/isi_laporan.js';

import { generateLaporan }  from './modules/generate.js';
import { getImage, clearAllImages } from './modules/image_db.js';

import {
    renderRujukanInitial, tambahRujukan, hapusRujukan,
} from './modules/halaman_rujukan.js';

import {
    initCoverDropZone, handleCoverImageSelect,
    removeCoverImage, getCoverFile, restoreCoverImage, toggleOptionCard,
} from './modules/cover.js';

// ══════════════════════════════════════════════════════════════
//  AUTOSAVE — Comprehensive Draft System
// ══════════════════════════════════════════════════════════════

const DRAFT_KEY = 'draft_laporan_full';
let _saveTimer = null;

function _debouncedSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => saveDraft(), 400);
}

async function saveDraft() {
    try {
        const draft = {};

        // ── 1. Identitas ──────────────────────────────────────
        const identitasIds = [
            'namaLengkap', 'nisNim', 'kelasJurusan', 'namaSekolah',
            'namaInstansi', 'namaPembimbingLapangan', 'namaPembimbingSekolah',
            'tanggalMulai', 'tanggalSelesai',
        ];
        draft.identitas = {};
        for (const id of identitasIds) {
            draft.identitas[id] = document.getElementById(id)?.value ?? '';
        }

        // ── 2. Pengesahan ─────────────────────────────────────
        draft.pengesahan = [...document.querySelectorAll('.pengesahan-item')].map(item => {
            const getVal = sel => item.querySelector(sel)?.value?.trim() ?? '';
            const ttds = [...item.querySelectorAll('.ttd-item')].map(ttd => {
                const jabSelect = ttd.querySelector('.input-jabatan-select')?.value ?? '';
                return {
                    nama: ttd.querySelector('.input-nama-ttd')?.value?.trim() ?? '',
                    jabatan_select: jabSelect,
                    jabatan_manual: ttd.querySelector('.input-jabatan-ttd')?.value?.trim() ?? '',
                };
            });
            return {
                judul:    getVal('.input-judul'),
                pt:       getVal('.input-pt'),
                tujuan:   getVal('.input-tujuan'),
                tahun:    getVal('.input-tahun'),
                nama:     getVal('.input-nama'),
                nis:      getVal('.input-nis'),
                kelas:    getVal('.input-kelas'),
                tanggal:  getVal('.input-tanggal'),
                ttds,
            };
        });

        // ── 3. Kata Pengantar ─────────────────────────────────
        draft.kataPengantar = {
            judul: document.getElementById('kpJudul')?.value ?? '',
            pembuka: [...document.querySelectorAll('#containerKataPembuka .input-paragraf-pembuka')]
                .map(el => el.value ?? ''),
            penutup: [...document.querySelectorAll('#containerKataPenutup .input-paragraf-penutup')]
                .map(el => el.value ?? ''),
            ucapan: [...document.querySelectorAll('#containerUcapanTerimaKasih .ucapan-item')].map(item => ({
                nama: item.querySelector('.input-ucapan-nama')?.value ?? '',
                jabatan_select: item.querySelector('.input-ucapan-jabatan-select')?.value ?? '',
                jabatan: item.querySelector('.input-ucapan-jabatan')?.value ?? '',
            })),
            kota_tanggal: document.getElementById('kpKotaTanggal')?.value ?? '',
            nama_penulis: document.getElementById('kpNamaPenulis')?.value ?? '',
        };

        // ── 4. Isi Laporan ────────────────────────────────────
        draft.isiLaporan = await collectIsiLaporanAsync();

        // ── 5. Rujukan ────────────────────────────────────────
        draft.rujukan = [...document.querySelectorAll('.rujukan-item .input-rujukan')]
            .map(el => el.value ?? '');

        // ── 6. Opsi ───────────────────────────────────────────
        draft.opsi = {
            cover:        document.getElementById('switchCover')?.checked ?? false,
            daftarIsi:    document.getElementById('switchDaftarIsi')?.checked ?? false,
            tandaTangan:  document.getElementById('switchTandaTangan')?.checked ?? false,
            kotaTtd:      document.getElementById('kotaTtd')?.value ?? '',
        };

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (err) {
        console.warn('[saveDraft] Error:', err);
    }
}

async function loadDraft() {
    let draft;
    try {
        draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    } catch { return; }
    if (!draft) return;

    try {
        // ── 1. Identitas ──────────────────────────────────────
        if (draft.identitas) {
            for (const [id, val] of Object.entries(draft.identitas)) {
                const el = document.getElementById(id);
                if (el) el.value = val;
            }
        }

        // ── 2. Pengesahan ─────────────────────────────────────
        if (draft.pengesahan?.length) {
            const container = document.getElementById('containerlembarpengesahan');
            if (container) {
                container.innerHTML = '';
                for (const p of draft.pengesahan) {
                    tambahPengesahan();
                    const items = container.querySelectorAll('.pengesahan-item');
                    const item = items[items.length - 1];

                    const setVal = (sel, val) => {
                        const el = item.querySelector(sel);
                        if (el) el.value = val;
                    };

                    setVal('.input-judul', p.judul);
                    setVal('.input-pt', p.pt);
                    setVal('.input-tujuan', p.tujuan);
                    setVal('.input-tahun', p.tahun);
                    setVal('.input-nama', p.nama);
                    setVal('.input-nis', p.nis);
                    setVal('.input-kelas', p.kelas);
                    setVal('.input-tanggal', p.tanggal);

                    if (p.ttds?.length) {
                        for (const ttd of p.ttds) {
                            const ttdBtn = item.querySelector('button[onclick="tambahTTD(this)"]');
                            if (ttdBtn) ttdBtn.click();
                            const ttdItems = item.querySelectorAll('.ttd-item');
                            const lastTtd = ttdItems[ttdItems.length - 1];
                            if (lastTtd) {
                                const namaInput = lastTtd.querySelector('.input-nama-ttd');
                                if (namaInput) namaInput.value = ttd.nama;
                                const jabSelect = lastTtd.querySelector('.input-jabatan-select');
                                if (jabSelect) {
                                    jabSelect.value = ttd.jabatan_select;
                                    if (ttd.jabatan_select === 'custom') {
                                        handleCustomJabatan(jabSelect);
                                        const manualInput = lastTtd.querySelector('.input-jabatan-ttd');
                                        if (manualInput) manualInput.value = ttd.jabatan_manual;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── 3. Kata Pengantar ─────────────────────────────────
        if (draft.kataPengantar) {
            const kp = draft.kataPengantar;

            const judulEl = document.getElementById('kpJudul');
            if (judulEl && kp.judul) judulEl.value = kp.judul;

            // Pembuka — paragraf
            if (kp.pembuka?.length) {
                const contPembuka = document.getElementById('containerKataPembuka');
                if (contPembuka) {
                    contPembuka.innerHTML = '';
                    for (const teks of kp.pembuka) {
                        tambahParagrafPembuka();
                        const items = contPembuka.querySelectorAll('.input-paragraf-pembuka');
                        const last = items[items.length - 1];
                        if (last) last.value = teks;
                    }
                }
            }

            // Penutup — paragraf
            if (kp.penutup?.length) {
                const contPenutup = document.getElementById('containerKataPenutup');
                if (contPenutup) {
                    contPenutup.innerHTML = '';
                    for (const teks of kp.penutup) {
                        tambahParagrafPenutup();
                        const items = contPenutup.querySelectorAll('.input-paragraf-penutup');
                        const last = items[items.length - 1];
                        if (last) last.value = teks;
                    }
                }
            }

            // Ucapan
            if (kp.ucapan?.length) {
                const contUcapan = document.getElementById('containerUcapanTerimaKasih');
                if (contUcapan) {
                    contUcapan.innerHTML = '';
                    for (const u of kp.ucapan) {
                        tambahUcapan();
                        const items = contUcapan.querySelectorAll('.ucapan-item');
                        const last = items[items.length - 1];
                        if (last) {
                            const namaEl = last.querySelector('.input-ucapan-nama');
                            if (namaEl) namaEl.value = u.nama;
                            const jabSelect = last.querySelector('.input-ucapan-jabatan-select');
                            if (jabSelect && u.jabatan_select) {
                                jabSelect.value = u.jabatan_select;
                            }
                            const jabInput = last.querySelector('.input-ucapan-jabatan');
                            if (jabInput) jabInput.value = u.jabatan;
                        }
                    }
                }
            }

            const kotaEl = document.getElementById('kpKotaTanggal');
            if (kotaEl && kp.kota_tanggal) kotaEl.value = kp.kota_tanggal;
            const penulisEl = document.getElementById('kpNamaPenulis');
            if (penulisEl && kp.nama_penulis) penulisEl.value = kp.nama_penulis;
        }

        // ── 4. Isi Laporan ────────────────────────────────────
        if (draft.isiLaporan?.length) {
            for (const bab of draft.isiLaporan) {
                tambahBab();
                const lastBab = document.querySelector('.isi-bab:last-child');
                if (!lastBab) continue;

                // Judul bab — strip "BAB X - " prefix
                const judulBab = (bab.judul_bab || '').replace(/^BAB\s+\S+\s*-?\s*/, '');
                const babInput = lastBab.querySelector(':scope > input[type="text"]');
                if (babInput) babInput.value = judulBab;

                for (const sub of bab.subs || []) {
                    const subBtn = lastBab.querySelector('button[onclick="tambahSub(this)"]');
                    if (subBtn) subBtn.click();
                    const lastSub = lastBab.querySelector('.isi-sub:last-child');
                    if (!lastSub) continue;

                    const subInput = lastSub.querySelector('input[type="text"]');
                    if (subInput) subInput.value = sub.judul_sub || '';

                    for (const content of sub.contents || []) {
                        if (content.type === 'paragraf') {
                            const pBtn = lastSub.querySelector('button[onclick="tambahParagraf(this)"]');
                            if (pBtn) pBtn.click();
                            const allTa = lastSub.querySelectorAll('.content-container textarea');
                            const lastTa = allTa[allTa.length - 1];
                            if (lastTa) lastTa.value = content.teks || '';
                        }

                        if (content.type === 'gambar') {
                            const btn = lastSub.querySelector('button[onclick="tambahGambar(this)"]');
                            if (btn) btn.click();
                            const items = lastSub.querySelectorAll('.gambar-item');
                            const lastImg = items[items.length - 1];
                            if (lastImg && content.imgId) {
                                const file = await getImage(content.imgId);
                                if (file) {
                                    const url = URL.createObjectURL(file);
                                    lastImg.querySelector('.preview-gambar').innerHTML =
                                        `<img src="${url}" style="max-width:200px;max-height:120px;object-fit:contain;border-radius:4px;border:1px solid #dee2e6;">`;
                                    lastImg.dataset.imgId = content.imgId;
                                }
                                const capInput = lastImg.querySelector('.input-caption');
                                if (capInput) capInput.value = content.caption || '';
                            }
                        }

                        if (content.type === 'list') {
                            const btn = lastSub.querySelector('button[onclick="tambahList(this)"]');
                            if (btn) btn.click();
                            const wrappers = lastSub.querySelectorAll('[data-list-wrapper]');
                            const lastWrapper = wrappers[wrappers.length - 1];
                            if (lastWrapper) {
                                const styleSelect = lastWrapper.querySelector('.list-style');
                                const modeSelect  = lastWrapper.querySelector('.list-mode');
                                if (styleSelect) styleSelect.value = content.style || '1';
                                if (modeSelect)  modeSelect.value  = content.mode  || 'simple';

                                const container = lastWrapper.querySelector('.list-items-container');
                                if (container) container.innerHTML = '';

                                for (const item of content.items || []) {
                                    _renderListItemFromData(lastWrapper, item);
                                }
                                refreshAllListNumbering();
                            }
                        }
                    }
                }
            }
        }

        // ── 5. Rujukan ────────────────────────────────────────
        if (draft.rujukan?.length) {
            const contRujukan = document.getElementById('containerRujukan');
            if (contRujukan) {
                contRujukan.innerHTML = '';
                for (const teks of draft.rujukan) {
                    tambahRujukan();
                    const items = contRujukan.querySelectorAll('.input-rujukan');
                    const last = items[items.length - 1];
                    if (last) last.value = teks;
                }
            }
        }

        // ── 6. Opsi ───────────────────────────────────────────
        if (draft.opsi) {
            const opts = draft.opsi;
            _restoreCheckbox('switchCover', 'cardCover', opts.cover);
            _restoreCheckbox('switchDaftarIsi', 'cardDaftarIsi', opts.daftarIsi);
            _restoreCheckbox('switchTandaTangan', 'cardTandaTangan', opts.tandaTangan);

            if (opts.cover) {
                const wrapper = document.getElementById('coverImageWrapper');
                if (wrapper) wrapper.style.display = 'block';
                restoreCoverImage().catch(err => console.warn('[loadDraft] Gagal load cover image:', err));
            }
            if (opts.tandaTangan) {
                const wrapper = document.getElementById('kotaWrapper');
                if (wrapper) wrapper.style.display = 'block';
                const kotaTtd = document.getElementById('kotaTtd');
                if (kotaTtd && opts.kotaTtd) kotaTtd.value = opts.kotaTtd;
            }
        }

    } catch (err) {
        console.warn('[loadDraft] Error:', err);
    }
}

function _restoreCheckbox(cbId, cardId, checked) {
    const cb = document.getElementById(cbId);
    const card = document.getElementById(cardId);
    if (cb) cb.checked = !!checked;
    if (card) card.classList.toggle('selected', !!checked);
}

function _renderListItemFromData(wrapper, itemData) {
    const mode = wrapper.querySelector('.list-mode')?.value ?? 'simple';
    const cont = wrapper.querySelector('.list-items-container');
    const addBtn = wrapper.querySelector('button[onclick="tambahListItem(this)"]');
    if (addBtn) addBtn.click();
    else tambahListItem(wrapper.querySelector('button'));

    const items = cont.querySelectorAll('.list-item');
    const lastItem = items[items.length - 1];
    if (!lastItem) return;

    if (mode === 'title') {
        const judulInput = lastItem.querySelector('.input-judul-item');
        if (judulInput) judulInput.value = itemData.judul || '';
        const teksInput = lastItem.querySelector('.input-teks-item');
        if (teksInput) teksInput.value = itemData.teks || '';
    } else {
        const teksInput = lastItem.querySelector('.input-teks-item');
        if (teksInput) teksInput.value = itemData.teks || '';
    }

    if (itemData.gambar_items?.length) {
        for (const imageData of itemData.gambar_items) {
            const btn = lastItem.querySelector('button[onclick="tambahGambarDiItem(this)"]');
            if (btn) btn.click();
            const gambarItems = lastItem.querySelectorAll('.item-extra-container .gambar-item');
            const lastImage = gambarItems[gambarItems.length - 1];
            if (!lastImage || !imageData.imgId) continue;

            lastImage.dataset.imgId = imageData.imgId;
            const capInput = lastImage.querySelector('.input-caption');
            if (capInput) capInput.value = imageData.caption || '';

            getImage(imageData.imgId).then(file => {
                if (!file) return;
                const url = URL.createObjectURL(file);
                const preview = lastImage.querySelector('.preview-gambar');
                if (preview) {
                    preview.innerHTML =
                        `<img src="${url}" style="max-width:200px;max-height:120px;object-fit:contain;border-radius:4px;border:1px solid #dee2e6;">`;
                }
            }).catch(err => console.warn('[loadDraft] Gagal restore gambar item list:', err));
        }
    }

    // Nested lists
    if (itemData.anak?.length) {
        for (const nested of itemData.anak) {
            const btn = lastItem.querySelector('button[onclick="tambahNestedList(this)"]');
            if (btn) btn.click();

            const nestedWrappers = lastItem.querySelectorAll('.nested-list-container > [data-list-wrapper]');
            const nestedWrapper = nestedWrappers[nestedWrappers.length - 1];
            if (!nestedWrapper) continue;

            const nStyleSelect = nestedWrapper.querySelector('.list-style');
            const nModeSelect  = nestedWrapper.querySelector('.list-mode');
            if (nStyleSelect) nStyleSelect.value = nested.style || 'a';
            if (nModeSelect)  nModeSelect.value  = nested.mode  || 'simple';

            nestedWrapper.querySelector('.list-items-container').innerHTML = '';

            for (const child of nested.items || []) {
                _renderListItemFromData(nestedWrapper, child);
            }
        }
    }
}

async function hapusSemuaData() {
    try {
        localStorage.removeItem(DRAFT_KEY);
        // Hapus juga semua gambar dari IndexedDB
        await clearAllImages();
        window.location.reload();
    } catch (err) {
        console.error('[hapusSemuaData] Error:', err);
        alert('Gagal menghapus data.');
    }
}

// ── Expose ke window ──────────────────────────────────────────
Object.assign(window, {
    // Wizard
    nextStep, prevStep, goToStep,

    // Pengesahan
    tambahPengesahan, hapusPengesahan, tambahTTD, handleCustomJabatan,

    // Kata Pengantar
    tambahUcapan, hapusUcapan, handleUcapanJabatanSelect,
    tambahParagrafPembuka, hapusParagrafPembuka,
    tambahParagrafPenutup, hapusParagrafPenutup,

    // Reset Data
    hapusSemuaData,

    // Isi Laporan
    tambahBab, tambahSub, tambahParagraf,
    tambahList, tambahListItem, tambahNestedList,
    tambahGambar, tambahGambarDiItem,
    hapusItem, hapusBab,
    refreshAllListNumbering, refreshAllSubNumbering,

    // Generate
    generateLaporan,

    // Rujukan
    tambahRujukan, hapusRujukan,

    // Cover / opsi
    handleCoverImageSelect, removeCoverImage, toggleOptionCard,
});

// getCoverFile diakses oleh generate.js melalui window._cover
window._cover = { getCoverFile };

// ── Event: autosave saat input ────────────────────────────────
document.addEventListener('input', _debouncedSave);

// ── Event: autosave saat klik tombol tambah/hapus ─────────────
document.addEventListener('click', (e) => {
    if (
        e.target.closest('button') &&
        (
            e.target.innerText?.includes('Tambah') ||
            e.target.innerText?.includes('Hapus') ||
            e.target.closest('[onclick*="hapus"]') ||
            e.target.closest('[onclick*="tambah"]')
        )
    ) {
        setTimeout(() => saveDraft(), 300);
    }
});

// ── Event: autosave saat select berubah ───────────────────────
document.addEventListener('change', (e) => {
    if (e.target.matches('select, input[type="checkbox"]')) {
        setTimeout(() => saveDraft(), 200);
    }
});

// ── Inisialisasi saat DOM siap ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNavbarScroll();
    initWizard();
    initLiveValidationClear();
    renderPengesahanInitial();
    initKataPengantar();
    initCoverDropZone();
    initIsi();
    renderRujukanInitial();
    loadDraft();
});
