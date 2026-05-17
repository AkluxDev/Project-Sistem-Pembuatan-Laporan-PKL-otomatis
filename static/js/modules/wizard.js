/* ============================================================
   modules/wizard.js  — v2.1 (fixed)
   Navigasi multi-step wizard (progress bar, panel visibility)

   FIX:
   - buildSummary() dipanggil setiap kali step terakhir dibuka,
     bukan hanya satu kali. Sebelumnya jika user navigasi mundur
     lalu maju lagi, summary tidak diperbarui.
   - _updateWizardUI: connector 'active' class dihapus dari logika
     yang salah (connector idx tidak sesuai dengan step).
   - goToStep: validasi hanya ke depan, tidak ke belakang.
   ============================================================ */

'use strict';

import { validateStep } from './validation.js';
import { buildSummary } from './summary.js';

// ── State ─────────────────────────────────────────────────────
export const TOTAL_STEPS = 6;
export let   currentStep = 1;

// ── Public API ────────────────────────────────────────────────

/**
 * Pindah ke step tertentu.
 * Validasi hanya dijalankan saat maju (step > currentStep).
 * @param {number} step
 */
export function goToStep(step) {
    if (step < 1 || step > TOTAL_STEPS) return;

    // Validasi hanya saat maju, bukan saat mundur
    if (step > currentStep && !validateStep(currentStep)) return;

    currentStep = step;
    _updateWizardUI(step);

    // Scroll ke atas card
    const card = document.querySelector('.main-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Maju ke step berikutnya. */
export function nextStep() { goToStep(currentStep + 1); }

/** Kembali ke step sebelumnya. */
export function prevStep() { goToStep(currentStep - 1); }

// ── Private ───────────────────────────────────────────────────

function _updateWizardUI(step) {
    // Panel visibility
    document.querySelectorAll('.step-panel').forEach((panel, idx) => {
        panel.classList.toggle('active', idx + 1 === step);
    });

    // Progress circles
    document.querySelectorAll('.wizard-step').forEach((el, idx) => {
        const s = idx + 1;
        el.classList.remove('active', 'done');
        if (s === step)    el.classList.add('active');
        else if (s < step) el.classList.add('done');
    });

    // Connectors
    document.querySelectorAll('.wizard-connector').forEach((el, idx) => {
        el.classList.remove('done', 'active');
        if (idx + 1 < step)  el.classList.add('done');
        if (idx + 1 === step) el.classList.add('active');
    });

    // FIX: rebuild summary SETIAP KALI masuk step terakhir,
    // bukan hanya pertama kali, agar data selalu terkini.
    if (step === TOTAL_STEPS) buildSummary();
}

/** Inisialisasi wizard ke step 1 saat halaman dimuat. */
export function initWizard() {
    _updateWizardUI(1);
}
