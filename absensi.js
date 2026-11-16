// ============================================================
// KONFIGURASI
// ============================================================
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// ============================================================
// BACA DATA SIJAB (localStorage - 1 origin dengan SIJAB utama)
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

// ============================================================
// DATA ABSENSI (key terpisah, tidak menabrak SIJAB)
// ============================================================
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
        : '<option value="">⚠️ Belum ada guru di SIJAB. Buka SIJAB dulu dan input Data Master Guru.</option>';

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
            <td><button class="btn-danger btn-sm" onclick="deleteUser('${u.username}')">Hapus</button></td>
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
// GURU
// ============================================================
function loadGuruData() {
    const s = getSession();
    document.getElementById('guruNameDisplay').textContent = s.nama;
    document.getElementById('todayDate').textContent = getTodayName() + ', ' + getTodayDisplay();

    const data = getSijabData();
    const hariIni = getTodayName();
    const jadwalHariIni = data.jadwal
        .filter(j => j.guru === s.nip && j.hari === hariIni)
        .sort((a, b) => parseInt(a.jam) - parseInt(b.jam));

    const status = document.getElementById('jadwalStatus');
    const list = document.getElementById('scheduleList');
    const select = document.getElementById('absenJadwalSelect');

    list.innerHTML = '';
    select.innerHTML = '<option value="">-- Pilih Jadwal --</option>';

    if (jadwalHariIni.length === 0) {
        status.textContent = 'Belum ada jadwal';
        status.className = 'jadwal-status';
        list.innerHTML = '<p class="hint">Tidak ada jadwal mengajar hari ini.</p>';
        select.innerHTML = '<option value="">Tidak ada jadwal</option>';
        select.disabled = true;
    } else {
        status.textContent = `Hari ini Anda mengajar ${jadwalHariIni.length} jam`;
        status.className = 'jadwal-status ada';
        jadwalHariIni.forEach(j => {
            const m = data.mapel.find(x => x.kode === j.mapel);
            list.innerHTML += `<div class="schedule-item">Jam ${j.jam} • ${m ? m.nama : j.mapel} • ${j.kelas}</div>`;
            select.innerHTML += `<option value="${j.id}">Jam ${j.jam} - ${j.kelas} (${m ? m.nama : j.mapel})</option>`;
        });
        select.disabled = false;
    }
    renderRiwayatGuru();
}

function renderRiwayatGuru() {
    const s = getSession();
    const rows = getAbsensi().filter(r => r.nip === s.nip).reverse();
    document.getElementById('riwayatGuru').innerHTML = rows.length ? rows.map(r => `
        <div class="riw-card">
            <div class="top"><span>${r.kelas}</span><span>Jam ${r.jam}</span></div>
            <div class="row">📅 ${r.tanggal}</div>
            <div class="row">📝 ${r.keterangan}</div>
        </div>`).join('') : '<div class="empty-state">📭 Tidak ada data</div>';
}

function previewImage(input) {
    const preview = document.getElementById('fotoPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitAbsensi() {
    const s = getSession();
    const jadwalId = document.getElementById('absenJadwalSelect').value;
    const fotoInput = document.getElementById('fotoInput');
    const keterangan = document.getElementById('ketInput').value.trim();
    const err = document.getElementById('absenError');
    const statusMsg = document.getElementById('absenStatus');
    err.textContent = '';

    if (!jadwalId) return err.textContent = '⚠️ Pilih jadwal terlebih dahulu!';
    if (!fotoInput.files[0]) return err.textContent = '⚠️ Foto selfie wajib diisi!';
    if (!keterangan) return err.textContent = '⚠️ Keterangan wajib diisi!';

    const data = getSijabData();
    const jadwal = data.jadwal.find(j => j.id == jadwalId);
    if (!jadwal) return err.textContent = '⚠️ Jadwal tidak ditemukan!';

    const sheetUrl = localStorage.getItem('sijab_sheet_url');
    statusMsg.textContent = '⏳ Mengirim data...';

    const reader = new FileReader();
    reader.onload = async function(e) {
        const fotoBase64 = e.target.result;
        const payload = {
            tanggal: getTodayISO(),
            nama: s.nama,
            nip: s.nip,
            kelas: jadwal.kelas,
            jam: jadwal.jam,
            keterangan: keterangan,
            foto: fotoBase64
        };

        // Simpan lokal
        const rows = getAbsensi();
        rows.push(payload);
        setAbsensi(rows);

        // Kirim ke Sheets
        if (sheetUrl) {
            try {
                const res = await fetch(sheetUrl, { method: 'POST', body: JSON.stringify(payload) });
                const result = await res.json();
                if (result.status === 'success') {
                    statusMsg.textContent = '✅ Absensi tersimpan & terkirim ke Sheets!';
                } else {
                    statusMsg.textContent = '⚠️ Tersimpan lokal, tapi gagal kirim: ' + result.message;
                }
            } catch (e) {
                statusMsg.textContent = '⚠️ Tersimpan lokal, tapi gagal kirim ke Sheets.';
            }
        } else {
            statusMsg.textContent = '✅ Absensi tersimpan lokal (URL Sheets belum diatur admin).';
        }

        // Reset form
        fotoInput.value = '';
        document.getElementById('fotoPreview').style.display = 'none';
        document.getElementById('ketInput').value = '';
        const select = document.getElementById('absenJadwalSelect');
        select.remove(select.selectedIndex);
        if (select.options.length <= 1) {
            select.innerHTML = '<option value="">✅ Semua jadwal sudah diabsen</option>';
            select.disabled = true;
        }
        renderRiwayatGuru();
        setTimeout(() => { statusMsg.textContent = ''; }, 4000);
    };
    reader.readAsDataURL(fotoInput.files[0]);
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
    const data = getSijabData();
    console.log('📊 Data SIJAB terbaca:', data.guru.length, 'guru,', data.jadwal.length, 'jadwal');
    route();
});
