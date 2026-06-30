import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { OcrResultProvider } from "./context/OcrResultContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PurchaseOrdersPage } from "./pages/PurchaseOrdersPage";
import { UploadPage } from "./pages/UploadPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AuditLogsPage } from "./pages/AuditLogsPage";
import { UsersPage } from "./pages/UsersPage";
import { SettingsPage } from "./pages/SettingsPage";
import { OCRResultsPage } from "./pages/OCRResultsPage";
import { PODetailsPage } from "./pages/PODetailsPage";
import { Toaster } from "sonner";

function AppShell() {
  const { isAuthenticated, user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <LoginPage onLogin={() => setCurrentPage("dashboard")} />
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    );
  }

  const handleNavigate = (page: string, poId?: string) => {
    console.log("Navigate to:", page, "poId:", poId);
    if (poId) setSelectedPoId(poId);
    setTimeout(() => setCurrentPage(page), 0);
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "purchase-orders":
        return <PurchaseOrdersPage onNavigate={handleNavigate} />;
      case "upload":
        return <UploadPage onNavigate={handleNavigate} />;
      case "notifications":
        return <NotificationsPage />;
      case "audit-logs":
        return <AuditLogsPage />;
      case "users":
        return <UsersPage />;
      case "settings":
        return <SettingsPage />;
      case "ocr-results":
        return <OCRResultsPage onNavigate={handleNavigate} />;
      case "po-details":
        return (
          <PODetailsPage
            poId={selectedPoId}
            onBack={() => setCurrentPage("purchase-orders")}
          />
        );
      default:
        return <DashboardPage />;
    }
  };

  return (
    <ThemeProvider>
      <NotificationsProvider>
        <OcrResultProvider>
          <Layout
            currentPage={currentPage}
            onNavigate={handleNavigate}
            userRole={user?.role}
            onLogout={logout}
          >
            {renderPage()}
          </Layout>
          <Toaster position="top-right" richColors />
        </OcrResultProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}

export default function App() {
  {
    /* MARKER-MAKE-KIT-INVOKED */
  }
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
