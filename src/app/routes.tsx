import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { CalendarPage } from "./pages/CalendarPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { BugReportPage } from "./pages/BugReportPage";
import { AdminPage } from "./pages/AdminPage";
import { EmployeeManagementPage } from "./pages/EmployeeManagementPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: CalendarPage },
      { path: "profile", Component: ProfilePage },
      { path: "profile/employees", Component: EmployeesPage },
      { path: "profile/reports", Component: ReportsPage },
      { path: "profile/settings", Component: SettingsPage },
      { path: "profile/settings/admin", Component: AdminPage },
      { path: "profile/settings/admin/employees", Component: EmployeeManagementPage },
      { path: "profile/bug-report", Component: BugReportPage },
    ],
  },
]);
