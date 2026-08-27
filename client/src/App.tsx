import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import type { ReactNode } from "react";
import { useAuth } from "./_core/hooks/useAuth";
import ArcaneFrontier from "./pages/ArcaneFrontier";
import CreatorStudio from "./pages/CreatorStudio";
import CreatorDomainWorkbench from "./pages/CreatorDomainWorkbench";

function getCreatorRoute(): "studio" | "workbench" | null {
  if (typeof window === "undefined") return null;
  const enabled = import.meta.env.DEV || import.meta.env.VITE_CREATOR_STUDIO_ENABLED === "true";
  if (!enabled) return null;
  if (window.location.pathname === "/creator-studio") return "studio";
  if (window.location.pathname === "/creator-workbench") return "workbench";
  return null;
}

function CreatorAccessGate({ children }: { children: ReactNode }) {
  const { user, loading, error } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070a10] px-6 text-slate-100">
        <section className="w-full max-w-md rounded-2xl border border-cyan-300/20 bg-[#0c1422] p-6 text-center shadow-2xl shadow-cyan-950/20" aria-live="polite">
          <p className="text-xs font-black tracking-[0.18em] text-cyan-200">A_SURVIVAL CREATOR STUDIO</p>
          <h1 className="mt-3 text-xl font-bold text-white">กำลังตรวจสอบสิทธิ์ผู้พัฒนา</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">พื้นที่นี้แยกจากหน้าผู้เล่น และเปิดเฉพาะบัญชีผู้ดูแลระบบเท่านั้น</p>
        </section>
      </main>
    );
  }

  const deniedMessage = error
    ? "ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองเปิดหน้านี้ใหม่จากบัญชีผู้ดูแลระบบ"
    : !user
      ? "กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset"
      : "บัญชีนี้ไม่มีสิทธิ์เข้าพื้นที่สร้าง asset";

  if (!user || user.role !== "admin") {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#070a10] px-6 text-slate-100">
        <section className="w-full max-w-md rounded-2xl border border-amber-300/20 bg-[#0c1422] p-6 shadow-2xl shadow-black/30" role="alert">
          <p className="text-xs font-black tracking-[0.18em] text-amber-200">DEVELOPER ONLY</p>
          <h1 className="mt-3 text-xl font-bold text-white">เข้า Creator Studio ไม่ได้</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">{deniedMessage}</p>
          <a href="/" className="mt-5 inline-flex rounded-lg border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100">กลับหน้าผู้เล่น</a>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

function App() {
  const creatorRoute = getCreatorRoute();
  const creatorPage = creatorRoute === "workbench" ? <CreatorDomainWorkbench /> : <CreatorStudio />;
  const page = creatorRoute ? <CreatorAccessGate>{creatorPage}</CreatorAccessGate> : <ArcaneFrontier />;

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {page}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
