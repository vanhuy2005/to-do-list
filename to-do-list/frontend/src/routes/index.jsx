import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "@/layouts/Mainlayout";
import HomePage from "@/pages/HomePage";
import TaskDetailPage from "@/pages/TaskDetailPage";
import NewTaskPage from "@/pages/NewTaskPage";
import EditTaskPage from "@/pages/EditTaskPage";
import FilterPage from "@/pages/FilterPage";
import ViewAllPage from "@/pages/ViewAllPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ActivitiesPage from "@/pages/ActivitiesPage";
import SettingsPage from "@/pages/SettingsPage";
import ProfilePage from "@/pages/ProfilePage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";
import DashboardPage from "@/pages/DashboardPage";
import UnsubscribePage from "@/pages/UnsubscribePage";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthRoute from "@/components/AuthRoute";
import RoleRoute from "@/components/RoleRoute";

export const router = createBrowserRouter([
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <RoleRoute allowRoles={["admin"]} fallbackPath="/">
          <DashboardPage />
        </RoleRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RoleRoute allowRoles={["user"]} fallbackPath="/dashboard">
          <MainLayout />
        </RoleRoute>
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "tasks", element: <Navigate to="/" replace /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:id", element: <ProjectDetailPage /> },
      { path: "tasks/new", element: <NewTaskPage /> },
      { path: "tasks/:id", element: <TaskDetailPage /> },
      { path: "tasks/:id/edit", element: <EditTaskPage /> },
      { path: "view-all", element: <ViewAllPage /> },
      { path: "filter", element: <FilterPage /> },
      { path: "activities", element: <ActivitiesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/login",
    element: (
      <AuthRoute>
        <LoginPage />
      </AuthRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <AuthRoute>
        <RegisterPage />
      </AuthRoute>
    ),
  },
  {
    path: "/unsubscribe",
    element: <UnsubscribePage />,
  },
]);
