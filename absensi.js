// ============================================================
// KONFIGURASI
// ============================================================
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

const WAKTU_MAP = {
    '1': { mulai: '7:30', selesai: '8:10' },
    '2': { mulai: '8:10', selesai: '8:50' },
    '3': { mulai: '8:50', selesai: '9:30' },
    '4': { mulai: '9:30', selesai: '10:10' },
    '5': { mulai: '10:20', selesai: '11:00' },
    '6': { mulai: '11:00', selesai: '11:40' },
    '7': { mulai: '11:40', selesai: '12:20' },
    '8': { mulai: '12:40', selesai: '13:20' }
};

let currentFoto = '';
let currentLokasi = '';
let selectedJadwal = null;

// ============================================================
// BACA DATA SIJAB
// ============================================================
function getSijabData() {
    try {
        return {
            guru:   JSON.parse(localStorage.getItem('guru')   || '[]'),
            kelas:  JSON.parse(localStorage.getItem('kelas')  || '[]'),
            mapel:  JSON.parse(localStorage.getItem('mapel')  || '[]'),
            ruang:  JSON.parse(localStorage.getItem('ruang')  || '[]'),
            jadwal: JSON.parse(localStorage.getItem('jadwal') || '[]')
        };
    } catch (e) {
        console.error('Gagal baca SIJAB:', e);
        return { guru:[], kelas:[], mapel:[], ruang:[], jadwal:[] };
    }
}

function getAbsensi() { return JSON.parse(localStorage.getItem('sijab_absensi') || '[]'); }
function setAbsensi(d) { localStorage.setItem('sijab_absensi', JSON.stringify(d)); }
function getUsers() { return JSON.parse(localStorage.getItem('sijab_users') || '[]'); }
function setUsers(d) { localStorage.setItem('sijab_users', JSON.stringify(d)); }

// ============================================================
// UTILITAS TANGGAL
// ============================================================
function getTodayName() {
    return ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()];
}
function getTodayISO() { return new Date().toISOString().split('T')[0]; }
function getTodayDisplay() {
    const b = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const n = new Date();
    return `${n.getDate()} ${b[n.getMonth()]} ${n.getFullYear()}`;
}

// ============================================================
// SESI
// ============================================================
function setSession(s) { sessionStorage.setItem('sijab_session', JSON.stringify(s)); }
function getSession() { try { return JSON.parse(sessionStorage.getItem('sijab_session')); } catch(e) { return null; } }
function logout() { sessionStorage.removeItem('sijab_session'); location.reload(); }

// ============================================================
// LOGIN & ROUTING
// ============================================================
function handleLogin() {
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError');
    err.textContent = '';

    if (u === ADMIN_USER && p === ADMIN_PASS) {
        setSession({ role: 'admin' }); route(); return;
    }
    const user = getUsers().find(x => x.username === u && x.password === p);
    if (user) {
        setSession({ role: 'guru', nip: user.nip, nama: user.namaGuru, username: user.username });
        route(); return;
    }
    err.textContent = '❌ Username atau password salah!';
}

function route() {
    const s = getSession();
    document.getElementById('loginPage').style.display = s ? 'none' : 'flex';
    document.getElementById('adminPage').style.display = (s && s.role === 'admin') ? 'block' : 'none';
    document.getElementById('guruPage').style.display  = (s && s.role === 'guru')  ? 'block' : 'none';
    document.getElementById('kameraPage').style.display = 'none';
    if (s && s.role === 'admin') loadAdminData();
    if (s && s.role === 'guru')  loadGuruData();
}

// ============================================================
// ADMIN
// ============================================================
function loadAdminData() {
    const data = getSijabData();
    const sel = document.getElementById('newNipSelect');
    sel.innerHTML = data.guru.length
        ? '<option value="">-- Pilih Guru dari SIJAB --</option>' +
          data.guru.map(g => `<option value="${g.nip}">${g.nama} (${g.nip})</option>`).join('')
        : '<option value="">⚠️ Belum ada guru di SIJAB.</option>';

    document.getElementById('sheetUrl').value = localStorage.getItem('sijab_sheet_url') || '';
    renderUserTable();
    renderAbsensiTable();
}

function addUser() {
    const nip = document.getElementById('newNipSelect').value;
    const username = document.getElementById('newUser').value.trim();
    const password = document.getElementById('newPass').value.trim();
    if (!nip || !username || !password) return alert('Lengkapi semua field!');

    const users = getUsers();
    if (users.find(u => u.username === username)) return alert('Username sudah dipakai!');

    const g = getSijabData().guru.find(x => x.nip === nip);
    if (!g) return alert('Guru tidak ditemukan di SIJAB!');

    users.push({ username, password, nip, namaGuru: g.nama });
    setUsers(users);
    document.getElementById('newUser').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('newNipSelect').value = '';
    renderUserTable();
    alert('✅ Akun guru berhasil dibuat!');
}

function deleteUser(username) {
    if (!confirm('Hapus akun ' + username + '?')) return;
    setUsers(getUsers().filter(u => u.username !== username));
    renderUserTable();
}

function renderUserTable() {
    const users = getUsers();
    document.querySelector('#userTable tbody').innerHTML = users.map(u => `
        <tr>
            <td><strong>${u.username}</strong></td>
            <td>${u.password}</td>
            <td>${u.namaGuru}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteUser('${u.username}')">Hapus</button></td>
        </tr>`).join('') ||
        '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada akun guru</td></tr>';
}

function renderAbsensiTable() {
    const rows = getAbsensi().slice().reverse();
    document.getElementById('absensiCount').textContent = `(${rows.length} record)`;
    document.querySelector('#absensiTable tbody').innerHTML = rows.map(r => `
        <tr>
            <td>${r.tanggal}</td><td>${r.nama}</td><td>${r.nip}</td>
            <td>${r.kelas}</td><td>${r.jam}</td><td>${r.keterangan}</td>
        </tr>`).join('') ||
        '<tr><td colspan="6" style="text-align:center;color:#999;">Belum ada data absensi</td></tr>';
}

function saveConfig() {
    const url = document.getElementById('sheetUrl').value.trim();
    if (!url) return alert('URL kosong!');
    localStorage.setItem('sijab_sheet_url', url);
    document.getElementById('configStatus').textContent = '✅ URL berhasil disimpan!';
}

// ============================================================
// EXPORT CSV
// ============================================================
function csvEscape(v) {
    v = String(v == null ? '' : v);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}
function exportCSV1() {
    const rows = getAbsensi();
    const data = [['Tanggal','Nama Guru','NIP','Kelas','Jam Ke-','Keterangan','Foto']];
    rows.forEach(r => data.push([r.tanggal, r.nama, r.nip, r.kelas, r.jam, r.keterangan, r.foto ? 'ADA' : '']));
    downloadCSV('DATA1_Absensi.csv', data);
}
function exportCSV2() {
    const rows = getAbsensi();
    const map = {};
    rows.forEach(r => {
        if (!map[r.nip]) map[r.nip] = { nama: r.nama, total: 0, hadir: 0 };
        map[r.nip].total += 1;
        map[r.nip].hadir += 1;
    });
    const data = [['Nama','Total Jam','Tidak Hadir','Hadir']];
    Object.values(map).forEach(m => data.push([m.nama, m.total, 0, m.hadir]));
    downloadCSV('DATA2_Rekap.csv', data);
}

// ============================================================
// GURU - BERANDA
// ============================================================
function showGuruTab(tabId, el) {
    document.querySelectorAll('.guru-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.bnav').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (tabId === 'tabRiwayat') renderRiwayatSemua();
    if (tabId === 'tabProfil') renderProfil();
}

function slotHariIni(nip) {
    const sj = getSijabData();
    return sj.jadwal.filter(j => j.guru === nip && j.hari === getTodayName()).sort((a,b) => a.jam - b.jam);
}

function loadGuruData() {
    const s = getSession();
    document.getElementById('guruNameDisplay').textContent = s.nama.toUpperCase();
    document.getElementById('todayDate').textContent = getTodayDisplay();

    const slots = slotHariIni(s.nip);
    const status = document.getElementById('jadwalStatus');
    const btn = document.getElementById('btnMulaiAbsen');
    const list = document.getElementById('scheduleList');

    list.innerHTML = '';

    if (slots.length === 0) {
        status.textContent = 'Belum ada jadwal';
        status.className = 'no-jadwal';
        btn.disabled = true;
        btn.className = 'btn-absen';
    } else {
        const waktu = WAKTU_MAP[String(slots[0].jam)];
        const keluar = WAKTU_MAP[String(slots[slots.length-1].jam)];
        status.textContent = `Hari ini Anda mengajar ${slots.length} jam — ${waktu.mulai} s/d ${keluar.selesai}`;
        status.className = 'has-jadwal';

        slots.forEach(j => {
            const m = getSijabData().mapel.find(x => x.kode === j.mapel);
            list.innerHTML += `<div class="schedule-item"><span>Jam ${j.jam} (${WAKTU_MAP[String(j.jam)].mulai}-${WAKTU_MAP[String(j.jam)].selesai})</span><span>${m ? m.nama : j.mapel} • ${j.kelas}</span></div>`;
        });

        const sudah = getAbsensi().find(r => r.nip === s.nip && r.tanggal === getTodayISO());
        if (sudah && sudah.waktuKeluar) {
            btn.disabled = true;
            btn.textContent = '✅ Sudah Absen Penuh';
            btn.className = 'btn-absen enabled';
        } else if (sudah) {
            btn.disabled = false;
            btn.textContent = 'Selesai Absen (Pulang)';
            btn.className = 'btn-absen enabled';
        } else {
            btn.disabled = false;
            btn.textContent = 'Mulai Absen';
            btn.className = 'btn-absen enabled';
        }
    }
    renderRiwayatHariIni();
}

function renderRiwayatHariIni() {
    const s = getSession();
    const rows = getAbsensi().filter(r => r.nip === s.nip && r.tanggal === getTodayISO());
    document.getElementById('riwayatHariIni').innerHTML = rows.length ? rows.map(riwCard).join('')
        : `<div class="empty-state">
            <svg width="120" height="100" viewBox="0 0 120 100">
                <rect x="20" y="40" width="80" height="50" rx="5" fill="#e0e0e0"/>
                <rect x="30" y="30" width="60" height="20" rx="3" fill="#f5f5f5" stroke="#bdbdbd" stroke-width="1"/>
                <line x1="40" y1="50" x2="80" y2="50" stroke="#bdbdbd" stroke-width="2"/>
                <line x1="40" y1="60" x2="70" y2="60" stroke="#bdbdbd" stroke-width="2"/>
                <line x1="40" y1="70" x2="75" y2="70" stroke="#bdbdbd" stroke-width="2"/>
                <circle cx="90" cy="25" r="12" fill="#e0e0e0"/>
                <circle cx="85" cy="25" r="2" fill="#9e9e9e"/>
                <circle cx="90" cy="25" r="2" fill="#9e9e9e"/>
                <circle cx="95" cy="25" r="2" fill="#9e9e9e"/>
            </svg>
            <p>Tidak ada data</p>
           </div>`;
}

function riwCard(r) {
    return `<div class="riw-card">
        <div class="top"><span>${r.kelas}</span><span>Jam ${r.jam}</span></div>
        <div class="row">Masuk: ${r.waktuAbsensi} ${r.waktuKeluar ? '| Pulang: ' + r.waktuKeluar : '| (belum pulang)'}</div>
        <div class="row">Keterangan: ${r.keterangan}</div>
        ${r.foto ? `<img src="${r.foto}" style="max-height:120px;margin-top:8px;border-radius:8px;">` : ''}
    </div>`;
}

function renderRiwayatSemua() {
    const s = getSession();
    const rows = getAbsensi().filter(r => r.nip === s.nip).reverse();
    document.getElementById('riwayatSemua').innerHTML = rows.length ? rows.map(riwCard).join('')
        : `<div class="empty-state"><p>📭 Belum ada riwayat</p></div>`;
}

function renderProfil() {
    const s = getSession();
    const g = getSijabData().guru.find(x => x.nip === s.nip);
    document.getElementById('profilInfo').innerHTML = `
        <p><strong>Nama:</strong> ${s.nama}</p>
        <p><strong>NIP:</strong> ${s.nip}</p>
        <p><strong>Username:</strong> ${s.username}</p>
        <p><strong>Bidang Studi:</strong> ${g ? g.mapel.join(', ') : '-'}</p>`;
}

// ============================================================
// KAMERA ABSEN - FUNGSI BARU
// ============================================================
function mulaiAbsen() {
    const s = getSession();
    const slots = slotHariIni(s.nip);
    if (slots.length === 0) return alert('Tidak ada jadwal hari ini.');

    const sudah = getAbsensi().find(r => r.nip === s.nip && r.tanggal === getTodayISO());
    if (sudah && sudah.waktuKeluar) return alert('Absensi hari ini sudah lengkap.');

    // Simpan jadwal yang dipilih (ambil yang pertama jika belum ada)
    selectedJadwal = slots[0];
    
    // Reset form
    currentFoto = '';
    currentLokasi = '';
    document.getElementById('fotoPreview').style.display = 'none';
    document.getElementById('kameraPlaceholder').style.display = 'block';
    document.getElementById('ketInput').value = '';
    document.getElementById('syaratBox').style.display = 'none';
    document.getElementById('lokasiBox').style.display = 'none';
    document.getElementById('btnKirim').disabled = true;
    document.getElementById('btnKirim').className = 'btn-kirim';

    // Update judul
    document.getElementById('kameraTitle').textContent = sudah ? 'Absen Pulang' : 'Mulai Absen';

    // Tampilkan halaman kamera
    document.getElementById('guruPage').style.display = 'none';
    document.getElementById('kameraPage').style.display = 'block';

    // Auto-trigger kamera setelah 300ms
    setTimeout(() => {
        triggerKamera();
    }, 300);
}

function triggerKamera() {
    document.getElementById('fotoInput').click();
}

function handleFotoTaken(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        currentFoto = e.target.result;
        document.getElementById('fotoPreview').src = currentFoto;
        document.getElementById('fotoPreview').style.display = 'block';
        document.getElementById('kameraPlaceholder').style.display = 'none';

        // Tampilkan syarat & ketentuan
        document.getElementById('syaratBox').style.display = 'block';

        // Ambil lokasi
        ambilLokasi();

        // Cek apakah bisa kirim
        checkCanSubmit();
    };
    reader.readAsDataURL(file);
}

function ambilLokasi() {
    const lokasiBox = document.getElementById('lokasiBox');
    const lokasiText = document.getElementById('lokasiText');
    
    lokasiBox.style.display = 'block';
    lokasiText.textContent = '📍 Mengambil lokasi...';

    if (!navigator.geolocation) {
        lokasiText.textContent = '📍 GPS tidak didukung';
        currentLokasi = 'Lokasi tidak tersedia';
        checkCanSubmit();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            currentLokasi = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
            // Reverse geocoding sederhana (tampilkan koordinat)
            lokasiText.textContent = `📍 ${currentLokasi}`;
            checkCanSubmit();
        },
        err => {
            lokasiText.textContent = '📍 Izin lokasi ditolak';
            currentLokasi = 'Lokasi tidak tersedia';
            checkCanSubmit();
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

function checkCanSubmit() {
    const ket = document.getElementById('ketInput').value.trim();
    const btn = document.getElementById('btnKirim');
    
    if (currentFoto && ket) {
        btn.disabled = false;
        btn.className = 'btn-kirim enabled';
    } else {
        btn.disabled = true;
        btn.className = 'btn-kirim';
    }
}

// Monitor perubahan textarea
document.addEventListener('DOMContentLoaded', function() {
    const ketInput = document.getElementById('ketInput');
    if (ketInput) {
        ketInput.addEventListener('input', checkCanSubmit);
    }
});

function kembaliKeBeranda() {
    document.getElementById('kameraPage').style.display = 'none';
    document.getElementById('guruPage').style.display = 'block';
}

async function kirimAbsensi() {
    const s = getSession();
    const ket = document.getElementById('ketInput').value.trim();
    
    if (!currentFoto) return alert('Foto wajib diambil!');
    if (!ket) return alert('Keterangan wajib diisi!');
    if (!selectedJadwal) return alert('Jadwal tidak ditemukan!');

    const rows = getAbsensi();
    const sudah = rows.find(r => r.nip === s.nip && r.tanggal === getTodayISO());

    const now = new Date();
    const waktu = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

    if (sudah) {
        // Absen pulang
        sudah.waktuKeluar = waktu;
        sudah.keterangan = ket;
        sudah.foto = currentFoto;
        sudah.lokasi = currentLokasi;
        setAbsensi(rows);
        alert('✅ Absen pulang tersimpan!');
    } else {
        // Absen masuk
        const slots = slotHariIni(s.nip);
        rows.push({
            id: Date.now(),
            nip: s.nip,
            nama: s.nama,
            tanggal: getTodayISO(),
            hari: getTodayName(),
            kelas: selectedJadwal.kelas,
            jam: selectedJadwal.jam,
            mapel: selectedJadwal.mapel,
            jadwalMasuk: WAKTU_MAP[String(slots[0].jam)].mulai,
            jadwalKeluar: WAKTU_MAP[String(slots[slots.length-1].jam)].selesai,
            totalJam: slots.length,
            waktuAbsensi: waktu,
            waktuKeluar: null,
            foto: currentFoto,
            keterangan: ket,
            lokasi: currentLokasi,
            synced: false
        });
        setAbsensi(rows);
        alert('✅ Absensi masuk tersimpan!');
    }

    // Kembali ke beranda
    kembaliKeBeranda();
    loadGuruData();
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
    const data = getSijabData();
    console.log('📊 Data SIJAB terbaca:', data.guru.length, 'guru,', data.jadwal.length, 'jadwal');
    route();
});
