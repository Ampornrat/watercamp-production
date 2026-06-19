export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-muted/30">
      <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">ศูนย์ฝึกอบรม คลังข้อมูลน้ำแห่งชาติ</p>
        <p className="mt-1">© {new Date().getFullYear()} National Hydroinformatics Data Center. All rights reserved.</p>
      </div>
    </footer>
  );
}
