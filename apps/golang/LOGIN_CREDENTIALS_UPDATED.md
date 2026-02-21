# ✅ Dokumentasi Login - Updated to Match Seed Database

## 📋 Username Credentials (Sesuai dengan Seed Database)

Semua dokumentasi sudah diupdate untuk match dengan file `seed_users_all_roles.go`.

### 🔑 Username-based Login Credentials

| Username | Password | Role | Email |
|----------|----------|------|-------|
| `superadmin` | `demo123` | SUPER_ADMIN | super-admin@agrinova.com |
| `companyadmin` | `demo123` | COMPANY_ADMIN | company-admin@agrinova.com |
| `manager` | `demo123` | MANAGER | manager-agrinova@agrinova.com |
| `asisten` | `demo123` | ASISTEN | asisten-agrinova@agrinova.com |
| `mandor` | `demo123` | MANDOR | mandor-agrinova@agrinova.com |
| `satpam` | `demo123` | SATPAM | satpam-agrinova@agrinova.com |
| `TIMBANGAN` | `demo123` | TIMBANGAN | timbangan@agrinova.com |
| `GRADING` | `demo123` | GRADING | grading@agrinova.com |

### 📁 File yang Sudah Diupdate

1. ✅ **DEMO_CREDENTIALS.md** - Updated legacy credentials section
2. ✅ **CURL_LOGIN_TESTS.md** - Updated all curl commands
3. ✅ **test-login-curl.sh** - Updated bash test script
4. ✅ **test-login-curl.ps1** - Updated PowerShell test script

### 🔄 Perubahan yang Dilakukan

#### Super Admin
- **Sebelum**: `admin`
- **Sesudah**: `superadmin` ✅

#### Company Admin
- **Sebelum**: *(tidak ada di legacy credentials)*
- **Sesudah**: `companyadmin` ✅ (ditambahkan)

#### Roles Lainnya
- ✅ `manager` - tidak berubah
- ✅ `asisten` - tidak berubah
- ✅ `mandor` - tidak berubah
- ✅ `satpam` - tidak berubah
- ✅ `TIMBANGAN` - tidak berubah
- ✅ `GRADING` - tidak berubah

### 🚀 Cara Testing

#### Option 1: Run PowerShell Script (Windows)
```powershell
cd e:\agrinova\apps\golang
.\test-login-curl.ps1
```

#### Option 2: Copy-Paste Individual Commands
Lihat file `CURL_LOGIN_TESTS.md` untuk individual curl commands.

#### Option 3: Test dengan Username
```bash
# Super Admin
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d '{"query":"mutation WebLogin($input: WebLoginInput!) { webLogin(input: $input) { success message user { username nama role } } }","variables":{"input":{"identifier":"superadmin","password":"demo123"}}}'

# Company Admin
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d '{"query":"mutation WebLogin($input: WebLoginInput!) { webLogin(input: $input) { success message user { username nama role } } }","variables":{"input":{"identifier":"companyadmin","password":"demo123"}}}'
```

#### Option 4: Test dengan Email
```bash
# Super Admin
curl -X POST http://localhost:8080/graphql -H "Content-Type: application/json" -d '{"query":"mutation WebLogin($input: WebLoginInput!) { webLogin(input: $input) { success message user { username nama role } } }","variables":{"input":{"identifier":"super-admin@agrinova.com","password":"demo123"}}}'
```

### ✅ Verifikasi

Semua dokumentasi sekarang **100% match** dengan seed database:
- ✅ Username sesuai dengan `seed_users_all_roles.go`
- ✅ Password semua menggunakan `demo123`
- ✅ Email tersedia sebagai alternatif login
- ✅ Curl commands ready to test
- ✅ PowerShell dan Bash scripts updated

### 🎯 Next Steps

1. **Run seed script** jika belum:
   ```bash
   cd e:\agrinova\apps\golang
   go run seed_users_all_roles.go
   ```

2. **Test login** menggunakan salah satu method di atas

3. **Verify** bahwa login berhasil dengan response:
   ```json
   {
     "data": {
       "webLogin": {
         "success": true,
         "message": "Login successful",
         "user": {
           "username": "superadmin",
           "nama": "Super Administrator",
           "role": "SUPER_ADMIN"
         }
       }
     }
   }
   ```
