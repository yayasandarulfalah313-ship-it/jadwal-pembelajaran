// ========== DATA STORE & CONFIG ==========
const waktuMap = { '1':'7:30-8:10','2':'8:10-8:50','3':'8:50-9:30','4':'9:30-10:10','5':'10:20-11:00','6':'11:00-11:40','7':'11:40-12:20','8':'12:40-13:20' };
const hariList = ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Ahad'];
const tingkatanList = ['SMP', 'MTs', 'MA'];

let data = {
    guru: JSON.parse(localStorage.getItem('guru') || '[]'),
    kelas: JSON.parse(localStorage.getItem('kelas') || '[]'),
    mapel: JSON.parse(localStorage.getItem('mapel') || '[]'),
    ruang: JSON.parse(localStorage.getItem('ruang') || '[]'),
    jadwal: JSON.parse(localStorage.getItem('jadwal') || '[]')
};
let logoSettings = JSON.parse(localStorage.getItem('logoSettings') || '{"src":"","size":100}');

let currentCetakMode = 'guru'; 

function save() { Object.keys(data).forEach(k => localStorage.setItem(k, JSON.stringify(data[k]))); updateStats(); }

function hexToRgba(hex, a) {
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
}

function getTingkatanKelas(namaKelas) {
    const k = data.kelas.find(x => x.nama === namaKelas);
    return k ? k.tingkatan : '';
}

// ========== LOGO FUNCTIONS ==========
function uploadLogo(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { logoSettings.src = ev.target.result; localStorage.setItem('logoSettings', JSON.stringify(logoSettings)); applyLogo(); alert('✅ Logo berhasil diupload!'); };
    reader.readAsDataURL(file);
}
function hapusLogo() { if (confirm('Hapus logo?')) { logoSettings.src = ''; localStorage.setItem('logoSettings', JSON.stringify(logoSettings)); applyLogo(); } }
function saveLogoSettings() { logoSettings.size = parseInt(document.getElementById('logoSize').value) || 100; localStorage.setItem('logoSettings', JSON.stringify(logoSettings)); applyLogo(); }

function applyLogo() {
    const hasLogo = logoSettings.src && logoSettings.src.length > 10;
    const preview = document.getElementById('logoPreview'), placeholder = document.getElementById('logoPlaceholder'), btnHapus = document.getElementById('btnHapusLogo');
    if (hasLogo) { preview.src = logoSettings.src; preview.style.display = 'block'; placeholder.style.display = 'none'; btnHapus.style.display = 'inline-block'; }
    else { preview.style.display = 'none'; placeholder.style.display = 'block'; btnHapus.style.display = 'none'; }
    
    const sidebarLogo = document.getElementById('sidebarLogo');
    if (hasLogo) { sidebarLogo.src = logoSettings.src; sidebarLogo.style.display = 'block'; } else { sidebarLogo.style.display = 'none'; }
    
    const pdfLogo = document.getElementById('pdfLogo');
    const logoPlaceholderPDF = document.getElementById('logoPlaceholderPDF');
    if (hasLogo) { 
        pdfLogo.src = logoSettings.src; pdfLogo.style.display = 'block'; 
        pdfLogo.style.width = logoSettings.size+'px'; pdfLogo.style.height = logoSettings.size+'px';
        logoPlaceholderPDF.style.display = 'none';
    } else { 
        pdfLogo.style.display = 'none';
        logoPlaceholderPDF.style.display = 'block';
        logoPlaceholderPDF.style.width = logoSettings.size+'px';
        logoPlaceholderPDF.style.height = logoSettings.size+'px';
    }
    document.getElementById('logoSize').value = logoSettings.size;
}

// ========== NAVIGATION ==========
function showPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.menu li').forEach(m => m.classList.remove('active'));
    el.classList.add('active');
    const titles = {dashboard:'📊 Dashboard', master:'🗂️ Data Master', input:'✏️ Input Jadwal', view:'👁️ Lihat Jadwal', matrix:'📅 Matriks Jadwal', cetak:'🖨️ Cetak Roster PDF', logo:'🏷️ Logo & Kop', settings:'⚙️ Pengaturan'};
    document.getElementById('pageTitle').innerText = titles[id];
    if (id === 'view') initView();
    if (id === 'matrix') initMatrix();
    if (id === 'input' || id === 'cetak') refreshDropdowns();
    if (id === 'logo') applyLogo();
}
function showTab(id, el) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
}
function showTabCetak(id, el) {
    document.querySelectorAll('.tab-content-cetak').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('#cetak .tabs .tab').forEach(t => t.classList.remove('active')); // Fixed selector
    el.classList.add('active');
    currentCetakMode = id === 'cetakGuru' ? 'guru' : 'kelas';
    
    // Reset preview dan tombol
    document.getElementById('tabelRosterCetak').innerHTML = '';
    document.getElementById('btnDownloadGuru').disabled = true;
    document.getElementById('btnDownloadKelas').disabled = true;
    
    // Reset teks PDF ke default agar tidak tertukar
    document.getElementById('pdfJudul').innerText = 'GURU PON-PES DDI MATTOANGING';
    document.getElementById('pdfFooterText').innerText = 'ROSTER GURU PON-PES DDI MATTOANGING TAHUN PELAJARAN 2026-2027';
    document.getElementById('pdfTeacherLine').innerHTML = 'Teacher: <span style="text-decoration: underline; font-weight: bold;">...................................................</span>';
}

// ========== MASTER: MAPEL ==========
function tambahMapel() {
    const kode = document.getElementById('mapelKode').value.trim(), nama = document.getElementById('mapelNama').value.trim(), warna = document.getElementById('mapelWarna').value;
    if (!kode || !nama) return alert('Lengkapi data mapel!');
    if (data.mapel.find(m => m.kode === kode)) return alert('Kode mapel sudah ada!');
    data.mapel.push({kode, nama, warna}); save(); renderMapel(); refreshDropdowns();
    document.getElementById('mapelKode').value = ''; document.getElementById('mapelNama').value = '';
}
function renderMapel() {
    document.getElementById('tblMapel').innerHTML = data.mapel.map((m,i) => `
        <tr><td><strong>${m.kode}</strong></td><td>${m.nama}</td>
        <td><span style="display:inline-block;width:30px;height:20px;background:${m.warna};border-radius:4px;vertical-align:middle;"></span> ${m.warna}</td>
        <td><button class="btn btn-danger btn-sm" onclick="hapusMapel(${i})">Hapus</button></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada data</td></tr>';
}
function hapusMapel(i) { if(confirm('Hapus?')){data.mapel.splice(i,1); save(); renderMapel(); refreshDropdowns();} }

// ========== MASTER: GURU ==========
function tambahGuru() {
    const nip = document.getElementById('guruNip').value.trim(), nama = document.getElementById('guruNama').value.trim();
    const mapel = Array.from(document.getElementById('guruMapel').selectedOptions).map(o => o.value);
    if (!nip || !nama) return alert('Lengkapi NIP dan Nama!');
    if (mapel.length === 0) return alert('Pilih minimal 1 Mapel!');
    if (data.guru.find(g => g.nip === nip)) return alert('NIP sudah terdaftar!');
    data.guru.push({nip, nama, mapel}); save(); renderGuru(); refreshDropdowns(); resetFormGuru();
}
function editGuru(nip) {
    const guru = data.guru.find(g => g.nip === nip); if (!guru) return;
    document.getElementById('guruNip').value = guru.nip; document.getElementById('guruNip').readOnly = true;
    document.getElementById('guruNama').value = guru.nama; document.getElementById('formGuruTitle').innerText = 'Edit Data Guru';
    const mapelSelect = document.getElementById('guruMapel');
    const mapelList = Array.isArray(guru.mapel) ? guru.mapel : [guru.mapel];
    Array.from(mapelSelect.options).forEach(o => o.selected = false);
    mapelList.forEach(kode => { const o = mapelSelect.querySelector(`option[value="${kode}"]`); if (o) o.selected = true; });
    const btn = document.getElementById('btnSimpanGuru');
    btn.innerText = '💾 Simpan Perubahan'; btn.className = 'btn btn-primary'; btn.setAttribute('onclick','updateGuru()');
    document.getElementById('btnBatalGuru').style.display = 'inline-block';
}
function updateGuru() {
    const nip = document.getElementById('guruNip').value.trim(), nama = document.getElementById('guruNama').value.trim();
    const mapel = Array.from(document.getElementById('guruMapel').selectedOptions).map(o => o.value);
    if (!nip || !nama) return alert('Lengkapi data!');
    if (mapel.length === 0) return alert('Pilih minimal 1 Mapel!');
    const idx = data.guru.findIndex(g => g.nip === nip);
    if (idx !== -1) { data.guru[idx] = {nip, nama, mapel}; save(); renderGuru(); refreshDropdowns(); resetFormGuru(); alert('✅ Diperbarui!'); }
}
function resetFormGuru() {
    document.getElementById('guruNip').value = ''; document.getElementById('guruNip').readOnly = false;
    document.getElementById('guruNama').value = ''; document.getElementById('guruMapel').selectedIndex = -1;
    document.getElementById('formGuruTitle').innerText = 'Tambah Guru';
    const btn = document.getElementById('btnSimpanGuru');
    btn.innerText = '+ Tambah Guru'; btn.className = 'btn btn-success'; btn.setAttribute('onclick','tambahGuru()');
    document.getElementById('btnBatalGuru').style.display = 'none';
}
function renderGuru() {
    document.getElementById('tblGuru').innerHTML = data.guru.map((g,i) => {
        const mapelList = Array.isArray(g.mapel) ? g.mapel : [g.mapel];
        const badges = mapelList.map(kode => { const m = data.mapel.find(x => x.kode === kode); return `<span class="badge" style="background:${m?m.warna:'#999'}">${m?m.nama:kode}</span>`; }).join('');
        return `<tr><td>${g.nip}</td><td><strong>${g.nama}</strong></td><td>${badges}</td>
        <td><button class="btn btn-primary btn-sm" onclick="editGuru('${g.nip}')">✏️ Edit</button> <button class="btn btn-danger btn-sm" onclick="hapusGuru(${i})">🗑️ Hapus</button></td></tr>`;
    }).join('') || '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada data</td></tr>';
}
function hapusGuru(i) { if(confirm('Hapus?')){data.guru.splice(i,1); save(); renderGuru(); refreshDropdowns();} }

// ========== MASTER: KELAS ==========
function tambahKelas() {
    const tingkatan = document.getElementById('kelasTingkatan').value;
    const nama = document.getElementById('kelasNama').value.trim();
    const wali = document.getElementById('kelasWali').value;
    const kap = document.getElementById('kelasKap').value;
    if (!nama || !wali) return alert('Lengkapi data kelas!');
    if (data.kelas.find(k => k.nama === nama)) return alert('Nama kelas sudah ada!');
    data.kelas.push({nama, wali, kap, tingkatan}); save(); renderKelas(); refreshDropdowns();
    document.getElementById('kelasNama').value = ''; document.getElementById('kelasKap').value = '';
}
function renderKelas() {
    document.getElementById('tblKelas').innerHTML = data.kelas.map((k,i) => { 
        const g = data.guru.find(x => x.nip === k.wali); 
        return `<tr><td><span class="badge badge-tingkatan">${k.tingkatan || '-'}</span></td><td><strong>${k.nama}</strong></td><td>${g?g.nama:'-'}</td><td>${k.kap||'-'} siswa</td><td><button class="btn btn-danger btn-sm" onclick="hapusKelas(${i})">Hapus</button></td></tr>`; 
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#999;">Belum ada data</td></tr>';
}
function hapusKelas(i) { if(confirm('Hapus?')){data.kelas.splice(i,1); save(); renderKelas(); refreshDropdowns();} }

function tambahRuang() {
    const kode = document.getElementById('ruangKode').value.trim(), nama = document.getElementById('ruangNama').value.trim(), kap = document.getElementById('ruangKap').value;
    if (!kode || !nama) return alert('Lengkapi data!');
    if (data.ruang.find(r => r.kode === kode)) return alert('Kode sudah ada!');
    data.ruang.push({kode, nama, kap}); save(); renderRuang(); refreshDropdowns();
    document.getElementById('ruangKode').value = ''; document.getElementById('ruangNama').value = ''; document.getElementById('ruangKap').value = '';
}
function renderRuang() {
    document.getElementById('tblRuang').innerHTML = data.ruang.map((r,i) => `<tr><td><strong>${r.kode}</strong></td><td>${r.nama}</td><td>${r.kap||'-'} orang</td><td><button class="btn btn-danger btn-sm" onclick="hapusRuang(${i})">Hapus</button></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada data</td></tr>';
}
function hapusRuang(i) { if(confirm('Hapus?')){data.ruang.splice(i,1); save(); renderRuang(); refreshDropdowns();} }

// ========== DROPDOWN REFRESH ==========
function refreshDropdowns() {
    document.getElementById('guruMapel').innerHTML = data.mapel.map(m => `<option value="${m.kode}">${m.nama}</option>`).join('');
    document.getElementById('kelasWali').innerHTML = '<option value="">-- Pilih Wali --</option>' + data.guru.map(g => `<option value="${g.nip}">${g.nama}</option>`).join('');
    document.getElementById('jGuru').innerHTML = '<option value="">-- Pilih Guru --</option>' + data.guru.map(g => `<option value="${g.nip}">${g.nama}</option>`).join('');
    document.getElementById('jMapel').innerHTML = '<option value="">-- Pilih Mapel --</option>' + data.mapel.map(m => `<option value="${m.kode}">${m.nama}</option>`).join('');
    document.getElementById('jRuang').innerHTML = '<option value="">-- Pilih Ruangan --</option>' + data.ruang.map(r => `<option value="${r.kode}">${r.nama}</option>`).join('');
    
    filterInputByTingkatan();
    document.getElementById('cetakGuruSelect').innerHTML = '<option value="">-- Pilih Guru --</option>' + data.guru.map(g => `<option value="${g.nip}">${g.nama}</option>`).join('');
    filterKelasCetak();
}

function filterInputByTingkatan() {
    const tingkatan = document.getElementById('jTingkatan').value;
    let filteredKelas = data.kelas;
    if (tingkatan) filteredKelas = data.kelas.filter(k => k.tingkatan === tingkatan);
    document.getElementById('jKelas').innerHTML = '<option value="">-- Pilih Kelas --</option>' + filteredKelas.map(k => `<option value="${k.nama}">${k.nama} (${k.tingkatan})</option>`).join('');
}

function filterKelasCetak() {
    const tingkatan = document.getElementById('cetakTingkatanKelas').value;
    let filteredKelas = data.kelas;
    if (tingkatan) filteredKelas = data.kelas.filter(k => k.tingkatan === tingkatan);
    document.getElementById('cetakKelasSelect').innerHTML = '<option value="">-- Pilih Kelas --</option>' + filteredKelas.map(k => `<option value="${k.nama}">${k.nama} (${k.tingkatan})</option>`).join('');
}

// ========== JADWAL ==========
function tambahJadwal() {
    const guru = document.getElementById('jGuru').value, mapel = document.getElementById('jMapel').value, kelas = document.getElementById('jKelas').value, ruang = document.getElementById('jRuang').value, hari = document.getElementById('jHari').value;
    const jams = Array.from(document.getElementById('jJam').selectedOptions).map(o => o.value);
    const status = document.getElementById('inputStatus');
    if (!guru || !mapel || !kelas || !ruang) { status.innerHTML = '<div class="alert alert-danger">⚠️ Lengkapi semua field!</div>'; return; }
    if (jams.length === 0) { status.innerHTML = '<div class="alert alert-danger">⚠️ Pilih minimal 1 Jam!</div>'; return; }
    jams.sort((a,b) => parseInt(a)-parseInt(b));
    for (let jam of jams) {
        if (data.jadwal.find(j => j.guru === guru && j.hari === hari && j.jam === jam)) { status.innerHTML = `<div class="alert alert-danger">🚫 BENTROK GURU! Sudah mengajar ${hari} jam ${jam}.</div>`; return; }
        if (data.jadwal.find(j => j.kelas === kelas && j.hari === hari && j.jam === jam)) { status.innerHTML = `<div class="alert alert-danger">🚫 BENTROK KELAS! ${kelas} sudah ada jadwal ${hari} jam ${jam}.</div>`; return; }
        if (data.jadwal.find(j => j.ruang === ruang && j.hari === hari && j.jam === jam)) { status.innerHTML = `<div class="alert alert-danger">🚫 BENTROK RUANGAN! ${ruang} sudah dipakai ${hari} jam ${jam}.</div>`; return; }
    }
    const baseId = Date.now();
    for (let i = 0; i < jams.length; i++) data.jadwal.push({guru, mapel, kelas, ruang, hari, jam: jams[i], id: baseId + i});
    save(); renderJadwal();
    status.innerHTML = `<div class="alert alert-success">✅ Jadwal disimpan untuk Jam ke-${jams.join(' dan ')} tanpa bentrok!</div>`;
    resetFormJadwal();
}
function resetFormJadwal() {
    ['jGuru','jMapel','jKelas','jRuang','jTingkatan'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('jJam').selectedIndex = -1; document.getElementById('inputStatus').innerHTML = '';
}
function renderJadwal() {
    const sorted = [...data.jadwal].sort((a,b) => hariList.indexOf(a.hari)-hariList.indexOf(b.hari) || a.jam-b.jam);
    document.getElementById('tblJadwal').innerHTML = sorted.map(j => {
        const g = data.guru.find(x => x.nip === j.guru), m = data.mapel.find(x => x.kode === j.mapel);
        const tingkatan = getTingkatanKelas(j.kelas);
        return `<tr><td><strong>${j.hari}</strong></td><td>${j.jam} (${waktuMap[j.jam]})</td><td><span class="badge badge-tingkatan">${tingkatan}</span></td><td>${j.kelas}</td>
        <td><span class="badge" style="background:${m?m.warna:'#ccc'}">${m?m.nama:j.mapel}</span></td>
        <td>${g?g.nama:'-'}</td><td>${j.ruang}</td><td><span class="badge badge-success">✓ Valid</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="hapusJadwal(${j.id})">Hapus</button></td></tr>`;
    }).join('') || '<tr><td colspan="9" style="text-align:center;color:#999;">Belum ada jadwal</td></tr>';
}
function hapusJadwal(id) { if(confirm('Hapus?')){data.jadwal = data.jadwal.filter(j => j.id !== id); save(); renderJadwal();} }

// ========== LIHAT JADWAL ==========
function initView() {
    const mode = document.getElementById('viewMode').value, sel = document.getElementById('viewSelect');
    if (mode === 'kelas') sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + data.kelas.map(k => `<option value="${k.nama}">${k.nama} (${k.tingkatan})</option>`).join('');
    if (mode === 'guru') sel.innerHTML = '<option value="">-- Pilih Guru --</option>' + data.guru.map(g => `<option value="${g.nip}">${g.nama}</option>`).join('');
    if (mode === 'ruang') sel.innerHTML = '<option value="">-- Pilih Ruangan --</option>' + data.ruang.map(r => `<option value="${r.kode}">${r.nama}</option>`).join('');
    renderView();
}
function renderView() {
    const mode = document.getElementById('viewMode').value, val = document.getElementById('viewSelect').value;
    if (!val) { document.getElementById('viewResult').innerHTML = ''; return; }
    let filtered = [], title = '';
    if (mode === 'kelas') { filtered = data.jadwal.filter(j => j.kelas === val); const k = data.kelas.find(x=>x.nama===val); title = `Jadwal Kelas: ${val} (${k?k.tingkatan:''})`; }
    if (mode === 'guru') { filtered = data.jadwal.filter(j => j.guru === val); const g = data.guru.find(x=>x.nip===val); title = `Jadwal Mengajar: ${g?g.nama:val}`; }
    if (mode === 'ruang') { filtered = data.jadwal.filter(j => j.ruang === val); title = `Jadwal Ruangan: ${val}`; }
    filtered.sort((a,b) => hariList.indexOf(a.hari)-hariList.indexOf(b.hari) || a.jam-b.jam);
    let html = `<h3 style="color:#1e3c72;">${title}</h3><table><thead><tr><th>Hari</th><th>Jam</th><th>Kelas</th><th>Mapel</th><th>Guru</th><th>Ruangan</th></tr></thead><tbody>`;
    if (filtered.length === 0) html += '<tr><td colspan="6" style="text-align:center;color:#999;">Tidak ada jadwal</td></tr>';
    filtered.forEach(j => { const g = data.guru.find(x => x.nip === j.guru), m = data.mapel.find(x => x.kode === j.mapel); html += `<tr><td><strong>${j.hari}</strong></td><td>${j.jam} (${waktuMap[j.jam]})</td><td>${j.kelas}</td><td><span class="badge" style="background:${m?m.warna:'#ccc'}">${m?m.nama:j.mapel}</span></td><td>${g?g.nama:'-'}</td><td>${j.ruang}</td></tr>`; });
    html += '</tbody></table>';
    document.getElementById('viewResult').innerHTML = html;
}

// ========== MATRIKS ==========
function initMatrix() {
    const mode = document.getElementById('matrixMode').value, sel = document.getElementById('matrixSelect');
    if (mode === 'kelas') sel.innerHTML = '<option value="">-- Pilih Kelas --</option>' + data.kelas.map(k => `<option value="${k.nama}">${k.nama} (${k.tingkatan})</option>`).join('');
    else sel.innerHTML = '<option value="">-- Pilih Guru --</option>' + data.guru.map(g => `<option value="${g.nip}">${g.nama}</option>`).join('');
    renderMatrix();
}
function renderMatrix() {
    const mode = document.getElementById('matrixMode').value, val = document.getElementById('matrixSelect').value;
    if (!val) { document.getElementById('matrixResult').innerHTML = '<div class="alert alert-info">Silakan pilih ' + (mode==='kelas'?'kelas':'guru') + '.</div>'; return; }
    const jam = [1,2,3,4,5,6,7,8];
    let filtered = [], title = '';
    if (mode === 'kelas') { filtered = data.jadwal.filter(j => j.kelas === val); const k = data.kelas.find(x=>x.nama===val); title = `Matriks Jadwal Kelas: ${val} (${k?k.tingkatan:''})`; }
    else { filtered = data.jadwal.filter(j => j.guru === val); const guru = data.guru.find(g => g.nip === val); title = `Matriks Jadwal Mengajar: ${guru?guru.nama:val}`; }
    let html = `<h3 style="color:#1e3c72; margin-bottom:15px;">${title}</h3><table class="matrix-table" style="border-collapse:collapse; width:100%;"><thead><tr style="background:#1e3c72; color:white;"><th>Jam / Hari</th>`;
    hariList.forEach(h => html += `<th style="padding:10px;">${h}</th>`);
    html += '</tr></thead><tbody>';
    jam.forEach(j => {
        html += `<tr style="background:#f0f2f5;"><th style="padding:8px; text-align:left;">Jam ${j}<br><small>${waktuMap[j]}</small></th>`;
        hariList.forEach(h => {
            const cell = filtered.find(x => x.hari === h && parseInt(x.jam) === j);
            if (cell) {
                const m = data.mapel.find(x => x.kode === cell.mapel), g = data.guru.find(x => x.nip === cell.guru);
                let label = mode === 'kelas' ? `<strong>${m?m.nama:cell.mapel}</strong><br><small style="color:#666;">${g?g.nama:''}</small>` : `<strong>${cell.kelas}</strong><br><small style="color:#666;">${m?m.nama:cell.mapel}</small>`;
                html += `<td style="padding:8px; background:${m?hexToRgba(m.warna,0.15):'#e3f2fd'}; color:${m?m.warna:'#1565c0'}; border:1px solid #ddd; vertical-align:top; font-size:11px;">${label}</td>`;
            } else html += '<td style="padding:8px; border:1px solid #ddd; text-align:center; color:#ccc;">-</td>';
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    document.getElementById('matrixResult').innerHTML = html;
}

// ========== CETAK ROSTER PDF (DIPERBAIKI) ==========
function previewRoster() {
    const nip = document.getElementById('cetakGuruSelect').value;
    const btn = document.getElementById('btnDownloadGuru'), tabel = document.getElementById('tabelRosterCetak');
    if (!nip) { tabel.innerHTML = ''; btn.disabled = true; return; }
    
    const guru = data.guru.find(g => g.nip === nip);
    if (!guru) { alert('❌ Data guru tidak ditemukan!'); btn.disabled = true; return; }
    
    btn.disabled = false;
    document.getElementById('pdfJudul').innerText = `GURU PON-PES DDI MATTOANGING`;
    document.getElementById('pdfFooterText').innerText = `ROSTER GURU PON-PES DDI MATTOANGING TAHUN PELAJARAN 2026-2027`;
    document.getElementById('pdfTeacherLine').innerHTML = `Teacher: <span style="text-decoration: underline; font-weight: bold;">${guru.nama}</span>`;
    
    const now = new Date();
    document.getElementById('tglCetak').innerText = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    
    const jadwalGuru = data.jadwal.filter(j => j.guru === nip);
    const seen = new Set();
    const uniqueJadwal = jadwalGuru.filter(j => {
        const key = `${j.hari}-${j.jam}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a,b) => hariList.indexOf(a.hari)-hariList.indexOf(b.hari) || a.jam-b.jam);
    
    let html = '<thead><tr><th class="hari-col">Hari</th>';
    for (let i = 1; i <= 8; i++) html += `<th class="jam-header">${i}<br>${waktuMap[i]}</th>`;
    html += '</tr></thead><tbody>';
    
    hariList.forEach(hari => {
        html += `<tr><td class="hari-col">${hari}</td>`;
        for (let j = 1; j <= 8; j++) {
            const cell = uniqueJadwal.find(x => x.hari === hari && parseInt(x.jam) === j);
            if (cell) {
                const m = data.mapel.find(x => x.kode === cell.mapel);
                const k = data.kelas.find(x => x.nama === cell.kelas);
                const bg = m ? hexToRgba(m.warna, 0.18) : 'rgba(33,150,243,0.15)';
                const fg = m ? m.warna : '#1565c0';
                html += `<td class="filled" style="background:${bg};">
                    <div class="cell-mapel" style="color:${fg};">${m?m.nama:cell.mapel}</div>
                    <div class="cell-kelas">${k?k.nama:cell.kelas}</div>
                </td>`;
            } else html += '<td></td>';
        }
        html += '</tr>';
    });
    html += '</tbody>';
    tabel.innerHTML = html;

    if (uniqueJadwal.length === 0) {
        alert(`⚠️ Belum ada jadwal untuk guru ${guru.nama}. Silakan input jadwal terlebih dahulu.`);
    }
}

function previewRosterKelas() {
    const namaKelas = document.getElementById('cetakKelasSelect').value;
    const btn = document.getElementById('btnDownloadKelas'), tabel = document.getElementById('tabelRosterCetak');
    if (!namaKelas) { tabel.innerHTML = ''; btn.disabled = true; return; }
    
    const kelas = data.kelas.find(k => k.nama === namaKelas);
    if (!kelas) { alert('❌ Data kelas tidak ditemukan!'); btn.disabled = true; return; }
    
    btn.disabled = false;
    const tingkatan = kelas.tingkatan || '';
    document.getElementById('pdfJudul').innerText = `JADWAL KELAS ${namaKelas} (${tingkatan}) PON-PES DDI MATTOANGING`;
    document.getElementById('pdfFooterText').innerText = `JADWAL KELAS ${namaKelas} (${tingkatan}) PON-PES DDI MATTOANGING TAHUN PELAJARAN 2026-2027`;
    
    const waliNama = kelas.wali ? (data.guru.find(g => g.nip === kelas.wali)?.nama || '-') : '-';
    document.getElementById('pdfTeacherLine').innerHTML = `Wali Kelas: <span style="text-decoration: underline; font-weight: bold;">${waliNama}</span>`;
    
    const now = new Date();
    document.getElementById('tglCetak').innerText = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    
    const jadwalKelas = data.jadwal.filter(j => j.kelas === namaKelas);
    const seen = new Set();
    const uniqueJadwal = jadwalKelas.filter(j => {
        const key = `${j.hari}-${j.jam}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).sort((a,b) => hariList.indexOf(a.hari)-hariList.indexOf(b.hari) || a.jam-b.jam);
    
    let html = '<thead><tr><th class="hari-col">Hari</th>';
    for (let i = 1; i <= 8; i++) html += `<th class="jam-header">${i}<br>${waktuMap[i]}</th>`;
    html += '</tr></thead><tbody>';
    
    hariList.forEach(hari => {
        html += `<tr><td class="hari-col">${hari}</td>`;
        for (let j = 1; j <= 8; j++) {
            const cell = uniqueJadwal.find(x => x.hari === hari && parseInt(x.jam) === j);
            if (cell) {
                const m = data.mapel.find(x => x.kode === cell.mapel);
                const g = data.guru.find(x => x.nip === cell.guru);
                const bg = m ? hexToRgba(m.warna, 0.18) : 'rgba(33,150,243,0.15)';
                const fg = m ? m.warna : '#1565c0';
                html += `<td class="filled" style="background:${bg};">
                    <div class="cell-mapel" style="color:${fg};">${m?m.nama:cell.mapel}</div>
                    <div class="cell-guru">${g?g.nama:'-'}</div>
                </td>`;
            } else html += '<td></td>';
        }
        html += '</tr>';
    });
    html += '</tbody>';
    tabel.innerHTML = html;

    if (uniqueJadwal.length === 0) {
        alert(`⚠️ Belum ada jadwal untuk kelas ${namaKelas}. Silakan input jadwal terlebih dahulu di menu Input Jadwal.`);
    }
}

function downloadPDF(mode) {
    const tabel = document.getElementById('tabelRosterCetak');
    
    // Validasi: Pastikan tabel tidak kosong (minimal ada header + 1 baris data)
    if (!tabel || tabel.rows.length <= 1) {
        alert('⚠️ Tabel jadwal masih kosong! Pastikan Anda sudah memilih data dan memiliki jadwal untuk data tersebut.');
        return;
    }

    const element = document.getElementById('areaCetakPDF');
    element.style.display = 'block';
    
    let filename = '';
    if (mode === 'guru') {
        const guru = data.guru.find(g => g.nip === document.getElementById('cetakGuruSelect').value);
        if (!guru) { alert('❌ Data guru tidak ditemukan!'); element.style.display = 'none'; return; }
        filename = `Roster_Guru_${guru.nama.replace(/\s+/g,'_')}.pdf`;
    } else {
        const kelas = data.kelas.find(k => k.nama === document.getElementById('cetakKelasSelect').value);
        if (!kelas) { alert('❌ Data kelas tidak ditemukan!'); element.style.display = 'none'; return; }
        filename = `Jadwal_Kelas_${kelas.nama.replace(/\s+/g,'_')}_${kelas.tingkatan}.pdf`;
    }
    
    const opt = {
        margin: 10,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    // Tampilkan status loading
    const btnId = mode === 'guru' ? 'btnDownloadGuru' : 'btnDownloadKelas';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText;
    btn.innerText = '⏳ Memproses PDF...';
    btn.disabled = true;
    
    html2pdf().set(opt).from(element).save().then(() => { 
        element.style.display = 'none';
        btn.innerText = originalText;
        btn.disabled = false;
        console.log('✅ PDF berhasil diunduh:', filename);
    }).catch((err) => {
        console.error('❌ Error saat membuat PDF:', err);
        alert('❌ Gagal membuat PDF. Pastikan browser Anda mendukung fitur ini.');
        element.style.display = 'none';
        btn.innerText = originalText;
        btn.disabled = false;
    });
}

// ========== UTILS ==========
function updateStats() {
    document.getElementById('statGuru').innerText = data.guru.length;
    document.getElementById('statKelas').innerText = data.kelas.length;
    document.getElementById('statJadwal').innerText = data.jadwal.length;
    let bentrok = 0;
    data.jadwal.forEach((j,i) => { data.jadwal.forEach((k,idx) => { if (i!==idx && j.hari===k.hari && j.jam===k.jam) { if (j.guru===k.guru||j.kelas===k.kelas||j.ruang===k.ruang) bentrok++; } }); });
    document.getElementById('statBentrok').innerText = bentrok/2;
}
function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `sijab-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}
function importData(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { if (confirm('Import akan menimpa data. Lanjutkan?')) { data = JSON.parse(ev.target.result); save(); renderAll(); alert('✅ Data berhasil diimport!'); } } catch(err) { alert('❌ File tidak valid!'); } };
    reader.readAsText(file);
}
function resetAll() {
    if (confirm('⚠️ Semua data akan dihapus! Lanjutkan?') && confirm('Yakin?')) {
        data = {guru:[], kelas:[], mapel:[], ruang:[], jadwal:[]};
        save(); renderAll(); alert('✅ Data direset.');
    }
}
function renderAll() {
    renderGuru(); renderKelas(); renderMapel(); renderRuang(); renderJadwal();
    refreshDropdowns(); updateStats(); applyLogo();
}

const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const now = new Date();
document.getElementById('currentDate').innerText = `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;

renderAll();
