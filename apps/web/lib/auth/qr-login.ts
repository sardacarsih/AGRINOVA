'use client';

export interface QRLoginSession {
  id: string;
  qrData: string;
  expiresAt: Date;
  status: 'pending' | 'confirmed' | 'expired';
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

class QRLoginManager {
  private sessions = new Map<string, QRLoginSession>();
  private listeners = new Map<string, (session: QRLoginSession) => void>();

  generateSession(): QRLoginSession {
    const id = this.generateId();
    const session: QRLoginSession = {
      id,
      qrData: `agrinova://login/${id}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      status: 'pending'
    };

    this.sessions.set(id, session);
    
    // Auto-expire session
    setTimeout(() => {
      const currentSession = this.sessions.get(id);
      if (currentSession && currentSession.status === 'pending') {
        currentSession.status = 'expired';
        this.notifyListener(id, currentSession);
        this.sessions.delete(id);
      }
    }, 5 * 60 * 1000);

    return session;
  }

  getSession(id: string): QRLoginSession | undefined {
    return this.sessions.get(id);
  }

  confirmSession(id: string, user: any): boolean {
    const session = this.sessions.get(id);
    if (!session || session.status !== 'pending' || new Date() > session.expiresAt) {
      return false;
    }

    session.status = 'confirmed';
    session.user = user;
    this.notifyListener(id, session);
    return true;
  }

  subscribeToSession(id: string, callback: (session: QRLoginSession) => void) {
    this.listeners.set(id, callback);
  }

  unsubscribeFromSession(id: string) {
    this.listeners.delete(id);
  }

  private notifyListener(id: string, session: QRLoginSession) {
    const listener = this.listeners.get(id);
    if (listener) {
      listener(session);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Mock method to simulate mobile app confirmation
  mockConfirmLogin(sessionId: string, userEmail: string) {
    // In real implementation, this would be called by the mobile app via API
    const mockUsers = {
      'mandor@agrinova.com': { id: '1', email: 'mandor@agrinova.com', name: 'Ahmad Mandor', role: 'mandor' },
      'asisten@agrinova.com': { id: '2', email: 'asisten@agrinova.com', name: 'Sari Asisten', role: 'asisten' },
      'satpam@agrinova.com': { id: '3', email: 'satpam@agrinova.com', name: 'Budi Satpam', role: 'satpam' },
      'manager@agrinova.com': { id: '4', email: 'manager@agrinova.com', name: 'Andi Manager', role: 'manager' },
      'area-manager@agrinova.com': { id: '5', email: 'area-manager@agrinova.com', name: 'Sari Area Manager', role: 'area_manager' },
    };

    const user = mockUsers[userEmail as keyof typeof mockUsers];
    if (user) {
      return this.confirmSession(sessionId, user);
    }
    return false;
  }
}

export const qrLoginManager = new QRLoginManager();