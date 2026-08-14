# MASTER PROMPT — IMPLEMENTASI FRONTEND FITUR PENCATATAN BARANG TERBUANG (WASTES)

Anda bertindak sebagai **Senior Frontend Engineer (React)**. Tugas Anda adalah membangun integrasi *User Interface (UI)* secara menyeluruh untuk modul **"Pencatatan Barang Terbuang / Wastes"** pada proyek POS Angkringan 88.

Modul Backend API telah diselesaikan. Anda bertugas membaca dan memanggil fungsi-fungsi API tersebut agar dapat dikelola dengan mudah oleh *user* lewat sistem frontend yang ada. Jangan membuat skema atau model backend baru. Fokus mutlak pada koneksi Axios/Fetch, state management, dan pembangunan UI/UX aplikasi React Vite.

==================================================
## 1. KONTEKS & TEKNOLOGI
==================================================

- Framework: React (menggunakan Vite)
- UI Library / CSS: [Gunakan stack UI yang sudah digunakan project, misalnya: TailwindCSS, Shadcn, MUI, AntD, atau Chakra UI]
- API Client: Axios (Atau fetch, ikuti *instance/config* yang sudah ada di sistem termasuk interceptor / attach Bearer token JWT)
- Data Fetching: React Query (atau SWR / Redux Toolkit menyesuaikan best-practice project saat ini).

==================================================
## 2. API ENDPOINTS YANG TERSEDIA
==================================================

Semua routing berada di prefix: `/api/wastes`

1. **`GET /api/wastes`**: Mendapatkan daftar barang terbuang (Pagination).
   - Mendukung Query params: `page`, `limit`, `search`, `type`, `reason`, `startDate`, `endDate`.
   - Mengembalikan array object `data` dengan list histori waste.
2. **`GET /api/wastes/:id`**: Mendapatkan detail waste 1 rekaman.
3. **`GET /api/wastes/summary`**: API Metric kerugian / qty terbuang secara total (Dukung filter `startDate`, `endDate`).
4. **`GET /api/wastes/analysis`**: API data aggregasi Chart (Pie/Bar) dan persentase Waste Ratio.
5. **`POST /api/wastes`**: Mencatat baru.
   - Body Object: `{ "type": "INGREDIENT" | "PRODUCT", "item_id": 1, "quantity": 10, "reason": "BASI", "note": "..." }`
6. **`PATCH /api/wastes/:id`**: Mengubah kuantitas atau alasan (Item tidak dapat dirubah).
7. **`DELETE /api/wastes/:id`**: Hapus rekaman (Stok akan direstitusi oleh sistem otomatis).

==================================================
## 3. ROLE BERDASARKAN PERMISSIONS (RBAC)
==================================================

Pastikan menyembunyikan / *disable* tombol jika user (JWT token payload state) tidak memiliki hak akses ini:
- `waste.read`: Membolehkan tabel dan view diakses.
- `waste.create`: Membolehkan tombol "Catat Barang Terbuang".
- `waste.update`: Membolehkan akses klik edit log di list data.
- `waste.delete`: Membolehkan aksi hapus data.
- `waste.analysis`: Membolehkan melihat summary chart analitik.

==================================================
## 4. STRUKTUR HALAMAN & UI COMPONENTS
==================================================

Buat satu Halaman/Rute utama Dashboard *Wastes* secara komprehensif, dibagi dalam setidaknya dua Tab (*Views*) atau Layout atas-bawah.

### A. SECTION ANALITIK & RINGKASAN
- **Date Filter Global**: DateRangePicker (Mulai tanggal - Sampai tanggal) yang akan me-refresh ke semua API data fetch.
- **Card Metrics**: 3 atau 4 buah Card sejajar menampilkan nilai dari endpoint `/api/wastes/summary`:
   - "Total Kerugian (Rp)" (Format Rupiah IDR).
   - "Total Barang Terbuang (Qty)".
   - "Waste Ratio (%)" (Diambil dari endpoint `analysis`).
- **Charts / Visualisasi** (Dari `GET /api/wastes/analysis`):
   - **Pie/Doughnut Chart**: Distribusi berdasarkan `reason` (Basi, Rusak, Gosong, dll).
   - **Bar Chart**: 5-10 menu / bahan (`top_wasted_items`) yang paling boros terbuang.
   - (Opsional) Line Chart Tren harian (`daily_waste`).

### B. DATA TABLE & HISTORI PENCATATAN 
Menampilkan output dari `GET /api/wastes`.
- **Search Bar**: Berfungsi melakukan pencarian dari parameter `search` ke API.
- **Tabel Kolom**: Tanggal, Nama Barang, Kategori (Product/Ingredient), Kuantitas terbuang (Sertakan unit), Harga (Total Loss dalam IDR), Alasan, Catatan, dan Aksi (Edit/Hapus).
- **Pagination**: Handle API metrik pages & totals dari `meta` response wrapper backend.

### C. FORM MODAL CREATE & UPDATE
Tombol **"Catat Waste Baru"** akan memunculkan *Modal* form dengan field:
1. **Jenis Barang (Tipe)**: Dropdown (*Product* atau *Ingredient*).
2. **Pilih Barang (item_id)**: Dropdown/Select search yang sumber datanya reaktif memanggil data master Katalog Menu atau master Bahan berdasarkan jenis barang yang dipilih di Poin 1.
3. **Kuantitas**: Input Number (> 0).
4. **Alasan**: Dropdown (BASI, KADALUARSA, RUSAK, GOSONG, JATUH, SALAH_PRODUKSI, SISA_PRODUKSI, HILANG, LAINNYA).
5. **Catatan Tambahan**: Textarea (Wajib jika pilih Alasan: "LAINNYA").

**Wajib Diperhatikan untuk Form Update**:
Jika Form berada di tahap "Simpan/Patch", maka *"Jenis Barang"* dan *"Pilih Barang"* bentuknya wajib **Disabled** (hanya bersifat read-only berdasarkan data aslinya). Yang bisa diubah via endpoint patch hanya kuantitas, alasan, dan catatan. Jangan mengirim Payload jenis barang.

==================================================
## 5. FITUR KONFIRMASI DAN NOTIFIKASI
==================================================
- Saat user meng-klik icon "Hapus", **wajib** tampilkan dialog persetujuan (Confirmation Modal) dengan warning berbunyi: *"Anda yakin ingin menghapus data ini? Stok akan otomatis dikreditkan (dikembalikan) sejumlah kuantitas ini ke Gudang/Inventory utama"*
- Error dari Response API (misal *Error: Stok Tidak Mencukupi*) **wajib** di-*catch* dan ditampilkan pada notifikasi lokal (*Toast / Alert*) di layar.

==================================================
## 6. TIMELINE DEVELOPER
==================================================
1. Susun Service Layer (Pemetaan *request* Axios berdasarkan endpoint 6 poin di atas).
2. Buat *Views* dan kerangka Dashboard/Analitiknya terlebih dahulu.
3. Buat kerangka Tabel.
4. Gabungkan fungsi reaktif *Date Range Picker* ke pemanggilan Query.
5. Sempurnakan Modal Form. Buat Form diletakkan dengan validasi yang rapi sebelum terlempar (HTTP Request) ke Backend API. 

Selamat Mengerjakan. Jangan mengubah satupun susunan Back-end kecuali untuk urusan perbaikan CORS. Semua komputasi logika penguraian stok sudah berada di Back-end. Tugasmu adalah membuatnya intuitif untuk manusia!
