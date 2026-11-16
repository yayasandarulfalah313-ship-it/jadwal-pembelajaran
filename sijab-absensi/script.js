// --- KONFIGURASI ---
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123'; // Ganti password admin di sini jika mau

// --- FUNGSI UTILITAS ---
function getTodayName() {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// Membaca data dari SIJAB (Harus di domain/folder yang sama agar localStorage terbaca)
function getSijabData() {
    return {
        guru: JSON.parse(localStorage.getItem('guru') || '[]'),
        jadwal: JSON.parse(localStorage.getItem('jadwal') || '[])') // Perhatikan: SIJAB menyimpan dengan key 'jadwal'
    };
}

function getUsers() {
    return JSON.parse(localStorage.getItem('absensi_users') || '[]');
}

function saveUsers(users) {
    localStorage.setItem('absensi_users', JSON.stringify(users));
}

// --- AUTHENTICATION ---
function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const errorMsg = document.getElementById('loginError');

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('role', 'admin');
        showPage('adminPage');
        loadAdminData();
        return;
    }

    const users = getUsers();
    const foundUser = users.find(u => u.username === user && u.password === pass);

    if (foundUser) {
        sessionStorage.setItem('role', 'guru');
        sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
        showPage('guruPage');
        loadGuruData(foundUser);
    } else {
        errorMsg.textContent = 'Username atau Password salah!';
    }
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// --- ADMIN FUNCTIONS ---
function loadAdminData() {
    const users = getUsers();
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = '';
    users.forEach((u, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${u.nip}</td>
                <td>${u.username}</td>
                <td>${u.password}</td>
                <td><button class="btn-danger" onclick="deleteUser(${index})" style="padding:5px 10px; font-size:12px;">Hapus</button></td>
            </tr>
        `;
    });
    
    // Load saved sheet URL
    const savedUrl = localStorage.getItem('sheet_url');
    if (savedUrl) document.getElementById('sheetUrl').value = savedUrl;
}

function addUser() {
    const nip = document.getElementById('newNip').value.trim();
    const username = document.getElementById('newUser').value.trim();
    const password = document.getElementById('newPass').value.trim();

    if (!nip || !username || !password) return alert('Semua field harus diisi!');

    // Validasi: Apakah NIP ini ada di data SIJAB?
    const sijab = getSijabData();
    const guruExists = sijab.guru.find(g => g.nip === nip);
    
    if (!guruExists) {
        return alert('NIP tidak ditemukan di Data Master SIJAB! Pastikan Anda sudah input guru di aplikasi SIJAB.');
    }

    const users = getUsers();
    if (users.find(u => u.username === username)) return alert('Username sudah digunakan!');

    users.push({ nip, username, password, nama: guruExists.nama });
    saveUsers(users);
    
    document.getElementById('newNip').value = '';
    document.getElementById('newUser').value = '';
    document.getElementById('newPass').value = '';
    loadAdminData();
    alert('Akun guru berhasil dibuat!');
}

function deleteUser(index) {
    if (confirm('Hapus akun ini?')) {
        const users = getUsers();
        users.splice(index, 1);
        saveUsers(users);
        loadAdminData();
    }
}

function saveConfig() {
    const url = document.getElementById('sheetUrl').value.trim();
    if (!url) return alert('URL tidak boleh kosong!');
    localStorage.setItem('sheet_url', url);
    document.getElementById('configStatus').textContent = '✅ URL berhasil disimpan!';
}

// --- GURU FUNCTIONS ---
function loadGuruData(user) {
    document.getElementById('guruNameDisplay').textContent = `Halo, ${user.nama}`;
    document.getElementById('todayName').textContent = getTodayName();

    const sijab = getSijabData();
    const today = getTodayName();
    
    // Filter jadwal SIJAB untuk guru ini di hari ini
    const todaySchedule = sijab.jadwal.filter(j => j.guru === user.nip && j.hari === today);

    const scheduleList = document.getElementById('scheduleList');
    const absenSelect = document.getElementById('absenJadwalSelect');
    
    scheduleList.innerHTML = '';
    absenSelect.innerHTML = '<option value="">-- Pilih Jadwal --</option>';

    if (todaySchedule.length === 0) {
        scheduleList.innerHTML = '<p style="color:#666; text-align:center;">Tidak ada jadwal mengajar hari ini.</p>';
        absenSelect.innerHTML = '<option value="">Tidak ada jadwal</option>';
        absenSelect.disabled = true;
    } else {
        todaySchedule.forEach((j, idx) => {
            // Cari nama kelas dan mapel
            const kelas = j.kelas;
            const mapel = j.mapel;
            const jam = j.jam;
            
            scheduleList.innerHTML += `
                <div class="schedule-item">
                    <strong>Jam ke-${jam}</strong> | Kelas: ${kelas} | Mapel: ${mapel}
                </div>
            `;
            
            absenSelect.innerHTML += `<option value="${JSON.stringify(j)}">Jam ${jam} - ${kelas} (${mapel})</option>`;
        });
        absenSelect.disabled = false;
    }
}

function previewImage(input) {
    const preview = document.getElementById('fotoPreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

async function submitAbsensi() {
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    const jadwalStr = document.getElementById('absenJadwalSelect').value;
    const fotoInput = document.getElementById('fotoInput');
    const keterangan = document.getElementById('ketInput').value.trim();
    const errorMsg = document.getElementById('absenError');
    const statusMsg = document.getElementById('absenStatus');

    errorMsg.textContent = '';
    statusMsg.textContent = 'Mengirim...';

    if (!jadwalStr) return errorMsg.textContent = 'Pilih jadwal terlebih dahulu!';
    if (!fotoInput.files[0]) return errorMsg.textContent = 'Foto selfie wajib diisi!';
    if (!keterangan) return errorMsg.textContent = 'Keterangan wajib diisi!';

    const jadwal = JSON.parse(jadwalStr);
    const sheetUrl = localStorage.getItem('sheet_url');
    
    if (!sheetUrl) {
        return errorMsg.textContent = 'URL Spreadsheet belum diatur oleh Admin!';
    }

    // Baca file gambar jadi Base64
    const reader = new FileReader();
    reader.onload = async function(e) {
        const fotoBase64 = e.target.result;

        const payload = {
            tanggal: getTodayDate(),
            nama: user.nama,
            nip: user.nip,
            kelas: jadwal.kelas,
            jam: jadwal.jam,
            keterangan: keterangan,
            foto: fotoBase64
        };

        try {
            // Kirim ke Google Apps Script
            const response = await fetch(sheetUrl, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                statusMsg.textContent = '✅ Absensi berhasil dikirim ke Spreadsheet!';
                document.getElementById('fotoInput').value = '';
                document.getElementById('fotoPreview').style.display = 'none';
                document.getElementById('ketInput').value = '';
                document.getElementById('absenJadwalSelect').value = '';
                
                // Hapus opsi yang sudah diabsen agar tidak double (opsional, tapi bagus untuk UX)
                const select = document.getElementById('absenJadwalSelect');
                select.remove(select.selectedIndex);
                if(select.options.length <= 1) {
                    select.innerHTML = '<option value="">Semua jadwal hari ini sudah diabsen</option>';
                    select.disabled = true;
                }
            } else {
                errorMsg.textContent = '❌ Gagal: ' + result.message;
            }
        } catch (err) {
            errorMsg.textContent = '❌ Error koneksi. Periksa URL Apps Script atau internet Anda.';
            console.error(err);
        } finally {
            statusMsg.textContent = '';
        }
    };
    reader.readAsDataURL(fotoInput.files[0]);
}

// --- INIT ---
window.onload = function() {
    const role = sessionStorage.getItem('role');
    if (role === 'admin') {
        showPage('adminPage');
        loadAdminData();
    } else if (role === 'guru') {
        const user = JSON.parse(sessionStorage.getItem('currentUser'));
        showPage('guruPage');
        loadGuruData(user);
    } else {
        showPage('loginPage');
    }
};
