import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchBox({ initial = "", large = false }: { initial?: string; large?: boolean }) {
  const [query, setQuery] = useState(initial);
  const navigate = useNavigate();
  const submit = (e: FormEvent) => { e.preventDefault(); navigate({ to: "/results", search: { q: query.trim() || "전체" } }); };
  return <form onSubmit={submit} className={large ? "search-box search-box-large" : "search-box"} role="search">
    <Search size={large ? 27 : 21} strokeWidth={1.5}/>
    <input aria-label="아이템 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="무스탕, 후드티, 슬랙스… 어떤 옷을 입을까요?" />
    <Button type="submit" size={large ? "lg" : "default"} aria-label="검색"><span className="search-submit-label">SEARCH</span><ArrowUpRight size={18}/></Button>
  </form>;
}
