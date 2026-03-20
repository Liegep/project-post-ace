import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/i18n/I18nContext";
import AuthGuard from "@/components/AuthGuard";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import ClientPage from "./pages/ClientPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import AcceptInvitePage from "./pages/AcceptInvitePage.tsx";
import SocialDashboard from "./pages/SocialDashboard.tsx";
import SocialCallbackPage from "./pages/SocialCallbackPage.tsx";
import TeamManagementPage from "./pages/TeamManagementPage.tsx";
import TeamDashboard from "./pages/TeamDashboard.tsx";
import AgendaPage from "./pages/AgendaPage.tsx";
import IdeasPage from "./pages/IdeasPage.tsx";
import CalendarPage from "./pages/CalendarPage.tsx";
import BriefsPage from "./pages/BriefsPage.tsx";
import CommemorativeDatesPage from "./pages/CommemorativeDatesPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><AdminDashboard /></AuthGuard>} />
            <Route path="/admin/:slug" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><AdminPage /></AuthGuard>} />
            <Route path="/social" element={<AuthGuard allowedRoles={["super_admin", "admin"]}><SocialDashboard /></AuthGuard>} />
            <Route path="/social/callback" element={<SocialCallbackPage />} />
            <Route path="/team" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><TeamDashboard /></AuthGuard>} />
            <Route path="/team-management" element={<AuthGuard allowedRoles={["super_admin", "admin"]}><TeamManagementPage /></AuthGuard>} />
            <Route path="/agenda" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><AgendaPage /></AuthGuard>} />
            <Route path="/ideas" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><IdeasPage /></AuthGuard>} />
            <Route path="/calendar" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><CalendarPage /></AuthGuard>} />
            <Route path="/briefs" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador"]}><BriefsPage /></AuthGuard>} />
            <Route path="/client/:slug" element={<AuthGuard allowedRoles={["super_admin", "admin", "colaborador", "client"]}><ClientPage /></AuthGuard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
