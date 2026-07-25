import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User, Menu, X } from "lucide-react";
import hiiLogo from "@/assets/hii-logo-transparent.png";
import nsaLogo from "@/assets/nsa-logo.png";
import gcntLogo from "@/assets/gcnt-logo.png";
import dldLogo from "@/assets/dld-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isAdmin, isAdvisor, isStudent, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-navy/90 backdrop-blur-md">
      <div className="container mx-auto flex h-auto items-center justify-between gap-4 px-4 py-3">
        <Link to="/" onClick={close} className="flex flex-col items-start leading-tight">
          <div className="mb-1 flex items-center gap-2 py-1 md:mb-2 md:gap-3 md:px-3 md:py-1.5">
            <img src={hiiLogo} alt="HII" className="h-8 w-8 object-contain md:h-10 md:w-10" />
            <img src={gcntLogo} alt="Global Compact Network Thailand" className="h-8 w-auto object-contain md:h-10" />
            <img src={dldLogo} alt="DLD" className="h-8 w-auto object-contain md:h-10" />
            <img src={nsaLogo} alt="NSA" className="h-8 w-auto object-contain md:h-10" />
          </div>
          <span className="font-heading text-base font-extrabold uppercase tracking-tight text-white md:text-lg">
            ThaiWater <span className="text-teal">Challenge</span>
          </span>
          <span className="hidden text-[10px] font-medium tracking-wide text-teal/80 sm:block">
            โครงการอบรมแลกเปลี่ยนเรียนรู้และการประยุกต์
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-white/90 transition-colors hover:text-teal">หน้าแรก</Link>
          <Link to="/partners" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">ภาคีเครือข่าย</Link>
          <Link to="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">เกี่ยวกับโครงการ</Link>
          <Link to="/advisor/register" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">ลงทะเบียนสถาบัน</Link>
          <Link to="/trainings" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">เยาวชนเข้าร่วมโครงการ</Link>
          <Link to="/contest" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">ประกวดชิงรางวัล</Link>
          {isAdvisor && (
            <Link to="/advisor/dashboard" className="text-sm font-medium text-teal transition-colors hover:text-teal/80">ระบบอนุมัติ</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-teal transition-colors hover:text-teal/80">ผู้ดูแลระบบ</Link>
          )}
          {isStudent && (
            <Link to="/student/dashboard" className="text-sm font-medium text-teal transition-colors hover:text-teal/80">แดชบอร์ดนักเรียน</Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm text-white/70">
                <User className="h-4 w-4" />
                <span>{user.full_name ?? user.email}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={signOut}
                className="gap-1.5 text-white/70 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                ออกจากระบบ
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/student/login">
                <Button size="sm" variant="ghost" className="gap-1.5 text-teal/80 hover:text-teal">
                  <LogIn className="h-4 w-4" />
                  นักเรียน
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" variant="ghost" className="gap-1.5 text-white/70 hover:text-white">
                  <LogIn className="h-4 w-4" />
                  เจ้าหน้าที่
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Hamburger button — mobile only */}
        <button
          className="rounded-md p-2 text-white/80 hover:text-white md:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-navy/95 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <Link to="/" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-teal">หน้าแรก</Link>
            <Link to="/partners" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-teal">ภาคีเครือข่าย</Link>
            <Link to="/about" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-teal">เกี่ยวกับโครงการ</Link>
            <Link to="/advisor/register" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-teal">ลงทะเบียนสถาบัน</Link>
            <Link to="/trainings" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-teal">เยาวชนเข้าร่วมโครงการ</Link>
            <Link to="/contest" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-teal">ประกวดชิงรางวัล</Link>
            {isAdvisor && (
              <Link to="/advisor/dashboard" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-teal hover:bg-white/10">ระบบอนุมัติ</Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-teal hover:bg-white/10">ผู้ดูแลระบบ</Link>
            )}
            {isStudent && (
              <Link to="/student/dashboard" onClick={close} className="rounded-md px-3 py-2 text-sm font-medium text-teal hover:bg-white/10">แดชบอร์ดนักเรียน</Link>
            )}

            <div className="mt-2 border-t border-white/10 pt-3">
              {user ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 px-3 text-sm text-white/70">
                    <User className="h-4 w-4" />
                    <span>{user.full_name ?? user.email}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { signOut(); close(); }}
                    className="justify-start gap-1.5 px-3 text-white/70 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    ออกจากระบบ
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Link to="/student/login" onClick={close}>
                    <Button size="sm" variant="ghost" className="w-full justify-start gap-1.5 px-3 text-teal/80 hover:text-teal">
                      <LogIn className="h-4 w-4" />
                      นักเรียน
                    </Button>
                  </Link>
                  <Link to="/login" onClick={close}>
                    <Button size="sm" variant="ghost" className="w-full justify-start gap-1.5 px-3 text-white/70 hover:text-white">
                      <LogIn className="h-4 w-4" />
                      เจ้าหน้าที่
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
