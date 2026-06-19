import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, User as UserIcon, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import hiiLogo from "@/assets/hii-logo-transparent.png";
import unLogo from "@/assets/un-global-compact-transparent.png";
import dctLogo from "@/assets/dct-logo.png";
import nsaLogo from "@/assets/nsa-logo.png";

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




        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/" className="text-sm font-medium text-white/90 transition-colors hover:text-teal">หน้าแรก</Link>
          <Link to="/partners" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">ภาคีเครือข่าย</Link>
          <Link to="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">เกี่ยวกับโครงการ</Link>
          <Link to="/advisor/register" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">ลงทะเบียนสถาบัน</Link>
          <Link to="/trainings" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">เยาวชนเข้าร่วมโครงการ</Link>
          <Link to="/contest" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">ประกวดชิงรางวัล</Link>
          {user && isStudent && (
            <Link to="/dashboard" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">การลงทะเบียนของฉัน</Link>
          )}
          {user && isAdvisor && (
            <>
              <Link to="/advisor/dashboard" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">อนุมัตินักศึกษา</Link>
              <Link to="/advisor/queue" className="text-sm font-medium text-white/70 transition-colors hover:text-teal">คิวอนุมัติ</Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-teal transition-colors hover:text-white">
              <Shield className="h-4 w-4" />ผู้ดูแลระบบ
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/dashboard" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 hover:text-white">
                  <UserIcon className="mr-1 h-4 w-4" />{user.email?.split("@")[0]}
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => signOut()}
                className="rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <LogOut className="mr-1 h-4 w-4" />ออกจากระบบ
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button
                size="sm"
                className="rounded-full bg-teal px-5 font-bold text-navy shadow-glow hover:bg-teal/90"
              >
                <LogIn className="mr-1 h-4 w-4" />เข้าสู่ระบบ
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
