# Agrinova User Manual - Admin (Company Admin & Super Admin)

## Selamat Datang Admin! ⚙️

Panduan ini menjelaskan cara menggunakan web dashboard Agrinova untuk manajemen sistem.

---

## 🌐 Login Web

1. Buka `https://yourdomain.com/login`
2. Masukkan **Username** dan **Password**
3. Klik **Login**

---

## 🏢 Company Admin Dashboard

### Overview
| Section | Isi |
|---------|-----|
| **User Stats** | Total, Active, Online |
| **Estate Overview** | All estates in company |
| **System Health** | API, DB, Sync status |
| **Activity Log** | Recent admin actions |

### User Management

#### Create User
1. Go to **Users** > **Add User**
2. Fill form:
   - Username, Email, Full Name
   - Select Role
   - Assign Estates/Divisions
3. Click **Create**
4. User receives welcome email

#### Edit User
1. Click user row
2. Modify details
3. Click **Save**

#### Deactivate User
1. Click user row
2. Click **Deactivate**
3. Confirm

### Estate Management
- View all estates
- Assign managers
- View production stats

### Company Settings
- General: Name, Timezone
- Notifications: Email, Push
- Security: Session timeout, Password policy
- Operations: GPS required, Photo required

---

## 🛡️ Super Admin Dashboard

### System Overview
| Section | Isi |
|---------|-----|
| **Tenant Overview** | All companies |
| **Platform Stats** | Users, Harvests, Gate checks |
| **System Status** | Services health |
| **Alerts** | Critical issues |

### Company Management

#### Create Company
1. Go to **Companies** > **Add Company**
2. Fill details:
   - Company Name, Code
   - Plan Type (Trial/Basic/Premium)
   - Max Users, Max Estates
3. Create initial admin account
4. Click **Create**

#### Manage Subscription
1. Click company row
2. Go to **Subscription** tab
3. Modify limits or extend trial
4. Click **Save**

#### Suspend Company
1. Click company row
2. Click **Suspend**
3. Enter reason
4. Confirm

### System Settings
- **General**: Platform name, Support email
- **Security**: JWT expiry, Rate limits
- **Email**: SMTP configuration
- **Storage**: Max upload size

### Feature Flags
Enable/disable features per company:
- Offline Mode
- QR Scanning
- Photo Attachments
- Analytics
- Real-time Updates

---

## 📊 Reports

### Available Reports
| Report | Access |
|--------|--------|
| User Activity | Company Admin |
| Production Summary | Company Admin |
| Platform Usage | Super Admin |
| Revenue Analytics | Super Admin |

### Export
- Format: PDF, Excel, CSV
- Schedule: Daily, Weekly, Monthly

---

## 🔐 Security

### Session Management
- View active sessions
- Revoke sessions
- Force logout all devices

### Audit Log
All actions are logged:
- User CRUD
- Settings changes
- Login attempts
- Permission changes

---

## ❓ FAQ

**Q: User tidak bisa login?**  
A: Check status aktif dan password expiry.

**Q: Company over limit?**  
A: Upgrade plan atau remove inactive users.

**Q: API errors?**  
A: Check System Health > Logs.
