import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken, setUnauthorizedHandler, User } from "./api";
import { finishTracking } from "./tracking/tracking";

type AuthState = {
  ready: boolean;
  user: User | null;
  companyName: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  money: (n: number) => string;
};

const AuthContext = createContext<AuthState>(null as unknown as AuthState);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<{ code?: string; locale?: string }>({});

  const loadMe = useCallback(async () => {
    const me = await api<{ user: User; company: { companyName?: string; currency?: string; locale?: string } | null }>("/sales/me");
    setUser(me.user);
    setCompanyName(me.company?.companyName ?? null);
    setCurrency({ code: me.company?.currency, locale: me.company?.locale });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      try {
        if (await getToken()) await loadMe();
      } catch {
        // Offline at launch: keep the saved session; screens retry when back online.
        if (await getToken()) setUser({ _id: "", firstName: "", lastName: "", email: "", mobile: "" });
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [loadMe]);

  const signIn = async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/sales/login", { method: "POST", body: { email, password }, auth: false });
    await setToken(res.token);
    setUser(res.user);
    loadMe().catch(() => {});
  };

  const signOut = async () => {
    await finishTracking().catch(() => {});
    await setToken(null);
    setUser(null);
  };

  // Order values in the company's own currency (INR, CAD, ...), as set in the CRM.
  const money = (n: number) => {
    try {
      return currency.code
        ? new Intl.NumberFormat(currency.locale || undefined, { style: "currency", currency: currency.code, maximumFractionDigits: 0 }).format(n)
        : n.toLocaleString();
    } catch {
      return `${currency.code ?? ""} ${n.toLocaleString()}`.trim();
    }
  };

  return <AuthContext.Provider value={{ ready, user, companyName, signIn, signOut, money }}>{children}</AuthContext.Provider>;
}
