# 🚀 Optimal Port Configuration Guide for Agrinova WebSocket Architecture

## **🎯 Recommended Architecture: Single Port with Path-Based Routing**

### **Current vs Recommended Configuration**

| **Component** | **Current (Sub-optimal)** | **✅ Recommended (Industry Standard)** |
|---------------|---------------------------|----------------------------------------|
| **API Server** | `http://localhost:3001` | `http://localhost:3001/api/v1/*` |
| **WebSocket** | `http://localhost:3002/notifications` | `http://localhost:3001/notifications` |
| **Web Dashboard** | `http://localhost:3000` | `http://localhost:3000` |

---

## **🏗️ Implementation Strategy**

### **1. Backend Configuration (NestJS)**

**File: `apps/api/src/main.ts`**
```typescript
// ✅ UPDATED: Same port for API and WebSocket
const ioAdapter = new IoAdapter(app);
ioAdapter.createIOServer(port, socketIOOptions); // Port 3001 for both
app.useWebSocketAdapter(ioAdapter);

// Result: 
// API: http://localhost:3001/api/v1/*
// WebSocket: http://localhost:3001/notifications
```

### **2. Frontend Configuration (Next.js)**

**Update WebSocket connection URLs:**
```typescript
// ✅ NEW: Single port connection
const WEBSOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'wss://api.agrinova.com/notifications'
  : 'ws://localhost:3001/notifications';

// Old: 'ws://localhost:3002/notifications'
// New: 'ws://localhost:3001/notifications'
```

### **3. Environment Variables**

**Development (.env.local):**
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001/notifications

# No longer needed:
# NEXT_PUBLIC_WS_PORT=3002
```

**Production (.env.production):**
```env
# API Configuration  
NEXT_PUBLIC_API_BASE_URL=https://api.agrinova.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.agrinova.com/notifications

# Single SSL certificate covers both API and WebSocket
```

---

## **🚀 Benefits of Single Port Architecture**

### **Production Benefits**

#### **1. Simplified Reverse Proxy Configuration**
```nginx
# ✅ Single upstream, path-based routing
upstream agrinova_api {
    server app:3001;
}

server {
    listen 443 ssl;
    server_name api.agrinova.com;
    
    location /api/v1/ {
        proxy_pass http://agrinova_api;
    }
    
    location /notifications {
        proxy_pass http://agrinova_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

#### **2. Docker Compose Simplification**
```yaml
# ✅ Single port exposure
services:
  agrinova-api:
    build: ./apps/api
    ports:
      - "3001:3001"  # Single port mapping
    environment:
      - PORT=3001
      
  # No longer needed:
  # - WEBSOCKET_PORT=3002
```

#### **3. Kubernetes Deployment**
```yaml
# ✅ Single service configuration
apiVersion: v1
kind: Service
metadata:
  name: agrinova-api
spec:
  ports:
  - port: 3001
    targetPort: 3001
    protocol: TCP
  selector:
    app: agrinova-api
```

### **Development Benefits**

#### **1. CORS Simplification**
```typescript
// ✅ Same origin - no CORS issues
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api/v1'  
});

const wsClient = io('http://localhost:3001/notifications');
// Both use same origin - no CORS preflight requests
```

#### **2. SSL/TLS Certificate Management**
```typescript
// ✅ Single certificate covers both API and WebSocket
// Production: wss://api.agrinova.com/notifications
// Development: ws://localhost:3001/notifications
```

---

## **📊 Performance & Security Comparison**

| **Metric** | **Dual Port (Current)** | **Single Port (Recommended)** |
|------------|-------------------------|-------------------------------|
| **Connection Overhead** | 2 connections | 1 connection |
| **SSL Certificates** | 2 certificates needed | 1 certificate |
| **Load Balancer Rules** | 2 upstream configs | 1 upstream config |
| **Firewall Rules** | 2 port rules | 1 port rule |
| **CORS Complexity** | Cross-origin issues | Same-origin simplicity |
| **Container Ports** | 2 exposed ports | 1 exposed port |
| **Monitoring** | 2 endpoint monitoring | 1 endpoint monitoring |

---

## **🔧 Migration Steps**

### **Step 1: Backend Update (Completed)**
- ✅ Modified `apps/api/src/main.ts` to use same port for WebSocket
- ✅ WebSocket now runs on port 3001 with path `/notifications`

### **Step 2: Frontend Updates (Required)**
```typescript
// Update WebSocket connection URLs in:
// - apps/web/lib/socket/pure-websocket-provider.tsx
// - apps/web/components/websocket/*
// - Environment configuration files

// Old: ws://localhost:3002/notifications  
// New: ws://localhost:3001/notifications
```

### **Step 3: Environment Configuration (Required)**
```bash
# Update environment files:
apps/web/.env.local
apps/web/.env.production  
apps/api/.env
apps/api/.env.production
```

### **Step 4: Docker Configuration (If Used)**
```dockerfile
# Update Dockerfile EXPOSE statements
EXPOSE 3001  # Remove EXPOSE 3002
```

### **Step 5: Infrastructure Updates (Production)**
```bash
# Update:
# - Nginx/Apache reverse proxy configs
# - Load balancer configurations  
# - Kubernetes service definitions
# - Firewall rules (remove port 3002 access)
```

---

## **🌐 Standard Port Conventions**

### **Microservices Architecture Best Practices**

| **Service Type** | **Standard Ports** | **Agrinova Usage** |
|------------------|-------------------|-------------------|
| **Main API** | 3000, 8000, 8080 | 3001 ✅ |
| **WebSocket** | Same as API + path | 3001/notifications ✅ |
| **Web Frontend** | 3000, 8080 | 3000 ✅ |
| **Database** | 5432 (PostgreSQL) | 5432 ✅ |
| **Redis** | 6379 | 6379 ✅ |
| **Monitoring** | 9090 (Prometheus) | - |

### **Industry Examples**
- **Socket.IO**: Recommends same port with path-based routing
- **Next.js**: Uses 3000 for development, same port for WebSocket in production
- **Express.js**: Single port with multiple route handlers
- **NestJS**: Built-in WebSocket adapter supports same port configuration

---

## **🔒 Security Implications**

### **Single Port Advantages**
- **Reduced Attack Surface**: Fewer open ports = smaller attack vector
- **Simplified Firewall Rules**: Single port to monitor and protect
- **Unified SSL/TLS**: One certificate, consistent security policies
- **Better Rate Limiting**: Single endpoint for rate limiting rules

### **Monitoring Benefits**
```typescript
// ✅ Unified monitoring on single port
const healthCheck = {
  endpoint: 'http://localhost:3001/health',
  websocket: 'http://localhost:3001/notifications',
  status: 'both on same server'
};
```

---

## **🧪 Testing Strategy**

### **Development Testing**
```bash
# Test API endpoint
curl http://localhost:3001/api/v1/health

# Test WebSocket connection (browser console)
const socket = io('http://localhost:3001/notifications');
socket.on('connect', () => console.log('WebSocket connected on same port'));
```

### **Production Testing**
```bash
# Test API endpoint  
curl https://api.agrinova.com/api/v1/health

# Test WebSocket connection
wscat -c wss://api.agrinova.com/notifications
```

---

## **🎯 Summary: Why Single Port Architecture**

1. **Industry Standard**: Most modern applications use single port with path routing
2. **Production Ready**: Easier deployment, monitoring, and maintenance
3. **Security Enhanced**: Reduced attack surface, unified SSL/TLS
4. **Performance Optimized**: Fewer connections, better resource utilization
5. **Developer Friendly**: Simplified CORS, easier local development
6. **Cost Effective**: Fewer SSL certificates, simpler infrastructure

**✅ Recommendation: Migrate to single port (3001) architecture immediately for better production readiness and developer experience.**