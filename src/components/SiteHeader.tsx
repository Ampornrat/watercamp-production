import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User } from "lucide-react";
import hiiLogo from "@/assets/hii-logo-transparent.png";
import unLogo from "@/assets/un-global-compact-transparent.png";
import dctLogo from "@/assets/dct-logo.png";
import nsaLogo from "@/assets/nsa-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user, isAdmin, isAdvisor, isStudent, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-navy/90 backdrop-blur-md">
      <div className="container mx-auto flex h-auto items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex flex-col items-start leading-tight">
          <div className="mb-2 flex items-center gap-3 px-3 py-1.5">
            <img src={hiiLogo} alt="HII" className="h-10 w-10 object-contain" />
            <img src={unLogo} alt="UN Global Compact" className="h-10 w-auto object-contain" />
            <img src={dctLogo} alt="DCT" className="h-10 w-auto object-contain" />
            <img src={nsaLogo} alt="NSA" className="h-10 w-auto object-contain" />
          </div>
          <span className="font-heading text-lg font-extrabold uppercase tracking-tight text-white">
            ThaiWater <span className="text-teal">Challenge</span>
          </span>
          <span className="text-[10px] font-medium tracking-wide text-teal/80">
            โครงการอบรมแลกเปลี่ยนเรียนรู้และการประยุกต์
          </span>
        </Link>

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
      </div>
    </header>
  );
}
