import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Admin } from '../types';

interface AuthContextType {
  user: User | null;
  adminData: Admin | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && user.email) {
        try {
          if (user.email === "hinhanhtramcongcong@gmail.com") {
            setAdminData({
              id: user.email,
              email: user.email,
              role: 'admin',
              teamAccess: 'ALL',
              createdAt: Date.now()
            });
          } else {
            const adminDoc = await getDoc(doc(db, 'admins', user.email));
            if (adminDoc.exists()) {
              setAdminData(adminDoc.data() as Admin);
            } else {
              setAdminData(null);
            }
          }
        } catch (error) {
          console.error("Error fetching admin data:", error);
          setAdminData(null);
        }
      } else {
        setAdminData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, adminData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
