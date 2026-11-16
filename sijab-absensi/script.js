// ============================================================
// SIJAB ABSENSI - Script (VERSI DIPERBAIKI)
// Membaca localStorage SIJAB dari domain yang sama
// ============================================================

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ---- FUNGSI UTILITAS ----
function getTodayName() {
    const days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
}

function getTodayDate() {
    const n = new Date();
    const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${n.getDate()} ${bulan[n.getMonth()]} ${n.getFullYear()}`;
}

function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}

// ---- BACA DATA SIJAB (PENTING: HARUS DI DOMAIN SAMA) ----
function getSijabData() {
    try {
        return {
            guru: JSON.parse(localStorage.getItem('guru') || '[]'),
            kelas: JSON.parse(localStorage.getItem('kelas') || '[]'),
            mapel: JSON.parse(localStorage.getItem('mapel') || '[]'),
            ruang: JSON.parse(localStorage.getItem('ruang') || '[]'),
            jadwal: JSON.parse(localStorage.getItem('jadwal') || '[]')  // ✅ DIPERBAIKI
        };
    } catch(e) {
        console.error('Gagal baca SIJAB:', e);
        return { guru:[], kelas:[], mapel:[], ruang:[], jadwal:[] };
    }
}

// ---- DATA ABSENSI TERPISAH (TIDAK MENABRAK SIJAB) ----
function getAbsensi() { return JSON.parse(localStorage.getItem('sijab_absensi') || '[]'); }
function setAbsensi(d) { localStorage.setItem('sijab_absensi', JSON.stringify(d)); }
function getUsers() { return JSON.parse(localStorage.getItem('sijab_users') || '[]'); }
function setUsers(d) { localStorage.setItem('sijab_users', JSON.stringify(d)); }

// ---- SESI ----
function setSession(s) { sessionStorage.setItem('sijab_session', JSON.stringify(s)); }
function getSession() { try { return JSON.parse(sessionStorage.getItem('sijab_session')); } catch(e) { return null; } }
function logout() { sessionStorage.removeItem('sijab_session'); location.reload(); }

// ============================================================
// LOGIN
// ============================================================
function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError');
    err.textContent = '';

    // Login Admin
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        setSession({ role: 'admin' });
        route();
        return;
    }

    // Login Guru
    const users = getUsers();
    const found = users.find(u => u.username === user && u.password === pass);
    if (found) {
        setSession({ role: 'guru', nip: found.nip, nama: found.namaGuru, username: found.username });
        route();
        return;
    }

    err.textContent = '❌ Username atau password salah!';
}

function route() {
    const s = getSession();
    document.getElementById('loginPage').style.display = s ? 'none' : 'block';
    document.getElementById('adminPage').style.display = (s && s.role === 'admin') ? 'block' : 'none';
    document.getElementById('guruPage').style.display = (s && s.role === 'guru') ? 'block' : 'none';

    if (s && s.role === 'admin') {
        loadAdminData();
        document.getElementById('sheetUrl').value = localStorage.getItem('sijab_sheet_url') || '';
    }
    if (s && s.role === 'guru') {
        loadGuruDashboard();
    }
}

// ============================================================
// ADMIN
// ============================================================
function loadAdminData() {
    renderUsers();
    renderAbsensiTable();
    fillGuruDropdown();
}

function fillGuruDropdown() {
    const gj = getSijabData().guru;
    const sel = document.getElementById('newUserGuru');
    if (gj.length === 0) {
        sel.innerHTML = '<option value="">⚠️ Belum ada guru di SIJAB</option>';
        return;
    }
    sel.innerHTML = '<option value="">-- Pilih Guru --</option>' + 
        gj.map(g => `<option value="${g.nip}">${g.nama}</option>`).join('');
}

function addUser() {
    const username = document.getElementById('newUser').value.trim();
    const password = document.getElementById('newPass').value.trim();
    const nip = document.getElementById('newUserGuru').value;

    if (!username || !password || !nip) return alert('Lengkapi semua field!');
    
    const users = getUsers();
    if (users.find(u => u.username === username)) return alert('Username sudah dipakai!');
    
    const g = getSijabData().guru.find(x => x.nip === nip);
    if (!g) return alert('Guru tidak ditemukan di SIJAB!');
    
    users.push({ username, password, nip, namaGuru: g.nama });
    setUsers(users);
    
    document.getElementById('newUser').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('newUserGuru').value = '';
    
    renderUsers();
    alert('✅ Akun guru berhasil dibuat!');
}

function deleteUser(username) {
    if (!confirm('Hapus akun ' + username + '?')) return;
    setUsers(getUsers().filter(u => u.username !== username));
    renderUsers();
}

function renderUsers() {
    const tbody = document.getElementById('tblUsers');
    const users = getUsers();
    tbody.innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.username}</strong></td>
            <td>${u.password}</td>
            <td>${u.namaGuru}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">Hapus</button></td>
        </tr>
    `).join('') || '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada akun guru</td></tr>';
}

function renderAbsensiTable() {
    const rows = getAbsensi().slice().reverse();
    document.getElementById('absensiCount').textContent = `(${rows.length} record)`;
    document.querySelector('#tblAbsensiAdmin tbody').innerHTML = rows.map(r => `
        <tr>
            <td>${r.foto ? `<img src="${r.foto}" style="width:46px;height:46px;object-fit:cover;border-radius:6px;">` : '—'}</td>
            <td>${r.tanggal}</td>
            <td>${r.nama}</td>
            <td>${r.kelas.join(', ')}</td>
            <td>${r.jadwalMasuk}</td>
            <td>${r.jadwalKeluar || '-'}</td>
            <td>${r.totalJam}</td>
            <td>${r.waktuAbsensi}</td>
            <td>${r.keterangan}</td>
            <td>${r.lokasi}</td>
        </tr>
    `).join('') || '<tr><td colspan="10" style="text-align:center;color:#999;">Belum ada data absensi</td></tr>';
}

function saveConfig() {
    const url = document.getElementById('sheetUrl').value.trim();
    if (!url) return alert('URL kosong!');
    localStorage.setItem('sijab_sheet_url', url);
    document.getElementById('configStatus').textContent = '✅ URL berhasil disimpan!';
}

// ============================================================
// GURU DASHBOARD
// ============================================================
function slotHariIni(nip) {
    const sj = getSijabData();
    const hariIni = getTodayName();
    return sj.jadwal.filter(j => j.guru === nip && j.hari === hariIni).sort((a,b) => a.jam - b.jam);
}

function loadGuruDashboard() {
    const s = getSession();
    document.getElementById('guruNameDisplay').textContent = `Halo, ${s.nama}`;
    document.getElementById('todayName').textContent = getTodayName();

    const slots = slotHariIni(s.nip);
    const status = document.getElementById('jadwalStatus');
    const btn = document.getElementById('btnMulaiAbsen');
    const list = document.getElementById('slotList');
    const select = document.getElementById('absenJadwalSelect');

    select.innerHTML = '<option value="">-- Pilih Jadwal --</option>';
    list.innerHTML = '';

    if (slots.length === 0) {
        status.textContent = 'Belum ada jadwal mengajar hari ini';
        status.className = 'jadwal-status';
        btn.disabled = true;
        btn.className = 'btn btn-block btn-absen';
    } else {
        const waktuMap = { '1':'7:30-8:10','2':'8:10-8:50','3':'8:50-9:30','4':'9:30-10:10','5':'10:20-11:00','6':'11:00-11:40','7':'11:40-12:20','8':'12:40-13:20' };
        const masuk = waktuMap[String(slots[0].jam)].split('-')[0];
        const keluar = waktuMap[String(slots[slots.length-1].jam)].split('-')[1];
        
        status.textContent = `Hari ini Anda mengajar (${slots.length} jam) — ${masuk} s/d ${keluar}`;
        status.className = 'jadwal-status ada';
        
        list.innerHTML = slots.map(j => {
            const m = getSijabData().mapel.find(x => x.kode === j.mapel);
            return `<div class="slot-item"><span>Jam ${j.jam} (${waktuMap[String(j.jam)]})</span><span>${m ? m.nama : j.mapel} • ${j.kelas}</span></div>`;
        }).join('');
        
        slots.forEach(j => {
            const m = getSijabData().mapel.find(x => x.kode === j.mapel);
            select.innerHTML += `<option value="${j.id}">Jam ${j.jam} - ${j.kelas} (${m ? m.nama : j.mapel})</option>`;
        });
        
        const sudah = getAbsensi().find(r => r.nip === s.nip && r.tanggal === getTodayISO());
        if (sudah && sudah.waktuKeluar) {
            btn.disabled = true;
            btn.textContent = '✅ Sudah Absen Penuh';
            btn.className = 'btn btn-block btn-absen enabled';
        } else if (sudah) {
            btn.disabled = false;
            btn.textContent = 'Selesai Absen (Pulang)';
            btn.className = 'btn btn-block btn-absen enabled';
        } else {
            btn.disabled = false;
            btn.textContent = 'Mulai Absen';
            btn.className = 'btn btn-block btn-absen enabled';
        }
    }
    renderRiwayatHariIni();
}

function renderRiwayatHariIni() {
    const s = getSession();
    const rows = getAbsensi().filter(r => r.nip === s.nip && r.tanggal === getTodayISO());
    document.getElementById('riwayatHariIni').innerHTML = rows.length ? rows.map(riwCard).join('')
        : '<div class="empty-state"><span class="icon">📭</span>Tidak ada data</div>';
}

function riwCard(r) {
    return `<div class="riw-card">
        <div class="top"><span>${r.kelas.join(', ')}</span><span>${r.totalJam} Jam</span></div>
        <div class="row">Masuk: ${r.waktuAbsensi} ${r.waktuKeluar ? '| Pulang: ' + r.waktuKeluar : '| (belum pulang)'}</div>
        <div class="row">Keterangan: ${r.keterangan}</div>
        <div class="row">📍 ${r.lokasi}</div>
        ${r.foto ? `<img src="${r.foto}" style="max-height:120px;margin-top:8px;border-radius:8px;">` : ''}
    </div>`;
}

// ---- Modal Absen ----
function openAbsenModal() {
    const s = getSession();
    const slots = slotHariIni(s.nip);
    if (slots.length === 0) return alert('Tidak ada jadwal hari ini.');
    
    const sudah = getAbsensi().find(r => r.nip === s.nip && r.tanggal === getTodayISO());
    if (sudah && sudah.waktuKeluar) return alert('Absensi hari ini sudah lengkap.');

    document.getElementById('modalTitle').textContent = sudah ? '🕒 Absen Pulang' : '📸 Absensi Mengajar';
    document.getElementById('modalInfo').textContent = `${getTodayName()} • ${slots.length} jam`;
    document.getElementById('btnSimpanAbsen').textContent = sudah ? '💾 Simpan Pulang' : '💾 Simpan Absen';
    document.getElementById('modalError').textContent = '';
    document.getElementById('ketInput').value = sudah ? sudah.keterangan : '';
    document.getElementById('fotoInput').style.display = sudah ? 'none' : 'block';
    document.getElementById('fotoPreview').style.display = sudah ? 'block' : 'none';
    if (sudah) document.getElementById('fotoPreview').src = sudah.foto;
    
    currentFoto = '';
    ambilLokasi();
    document.getElementById('absenModal').style.display = 'flex';
}

function closeAbsenModal() {
    document.getElementById('absenModal').style.display = 'none';
}

let currentFoto = '';
function previewFoto(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
        currentFoto = ev.target.result;
        const img = document.getElementById('fotoPreview');
        img.src = currentFoto;
        img.style.display = 'block';
    };
    reader.readAsDataURL(f);
}

function ambilLokasi() {
    const box = document.getElementById('lokasiText');
    if (!navigator.geolocation) { box.textContent = 'GPS tidak didukung'; return; }
    navigator.geolocation.getCurrentPosition(
        pos => { box.textContent = `📍 ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`; },
        () => { box.textContent = '📍 Lokasi tidak tersedia'; },
        { timeout: 8000 }
    );
}

function simpanAbsen() {
    const s = getSession();
    const slots = slotHariIni(s.nip);
    const ket = document.getElementById('ketInput').value.trim();
    const lokasi = document.getElementById('lokasiText').textContent.replace('📍 ', '');
    const now = new Date();
    const waktu = `${getTodayISO()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    const err = document.getElementById('modalError');

    const rows = getAbsensi();
    const sudah = rows.find(r => r.nip === s.nip && r.tanggal === getTodayISO());

    if (sudah) {
        sudah.waktuKeluar = waktu;
        setAbsensi(rows);
        closeAbsenModal();
        loadGuruDashboard();
        alert('✅ Absen pulang tersimpan!');
        return;
    }

    if (!currentFoto) { err.textContent = '⚠️ Wajib foto selfie!'; return; }
    if (!ket) { err.textContent = '⚠️ Keterangan wajib diisi!'; return; }

    rows.push({
        id: Date.now(),
        nip: s.nip,
        nama: s.nama,
        tanggal: getTodayISO(),
        hari: getTodayName(),
        kelas: [...new Set(slots.map(j => j.kelas))],
        jamList: slots.map(j => j.jam),
        jadwalMasuk: '7:30',
        jadwalKeluar: '13:20',
        totalJam: slots.length,
        waktuAbsensi: waktu,
        waktuKeluar: null,
        foto: currentFoto,
        keterangan: ket,
        lokasi,
        synced: false
    });
    setAbsensi(rows);
    closeAbsenModal();
    loadGuruDashboard();
    alert('✅ Absensi tersimpan!');
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', route);
window.addEventListener('storage', () => {
    if (getSession()?.role === 'guru') loadGuruDashboard();
});
