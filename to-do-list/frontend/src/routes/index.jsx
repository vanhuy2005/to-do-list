import { Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/Mainlayout";

import HomePage from "../pages/HomePage";
import TaskDetailPage from "../pages/TaskDetailPage";
import FilterPage from "../pages/FilterPage";
import SettingsPage from "../pages/SettingsPage";
import ProfilePage from "../pages/ProfilePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import NotFoundPage from "../pages/NotFoundPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Layout chung */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tasks/new" element={<HomePage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="/filter" element={<FilterPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Không dùng layout */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
