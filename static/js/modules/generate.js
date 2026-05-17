/* ============================================================
   modules/generate.js — v4.0
   Kumpulkan data form → kirim ke Flask → download .docx

   PERBAIKAN:
   - collectFormDataAsync mencakup semua field termasuk motto, identitas
   - Error handling lebih informatif
   - Loading state lebih robust
   ============================================================ */
'use strict';

import { showToast }                  from './toast.js';
import { validateStep }               from './validation.js';
import { currentStep }                from './wizard.js';
import { collectKataPengantar }       from './kata-pengantar.js';
import { collectPengesahanAsync }     from './pengesahan.js';
import { collectIsiLaporanAsync }     from './isi_laporan.js';

export async function generateLaporan() {
    if (!validateStep(currentStep)) return;
    _setLoading(true);
    try {
        const data     = await collectFormDataAsync();
        const coverFile = window._cover?.getCoverFile?.() ?? null;
        const opts      = _buildFetch(data, coverFile);
        const res       = await fetch('/generate', opts);
        if (!res.ok) {
            let msg = `HTTP ${res.status}`;
            try { const j = await res.json(); msg = j.error ?? msg; } catch {}
            throw new Error(msg);
        }
        await _download(res, data.nama_lengkap);
        showToast('🎉 Laporan berhasil dibuat dan diunduh!', 'success');
    } catch (err) {
        showToast(`❌ Gagal: ${err.message}`, 'danger');
        console.error('[generate]', err);
    } finally {
        _setLoading(false);
    }
}

export async function collectFormDataAsync() {
    const get = id => document.getElementById(id)?.value?.trim() ?? '';

    const [pengesahan, isi_laporan] = await Promise.all([
        collectPengesahanAsync(),
        collectIsiLaporanAsync(),
    ]);
    const kata_pengantar = collectKataPengantar();

    const rujukan = [...document.querySelectorAll('.rujukan-item')]
        .map(item => ({ teks: item.querySelector('.input-rujukan')?.value?.trim() ?? '' }))
        .filter(r => r.teks);

    return {
        nama_lengkap             : get('namaLengkap'),
        nis_nim                  : get('nisNim'),
        kelas_jurusan            : get('kelasJurusan'),
        nama_sekolah             : get('namaSekolah'),
        nama_instansi            : get('namaInstansi'),
        nama_pembimbing_lapangan : get('namaPembimbingLapangan'),
        nama_pembimbing_sekolah  : get('namaPembimbingSekolah'),
        kota_ttd                 : get('kotaTtd'),
        tanggal_mulai            : get('tanggalMulai'),
        tanggal_selesai          : get('tanggalSelesai'),
        tahun_ajaran             : get('tahunAjaran') || '',
        motto                    : get('motto') || '',
        buat_cover               : document.getElementById('switchCover')?.checked      ?? false,
        buat_daftar_isi          : document.getElementById('switchDaftarIsi')?.checked  ?? false,
        buat_tanda_tangan        : document.getElementById('switchTandaTangan')?.checked ?? false,
        pengesahan,
        kata_pengantar,
        isi_laporan,
        rujukan,
    };
}

function _buildFetch(data, coverFile) {
    if (data.buat_cover && coverFile) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(data));
        fd.append('cover_image', coverFile);
        return { method: 'POST', body: fd };
    }
    return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
}

async function _download(res, nama) {
    const blob     = await res.blob();
    const url      = URL.createObjectURL(blob);
    const safe     = (nama || 'Siswa').replace(/\s+/g, '_').slice(0, 50);
    const filename = `Laporan_PKL_${safe}.docx`;
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function _setLoading(on) {
    document.querySelectorAll('.btn-generate').forEach(b => b.disabled = on);
    document.querySelectorAll('[id^="btnGenerateLabel"]').forEach(el => {
        el.innerHTML = on
            ? '<i class="bi bi-hourglass-split me-2"></i>Sedang membuat laporan...'
            : '<i class="bi bi-file-earmark-arrow-down me-2"></i>Generate &amp; Download (.docx)';
    });
    document.querySelectorAll('[id^="btnGenerateSpinner"]').forEach(el =>
        el.classList.toggle('d-none', !on));
}