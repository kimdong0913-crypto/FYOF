import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpRight, LogOut, Search, ScanFace, Shirt, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";
import { useUser } from "@/lib/session";

export function SiteHeader() {
  const location = useLocation();
  const path = location.pathname;
  const user = useUser();
  return <header className="site-header">
    <div className="site-header-inner">
      <Link to="/" className="brand" aria-label="FYOF 홈">FYOF<span className="brand-dot">.</span></Link>
      <nav className="main-nav" aria-label="주 메뉴">
        <Link to="/" className={path === "/" ? "nav-active" : ""}>DISCOVER</Link>
        <Link to="/results" search={{ q: "전체" }} className={path === "/results" || path.startsWith("/item") ? "nav-active" : ""}>STYLE GUIDE</Link>
        <Link to="/fitting" search={{ item: "wide" }} className={path === "/fitting" ? "nav-active" : ""}>VIRTUAL FIT</Link>
        <Link to="/closet" className={path === "/closet" ? "nav-active" : ""}>MY CLOSET</Link>
      </nav>
      <div className="header-actions">
        <Link to="/results" search={{ q: "전체" }} aria-label="스타일 가이드 검색" className="header-icon"><Search size={19} strokeWidth={1.7} /></Link>
        {user
          ? <div className="header-account"><Link to="/closet" className="header-user" title="나만의 옷장"><Shirt size={16}/> {user.nickname}</Link><button type="button" className="header-icon" aria-label="로그아웃" title="로그아웃" onClick={() => void logout()}><LogOut size={17} strokeWidth={1.7}/></button></div>
          : <Link to="/login" search={{ redirect: location.href }} className="header-user"><User size={16}/> 로그인</Link>}
        <Button asChild variant="outline" className="header-fit"><Link to="/fitting" search={{ item: "wide" }}><ScanFace size={16}/> TRY ON <ArrowUpRight size={15}/></Link></Button>
      </div>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner"><span className="footer-brand">FYOF.</span><span>FIND YOUR FORM. / SEOUL, KR</span><span>© 2026 FYOF STYLE GUIDE</span></div></footer>;
}
