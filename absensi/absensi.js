/* ============================================================
   SIJAB ABSENSI — membaca localStorage SIJAB TANPA mengubahnya
   ============================================================ */

const waktuMap = { '1':'7:30-8:10','2':'8:10-8:50','3':'8:50-9:30','4':'9:30-10:10','5':'10:20-11:00','6':'11:00-11:40','7':'11:40-12:20','8':'12:40-13:20' };
const ADMIN_USER = 'DDIMattoanging';
const ADMIN_PASS = 'pondokhijau';

// ---- baca data SIJAB (origin sama) ----
const getSijab = () => ({
    guru:  JSON.parse(localStorage.getItem('guru')  || '[]'),
    kelas: JSON.parse(localStorage.getItem('kelas') || '[]'),
    jadwal:JSON.parse(localStorage.getItem('jadwal')|| '[]')
});
// ---- data absensi sendiri (key terpisah, tidak menabrak SIJAB) ----
const getAbsensi = () => JSON.parse(localStorage.getItem('sijab_absensi') || '[]');
const setAbsensi = d => localStorage.setItem('sijab_absensi', JSON.stringify(d));
const getUsers   = () => JSON.parse(localStorage.getItem('sijab_users')   || '[]');
const setUsers   = d => localStorage.setItem('sijab_users', JSON.stringify(d));

// ---- util tanggal ----
function hariIni(){ return ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][new Date().getDay()]; }
function tanggalISO(){ return new Date().toISOString().split('T')[0]; }
function formatTanggalID(){
    const bulan=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const n=new Date(); return `${n.getDate()} ${bulan[n.getMonth()]} ${n.getFullYear()}`;
}
function jamKeWaktu(jam, keluar){ const p=waktuMap[String(jam)].split('-'); return keluar?p[1].trim():p[0].trim(); }

// ---- sesi ----
function setSession(s){ sessionStorage.setItem('sijab_session', JSON.stringify(s)); }
function getSession(){ try{ return JSON.parse(sessionStorage.getItem('sijab_session')); }catch(e){ return null; } }
function logout(){ sessionStorage.removeItem('sijab_session'); location.reload(); }

// ============================================================
// LOGIN
// ============================================================
function doLogin(){
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value.trim();
    const err = document.getElementById('loginError');
    err.textContent = '';
    if (u === ADMIN_USER && p === ADMIN_PASS){ setSession({role:'admin'}); route(); return; }
    const user = getUsers().find(x => x.username === u && x.password === p);
    if (user){ setSession({role:'guru', nip:user.nip, nama:user.namaGuru, username:user.username}); route(); return; }
    err.textContent = '❌ Username atau password salah!';
}

function route(){
    const s = getSession();
    document.getElementById('loginView').style.display = s ? 'none' : 'flex';
    document.getElementById('adminView').style.display = (s && s.role==='admin') ? 'block' : 'none';
    document.getElementById('guruView').style.display  = (s && s.role==='guru')  ? 'block' : 'none';
    if (s && s.role==='admin'){ renderUsers(); renderAbsensiTable(); fillGuruDropdown(); document.getElementById('sheetUrl').value = localStorage.getItem('sijab_sheet_url')||''; }
    if (s && s.role==='guru'){ renderGuruDashboard(); }
}

// ============================================================
// ADMIN
// ============================================================
function showAdminTab(id, el){
    document.querySelectorAll('.atab-content').forEach(t=>t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.atab').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    if(id==='atabAbsensi') renderAbsensiTable();
    if(id==='atabUsers') renderUsers();
}

// ---- akun guru ----
function fillGuruDropdown(){
    const gj = getSijab().guru;
    document.getElementById('newUserGuru').innerHTML = gj.length
        ? gj.map(g=>`<option value="${g.nip}">${g.nama}</option>`).join('')
        : '<option value="">⚠️ Belum ada guru di SIJAB</option>';
}
function addUser(){
    const username = document.getElementById('newUser').value.trim();
    const password = document.getElementById('newPass').value.trim();
    const nip = document.getElementById('newUserGuru').value;
    if(!username || !password || !nip) return alert('Lengkapi username, password, dan pilih guru!');
    const users = getUsers();
    if(users.find(u=>u.username===username)) return alert('Username sudah dipakai!');
    const g = getSijab().guru.find(x=>x.nip===nip);
    users.push({username, password, nip, namaGuru:g.nama});
    setUsers(users);
    document.getElementById('newUser').value=''; document.getElementById('newPass').value='';
    renderUsers(); alert('✅ Akun guru berhasil dibuat!');
}
function deleteUser(username){
    if(!confirm('Hapus akun '+username+'?')) return;
    setUsers(getUsers().filter(u=>u.username!==username)); renderUsers();
}
function renderUsers(){
    document.getElementById('tblUsers').innerHTML = getUsers().map(u=>`
        <tr><td><strong>${u.username}</strong></td><td>${u.password}</td><td>${u.namaGuru}</td>
        <td><button class="btn btn-outline btn-sm" onclick="deleteUser('${u.username}')">Hapus</button></td></tr>`).join('')
        || '<tr><td colspan="4" style="text-align:center;color:#999;">Belum ada akun guru</td></tr>';
}

// ---- tabel rekap (DATA 1) ----
function renderAbsensiTable(){
    const rows = getAbsensi().slice().reverse();
    document.getElementById('absensiCount').textContent = `(${rows.length} record)`;
    document.querySelector('#tblAbsensiAdmin tbody').innerHTML = rows.map(r=>`
        <tr>
            <td>${r.foto?`<img src="${r.foto}" class="thumb">`:'—'}</td>
            <td>${r.tanggal}</td><td>${r.nama}</td><td>${r.kelas.join(', ')}</td>
            <td>${r.jadwalMasuk}</td><td>${r.jadwalKeluar}</td><td>${r.totalJam}</td>
            <td>${r.waktuAbsensi}</td><td>${r.keterangan}</td><td>${r.lokasi}</td>
        </tr>`).join('') || '<tr><td colspan="10" style="text-align:center;color:#999;">Belum ada data absensi</td></tr>';
}

// ---- export CSV (format kolom sesuai spreadsheet Anda) ----
function csvEscape(v){ v = String(v==null?'':v); return /[",\n]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v; }
function downloadCSV(filename, rows){
    const csv = rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
}
function exportCSV1(){
    const rows = getAbsensi();
    const data = [['Gambar','Tanggal','Kelas','Jadwal Masuk','Jadwal Keluar','Total Jam','Waktu Absensi','Keterangan','Lokasi']];
    rows.forEach(r=>data.push([
        r.foto?'FOTO':'', r.tanggal, r.kelas.join('; '), r.jadwalMasuk, r.jadwalKeluar,
        r.totalJam, r.waktuAbsensi, r.keterangan, r.lokasi
    ]));
    downloadCSV('DATA1_Absensi.csv', data);
}
function exportCSV2(){
    // DATA 2: Nama | Total Jam | Tidak Hadir | Hadir
    const rows = getAbsensi(), sj = getSijab();
    const map = {};
    sj.guru.forEach(g=>{ map[g.nip]={nama:g.nama, total:0, hadir:0, terjadwalHari:new Set()}; });
    sj.jadwal.forEach(j=>{ if(map[j.guru]) map[j.guru].terjadwalHari.add(j.hari); });
    rows.forEach(r=>{
        if(!map[r.nip]) return;
        map[r.nip].total += r.totalJam;
        map[r.nip].hadir += 1;
    });
    const data = [['Nama','Total Jam','Tidak Hadir','Hadir']];
    Object.values(map).forEach(m=>{
        const terjadwal = m.terjadwalHari.size;
        const tidakHadir = Math.max(0, terjadwal - m.hadir);
        data.push([m.nama, m.total, tidakHadir, m.hadir]);
    });
    downloadCSV('DATA2_Rekap.csv', data);
}

// ---- sinkron Google Sheets ----
function saveSheetUrl(){
    localStorage.setItem('sijab_sheet_url', document.getElementById('sheetUrl').value.trim());
    alert('✅ URL disimpan');
}
async function testSync(){
    const url = document.getElementById('sheetUrl').value.trim();
    const st = document.getElementById('syncStatus');
    if(!url){ st.innerHTML='<div class="error-text">URL kosong!</div>'; return; }
    st.innerHTML = '⏳ Menguji...';
    try{
        await fetch(url, {method:'POST', body: JSON.stringify({action:'ping'}), headers:{'Content-Type':'text/plain;charset=utf-8'}});
        st.innerHTML = '<div style="color:#1b5e20;">✅ Terhubung! (cek log Apps Script)</div>';
    }catch(e){ st.innerHTML = '<div class="error-text">❌ Gagal: '+e.message+'</div>'; }
}
async function syncAll(){
    const url = document.getElementById('sheetUrl').value.trim();
    if(!url) return alert('Simpan URL Apps Script dulu!');
    const rows = getAbsensi();
    const belum = rows.filter(r=>!r.synced);
    if(belum.length===0) return alert('Semua data sudah terkirim.');
    for(const r of belum){
        try{
            await fetch(url, {method:'POST', body: JSON.stringify({action:'append', record:r}), headers:{'Content-Type':'text/plain;charset=utf-8'}});
            r.synced = true;
        }catch(e){ console.error('Sync gagal', e); }
    }
    setAbsensi(rows);
    alert('✅ '+belum.length+' record terkirim ke Sheets!');
}

// ============================================================
// GURU (mobile)
// ============================================================
function showGuruTab(id, el){
    document.querySelectorAll('.guru-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.bnav').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    if(id==='tabRiwayat') renderRiwayatSemua();
    if(id==='tabProfil') renderProfil();
}

function slotHariIni(nip){
    const sj = getSijab();
    return sj.jadwal.filter(j=>j.guru===nip && j.hari===hariIni()).sort((a,b)=>a.jam-b.jam);
}

function renderGuruDashboard(){
    const s = getSession();
    document.getElementById('guruNama').textContent = s.nama;
    document.getElementById('todayDate').textContent = formatTanggalID();

    const slots = slotHariIni(s.nip);
    const status = document.getElementById('jadwalStatus');
    const btn = document.getElementById('btnMulaiAbsen');
    const list = document.getElementById('slotList');

    if(slots.length===0){
        status.textContent = 'Belum ada jadwal';
        status.className = 'jadwal-status';
        btn.disabled = true; btn.className='btn btn-block btn-absen';
        list.innerHTML = '';
    } else {
        const masuk = jamKeWaktu(slots[0].jam,false);
        const keluar = jamKeWaktu(slots[slots.length-1].jam,true);
        status.textContent = `Hari ini Anda mengajar (${slots.length} jam) — ${masuk} s/d ${keluar}`;
        status.className = 'jadwal-status ada';
        list.innerHTML = slots.map(j=>{
            const k = getSijab().kelas.find(x=>x.nama===j.kelas);
            const m = JSON.parse(localStorage.getItem('mapel')||'[]').find(x=>x.kode===j.mapel);
            return `<div class="slot-item"><span>Jam ${j.jam} (${waktuMap[j.jam]})</span><span>${m?m.nama:j.mapel} • ${j.kelas}${k?' ('+k.tingkatan+')':''}</span></div>`;
        }).join('');
        const sudah = getAbsensi().find(r=>r.nip===s.nip && r.tanggal===tanggalISO());
        if(sudah && sudah.waktuKeluar){
            btn.disabled=true; btn.textContent='✅ Sudah Absen Penuh'; btn.className='btn btn-block btn-absen enabled';
        } else if(sudah){
            btn.disabled=false; btn.textContent='Selesai Absen (Pulang)'; btn.className='btn btn-block btn-absen enabled';
        } else {
            btn.disabled=false; btn.textContent='Mulai Absen'; btn.className='btn btn-block btn-absen enabled';
        }
    }
    renderRiwayatHariIni();
}

function renderRiwayatHariIni(){
    const s=getSession();
    const rows = getAbsensi().filter(r=>r.nip===s.nip && r.tanggal===tanggalISO());
    document.getElementById('riwayatHariIni').innerHTML = rows.length ? rows.map(r=>riwCard(r)).join('')
        : `<div class="empty-state"><span class="icon">📭</span>Tidak ada data</div>`;
}
function riwCard(r){
    return `<div class="riw-card">
        <div class="top"><span>${r.kelas.join(', ')}</span><span>${r.totalJam} Jam</span></div>
        <div class="row">Masuk: ${r.waktuAbsensi} ${r.waktuKeluar?`| Pulang: ${r.waktuKeluar}`:'| (belum pulang)'}</div>
        <div class="row">Keterangan: ${r.keterangan}</div>
        <div class="row">📍 ${r.lokasi}</div>
        ${r.foto?`<img src="${r.foto}" class="foto-preview" style="max-height:120px;margin-top:8px;">`:''}
    </div>`;
}
function renderRiwayatSemua(){
    const s=getSession();
    const rows = getAbsensi().filter(r=>r.nip===s.nip).reverse();
    document.getElementById('riwayatSemua').innerHTML = rows.length ? rows.map(riwCard).join('')
        : `<div class="empty-state"><span class="icon">📭</span>Belum ada riwayat</div>`;
}
function renderProfil(){
    const s=getSession();
    const g = getSijab().guru.find(x=>x.nip===s.nip);
    document.getElementById('profilInfo').innerHTML = `
        <p><strong>Nama:</strong> ${s.nama}</p>
        <p><strong>NIP:</strong> ${s.nip}</p>
        <p><strong>Username:</strong> ${s.username}</p>
        <p><strong>Bidang Studi:</strong> ${g?g.mapel.join(', '):'-'}</p>`;
}

// ---- modal absen ----
let currentFoto = '';
function openAbsenModal(){
    const s=getSession();
    const slots = slotHariIni(s.nip);
    if(slots.length===0) return alert('Tidak ada jadwal hari ini.');
    const sudah = getAbsensi().find(r=>r.nip===s.nip && r.tanggal===tanggalISO());
    if(sudah && sudah.waktuKeluar) return alert('Absensi hari ini sudah lengkap.');

    document.getElementById('modalTitle').textContent = sudah ? '🕒 Absen Pulang' : '📸 Absensi Mengajar';
    document.getElementById('modalInfo').textContent = `${hariIni()} • ${slots.length} jam • ${sudah?'Absen masuk pukul '+sudah.waktuAbsensi : 'Masuk '+jamKeWaktu(slots[0].jam,false)+', Keluar '+jamKeWaktu(slots[slots.length-1].jam,true)}`;
    document.getElementById('btnSimpanAbsen').textContent = sudah ? '💾 Simpan Pulang' : '💾 Simpan Absen';
    document.getElementById('modalError').textContent='';
    document.getElementById('ketInput').value = sudah ? sudah.keterangan : '';
    document.getElementById('fotoInput').style.display = sudah ? 'none':'block';
    document.getElementById('fotoPreview').style.display = sudah ? 'block':'none';
    if(sudah) document.getElementById('fotoPreview').src = sudah.foto;
    currentFoto = '';
    ambilLokasi();
    document.getElementById('absenModal').style.display='flex';
}
function closeAbsenModal(){ document.getElementById('absenModal').style.display='none'; }

function previewFoto(e){
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
        currentFoto = ev.target.result;
        const img = document.getElementById('fotoPreview');
        img.src = currentFoto; img.style.display='block';
    };
    reader.readAsDataURL(f);
}
function ambilLokasi(){
    const box = document.getElementById('lokasiText');
    if(!navigator.geolocation){ box.textContent='GPS tidak didukung'; return; }
    navigator.geolocation.getCurrentPosition(
        pos=>{ box.textContent = `📍 ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`; },
        ()=>{ box.textContent = '📍 Lokasi tidak tersedia (izin ditolak)'; },
        {timeout:8000}
    );
}
function simpanAbsen(){
    const s = getSession();
    const slots = slotHariIni(s.nip);
    const jamList = slots.map(j=>j.jam);
    const kelasList = [...new Set(slots.map(j=>j.kelas))];
    const masuk = jamKeWaktu(jamList[0],false);
    const keluar = jamKeWaktu(jamList[jamList.length-1],true);
    const ket = document.getElementById('ketInput').value.trim();
    const lokasi = document.getElementById('lokasiText').textContent.replace('📍 ','');
    const now = new Date();
    const waktu = `${tanggalISO()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    const err = document.getElementById('modalError');

    const rows = getAbsensi();
    const sudah = rows.find(r=>r.nip===s.nip && r.tanggal===tanggalISO());

    if(sudah){ // absen pulang
        sudah.waktuKeluar = waktu;
        setAbsensi(rows);
        closeAbsenModal(); renderGuruDashboard();
        return alert('✅ Absen pulang tersimpan!');
    }

    if(!currentFoto){ err.textContent='⚠️ Wajib foto selfie!'; return; }
    if(!ket){ err.textContent='⚠️ Keterangan wajib diisi!'; return; }

    rows.push({
        id: Date.now(), nip:s.nip, nama:s.nama, tanggal:tanggalISO(), hari:hariIni(),
        kelas:kelasList, jamList, jadwalMasuk:masuk, jadwalKeluar:keluar,
        totalJam:slots.length, waktuAbsensi:waktu, waktuKeluar:null,
        foto:currentFoto, keterangan:ket, lokasi, synced:false
    });
    setAbsensi(rows);
    closeAbsenModal(); renderGuruDashboard();
    alert('✅ Absensi tersimpan!');
}

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', route);
// sinkron otomatis antar-tab jika SIJAB diubah di tab lain
window.addEventListener('storage', ()=>{ if(getSession()?.role==='guru') renderGuruDashboard(); });
