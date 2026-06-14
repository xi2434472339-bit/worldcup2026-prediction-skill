import { Activity, CalendarDays, History, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Link className="brand" to="/">
        <span className="brand-mark"><Activity size={21} /></span>
        <span>
          <strong>戈瓦预测</strong>
          <small>GOVA PREDICTION</small>
        </span>
      </Link>
      <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-label="菜单">
        {open ? <X /> : <Menu />}
      </button>
      <nav className={open ? "nav-open" : ""} onClick={() => setOpen(false)}>
        <NavLink to="/">AI 预测</NavLink>
        <NavLink to="/schedule"><CalendarDays size={16} />完整赛程</NavLink>
        <NavLink to="/history"><History size={16} />公开战绩</NavLink>
        <a href="/#pricing">获取次数</a>
      </nav>
    </header>
  );
}
