"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, LogOut } from "lucide-react";
import { clearToken, isAuthenticated } from "@/lib/adminAuth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  if (!ready) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-6">
        <div className="flex flex-col gap-6">
          <span className="px-2 text-sm font-semibold text-slate-900">Painel admin</span>
          <nav className="flex flex-col gap-1">
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <Building2 className="h-4 w-4" />
              Empresas
            </Link>
          </nav>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
