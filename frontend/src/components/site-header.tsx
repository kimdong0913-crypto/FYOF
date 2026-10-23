import { Link, useLocation } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, House, LogOut, ScanFace, Shirt, User, UserSearch } from "lucide-react";
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
        {/* 아이콘 + 작은 이름 (휴대폰에서는 아이콘만) */}
        <Link to="/" className={path === "/" ? "nav-active" : ""} title="홈"><House size={20} strokeWidth={1.6}/><span>홈</span></Link>
        <Link to="/results" search={{ q: "전체" }} className={path === "/results" || path.startsWith("/item") ? "nav-active" : ""} title="스타일 가이드"><BookOpen size={20} strokeWidth={1.6}/><span>스타일 가이드</span></Link>
        <Link to="/fitting" search={{ item: "denim", fit: "wide" }} className={path === "/fitting" ? "nav-active" : ""} title="가상 피팅"><ScanFace size={20} strokeWidth={1.6}/><span>가상 피팅</span></Link>
        <Link to="/closet" className={path === "/closet" ? "nav-active" : ""} title="옷장"><Shirt size={20} strokeWidth={1.6}/><span>옷장</span></Link>
        <Link to="/people" search={{ q: "" }} className={path === "/people" || path.startsWith("/u/") ? "nav-active" : ""} title="유저 검색"><UserSearch size={20} strokeWidth={1.6}/><span>유저 검색</span></Link>
      </nav>
      <div className="header-actions">
        {user
          ? <div className="header-account"><Link to="/me" className="header-user" title="내 페이지"><User size={16}/> {user.nickname}</Link><button type="button" className="header-icon" aria-label="로그아웃" title="로그아웃" onClick={() => void logout()}><LogOut size={17} strokeWidth={1.7}/></button></div>
          : <Link to="/login" search={{ redirect: location.href }} className="header-user"><User size={16}/> 로그인</Link>}
        <Button asChild variant="outline" className="header-fit"><Link to="/fitting" search={{ item: "denim", fit: "wide" }}><ScanFace size={16}/> TRY ON <ArrowUpRight size={15}/></Link></Button>
      </div>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner"><span className="footer-brand">FYOF.</span><span>FIND YOUR FORM. / SEOUL, KR</span><span>© 2026 FYOF STYLE GUIDE</span></div></footer>;
}
