/* ============================================================
   modules/validation.js — v4.0

   PERBAIKAN:
   - Step 4: validasi BAB + sub memiliki konten
   - Step 5: rujukan opsional, tidak error jika semua kosong
   - Step 6: selalu valid (opsi & generate)
   ============================================================ */
'use strict';

import { showToast } from './toast.js';

export function validateStep(step) {
    switch (step) {
        case 1: return _step1();
        case 2: return _step2();
        case 3: return _step3();
        case 4: return _step4();
        case 5: return _step5();
        default: return true;
    }
}

function _step1() {
    let ok = true;
    for (const id of ['namaLengkap', 'namaInstansi']) {
        const el = document.getElementById(id);
        if (!el) continue;
        const valid = el.value.trim() !== '';
        el.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
    }
    if (!ok) showToast('Harap isi Nama Lengkap dan Nama Instansi!', 'warning');
    return ok;
}

function _step2() {
    let ok = true;
    document.querySelectorAll('.pengesahan-container .input-judul').forEach(el => {
        const valid = el.value.trim() !== '';
        el.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
    });
    if (!ok) showToast('Harap isi judul setiap halaman pengesahan!', 'warning');
    return ok;
}

function _step3() {
    let ok = true;
    for (const id of ['kpJudul', 'kpKataPembuka', 'kpKataPenutup']) {
        const el = document.getElementById(id);
        if (!el) continue;
        const valid = el.value.trim() !== '';
        el.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
    }
    if (!ok) showToast('Harap isi Judul, Kata Pembuka, dan Kata Penutup!', 'warning');
    return ok;
}

function _step4() {
    let ok = true;
    document.querySelectorAll('.isi-bab').forEach(bab => {
        const inp = bab.querySelector(':scope > input[type="text"]');
        if (!inp) return;
        const valid = inp.value.trim() !== '';
        inp.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
    });
    if (!ok) showToast('Harap isi judul setiap BAB!', 'warning');
    return ok;
}

function _step5() {
    const inputs = [...document.querySelectorAll('.rujukan-item .input-rujukan')];
    const filled = inputs.filter(el => el.value.trim() !== '');
    // Jika semua kosong = opsional, valid
    if (filled.length === 0) { inputs.forEach(el => el.classList.remove('is-invalid')); return true; }
    // Jika ada yang terisi, tidak boleh ada yang kosong
    let ok = true;
    inputs.forEach(el => {
        const valid = el.value.trim() !== '';
        el.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
    });
    if (!ok) showToast('Harap isi atau hapus entri rujukan yang kosong!', 'warning');
    return ok;
}

export function initLiveValidationClear() {
    document.addEventListener('input', e => {
        if (e.target.classList.contains('is-invalid') && e.target.value.trim())
            e.target.classList.remove('is-invalid');
    });
}