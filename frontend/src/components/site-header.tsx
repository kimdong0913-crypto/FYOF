import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpRight, Search, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const path = useLocation().pathname;
  return <header className="site-header">
    <div className="site-header-inner">
      <Link to="/" className="brand" aria-label="FYOF 홈">FYOF<span className="brand-dot">.</span></Link>
      <nav className="main-nav" aria-label="주 메뉴">
        <Link to="/" className={path === "/" ? "nav-active" : ""}>DISCOVER</Link>
        <Link to="/results" search={{ q: "데님 바지" }} className={path === "/results" ? "nav-active" : ""}>STYLE INDEX</Link>
        <Link to="/fitting" search={{ item: "wide" }} className={path === "/fitting" ? "nav-active" : ""}>VIRTUAL FIT</Link>
      </nav>
      <div className="header-actions">
        <Link to="/results" search={{ q: "데님 바지" }} aria-label="검색 결과 보기" className="header-icon"><Search size={19} strokeWidth={1.7} /></Link>
        <Button asChild variant="outline" className="header-fit"><Link to="/fitting" search={{ item: "wide" }}><ScanFace size={16}/> TRY ON <ArrowUpRight size={15}/></Link></Button>
      </div>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner"><span className="footer-brand">FYOF.</span><span>FIND YOUR FORM. / SEOUL, KR</span><span>© 2026 FORME STUDIO</span></div></footer>;
}
