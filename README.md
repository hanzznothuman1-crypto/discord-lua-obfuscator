# Discord Lua Obfuscator & Protection Bot

Bot Discord yang menyediakan fitur obfuscation dan protection untuk file Lua, khususnya untuk Roblox development.

## 🎯 Fitur

### 1. `/obfuscate [file]`
Obfuscate file Lua Anda untuk mempersulit pembacaan kode.

**Cara menggunakan:**
1. Ketik `/obfuscate` di Discord
2. Upload file `.lua` Anda
3. Bot akan mengembalikan file yang sudah di-obfuscate

**Apa yang dilakukan:**
- Menghapus semua komentar
- Minifikasi whitespace
- Mengubah nama variabel menjadi tidak terbaca
- Encrypt semua string
- Control flow obfuscation

### 2. `/protect-lua [input/text]`
Obfuscate DAN protect kode Lua Anda dalam satu command! Script akan otomatis di-obfuscate terlebih dahulu, lalu di-protect dengan link yang hanya bisa diakses dari Roblox.

**Cara menggunakan:**
- **Dengan file:** `/protect-lua` → pilih `input` → upload file
- **Dengan text:** `/protect-lua` → pilih `text` → paste kode Lua

**Proses:**
1. Script Anda akan di-obfuscate (variabel di-rename, string di-encrypt, dll)
2. Hasil obfuscation akan di-protect dengan link unik
3. Link hanya bisa diakses dari Roblox

**Hasil:**
Bot akan memberikan link dengan format:
```
https://[your-domain]/protected/[unique-id]
```

Link ini **hanya bisa diakses dari Roblox** (melalui HttpService).

### 3. `/crack [url]`
Mengakses dan mengcopy konten dari URL yang dilindungi.

**Cara menggunakan:**
1. Ketik `/crack` di Discord
2. Masukkan URL yang ingin diakses
3. Bot akan mencoba mengakses dengan berbagai User-Agent dan mengembalikan kontennya

## 🚀 Setup Bot

### Langkah 1: Undang Bot ke Server Discord Anda

1. Pergi ke [Discord Developer Portal](https://discord.com/developers/applications)
2. Pilih aplikasi bot Anda
3. Di tab "OAuth2" > "URL Generator":
   - **Scopes**: pilih `bot` dan `applications.commands`
   - **Bot Permissions**: pilih `Send Messages`, `Attach Files`, `Use Slash Commands`
4. Copy URL yang dihasilkan dan buka di browser
5. Pilih server dan klik "Authorize"

### Langkah 2: Gunakan Commands

Setelah bot masuk server, slash commands akan otomatis tersedia. Ketik `/` di chat untuk melihat semua commands.

## 🔒 Keamanan Protection Links

**Penting untuk dipahami:**
- Protection links menggunakan validasi User-Agent untuk memastikan hanya Roblox yang bisa akses
- User-Agent bisa di-spoof, jadi ini bukan proteksi 100% aman
- Untuk keamanan lebih tinggi, pertimbangkan:
  - Tambah autentikasi token
  - Rate limiting
  - IP whitelisting
  - Database untuk tracking akses

## 📝 Contoh Penggunaan di Roblox

```lua
-- Mengambil protected Lua script dari bot
local HttpService = game:GetService("HttpService")

local url = "https://[your-domain]/protected/[id]"
local response = HttpService:GetAsync(url)

-- Response berisi kode Lua yang sudah di-obfuscate dan di-protect
print(response)

-- Untuk execute kode:
local func = loadstring(response)
if func then
    func()
end
```

## 📂 Struktur File

```
.
├── index.js              # Main bot file
├── package.json          # Dependencies
├── storage/
│   ├── obfuscated/      # File hasil obfuscation
│   └── protected/       # File yang di-protect
└── README.md            # Dokumentasi ini
```

## ⚙️ Technical Details

**Tech Stack:**
- Discord.js v14 - Discord bot framework
- Express.js - Web server untuk protection links
- Node.js 20 - Runtime
- Axios - HTTP client

**Port:** 5000 (untuk protection links)

## 🎮 Tips

1. **Obfuscation** bagus untuk mempersulit (bukan mencegah) reverse engineering
2. **Protection links** cocok untuk distribusi script Roblox
3. **Crack command** berguna untuk testing dan debugging protection

## ⚠️ Disclaimer

Bot ini dibuat untuk tujuan educational dan development. Penggunaan untuk tujuan yang melanggar Terms of Service platform manapun adalah tanggung jawab pengguna.

## 🆘 Troubleshooting

**Bot tidak merespon slash commands?**
- Pastikan bot sudah di-invite dengan permission `applications.commands`
- Tunggu beberapa menit untuk Discord sync commands

**Protection link tidak bisa diakses?**
- Pastikan menggunakan User-Agent yang mengandung "Roblox"
- Cek apakah server protection sedang running (port 5000)

**Error saat obfuscate file besar?**
- Saat ini belum ada limit ukuran file, tapi untuk file >1MB mungkin butuh waktu lebih lama

---

**Selamat menggunakan bot! 🎉**
