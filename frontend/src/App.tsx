import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { WalletProviders } from "@/components/providers/WalletProviders";
import { DashboardPage } from "@/pages/Dashboard";
import { PortfolioPage } from "@/pages/Portfolio";
import { DcaPage } from "@/pages/Dca";
import { SettingsPage } from "@/pages/Settings";
import { ActivityPage } from "@/pages/Activity";

export default function App() {
  return (
    <WalletProviders>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/dca" element={<DcaPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </WalletProviders>
  );
}
