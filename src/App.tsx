import { Navigate, Route, Routes } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { AdminPage } from "./pages/AdminPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { SchedulePage } from "./pages/SchedulePage";

export default function App() {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/manage-gova" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div>
          <strong>戈瓦预测</strong>
          <span>仅供娱乐与球迷讨论，不提供投注、赔率或下注建议。</span>
        </div>
        <span>基于 MIT 开源 Skill 二次开发 · 数据以页面更新时间为准</span>
      </footer>
    </div>
  );
}
