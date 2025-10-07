

import AnalyticsPage from "./pages/AnalyticsPage";
import AIMLPage from "./pages/AIMLPage";
import GrafanaPage from "./pages/GrafanaPage";
import PrometheusPage from "./pages/PrometheusPage";
import NoticeBoard from "./pages/NoticeBoard";

import { Home, Zap, Calendar, Users as UsersIcon, Settings as SettingsIcon, Bell, LogOut, Shield, UserCheck, User, Ticket, FileText, Activity, BarChart3, Server, Settings2, Brain, Monitor, Link, LayoutDashboard } from "lucide-react";
import Index from "./pages/Index";
import Devices from "./pages/Devices";
import Switches from "./pages/Switches";
import Master from "./pages/Master";
import Schedule from "./pages/Schedule";
import Users from "./pages/Users";
import PermissionManagement from "./pages/PermissionManagement";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import Tickets from "./pages/Tickets";
import NotFound from "./pages/NotFound";
import ActiveLogs from "./pages/ActiveLogs";
import SystemHealthPage from "./pages/SystemHealthPage";
import IntegrationsPage from "./pages/IntegrationsPage";

export const navItems = [
  // ===== DASHBOARD =====
  {
    title: "Power Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    pageName: "dashboard",
    description: "Main dashboard overview"
  },
  // ===== CORE OPERATIONS =====
  {
    title: "Devices",
    to: "/dashboard/devices",
    icon: <Zap className="h-4 w-4" />,
    page: <Devices />,
  },
  {
    title: "Switches",
    to: "/dashboard/switches",
    icon: <Zap className="h-4 w-4" />,
    page: <Switches />,
  },
  {
    title: "Master Control",
    to: "/dashboard/master",
    icon: <Shield className="h-4 w-4" />,
    page: <Master />,
  },

  // ===== SCHEDULING =====
  {
    title: "Schedule",
    to: "/dashboard/schedule",
    icon: <Calendar className="h-4 w-4" />,
    page: <Schedule />,
  },

  // ===== ANALYTICS & MONITORING =====
  {
    title: "Analytics & Monitoring",
    to: "/dashboard/analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    page: <AnalyticsPage />,
  },
  {
    title: "AI/ML Insights",
    to: "/dashboard/aiml",
    icon: <Brain className="h-4 w-4" />,
    page: <AIMLPage />,
  },
  {
    title: "Grafana Analytics",
    to: "/dashboard/grafana",
    icon: <BarChart3 className="h-4 w-4" />,
    page: <GrafanaPage />,
  },
  {
    title: "Prometheus Metrics",
    to: "/dashboard/prometheus",
    icon: <Monitor className="h-4 w-4" />,
    page: <PrometheusPage />,
  },

  // ===== OPERATIONS & MAINTENANCE =====
  {
    title: "Notice Board",
    to: "/dashboard/notices",
    icon: <FileText className="h-4 w-4" />,
    page: <NoticeBoard />,
  },
  {
    title: "Advanced Integrations",
    to: "/dashboard/integrations",
    icon: <Link className="h-4 w-4" />,
    page: <IntegrationsPage />,
  },

  // ===== USER MANAGEMENT =====
  {
    title: "Users",
    to: "/dashboard/users",
    icon: <UsersIcon className="h-4 w-4" />,
    page: <Users />,
  },
  {
    title: "Role Management",
    to: "/dashboard/roles",
    icon: <Shield className="h-4 w-4" />,
    page: <PermissionManagement />,
  },
  {
    title: "Permissions",
    to: "/dashboard/permissions",
    icon: <UserCheck className="h-4 w-4" />,
    page: <PermissionManagement />,
  },

  // ===== SUPPORT & LOGS =====
  {
    title: "Support Tickets",
    to: "/dashboard/tickets",
    icon: <Ticket className="h-4 w-4" />,
    page: <Tickets />,
  },
  {
    title: "Active Logs",
    to: "/dashboard/logs",
    icon: <FileText className="h-4 w-4" />,
    page: <ActiveLogs />,
  },

  // ===== ACCOUNT & SETTINGS =====
  {
    title: "Profile",
    to: "/dashboard/profile",
    icon: <User className="h-4 w-4" />,
    page: <UserProfile />,
  },
  {
    title: "Settings",
    to: "/dashboard/settings",
    icon: <SettingsIcon className="h-4 w-4" />,
    page: <Settings />,
  },
];

// Additional nav items that might be used in header/sidebar
export const headerNavItems = [
  {
    title: "Notifications",
    icon: <Bell className="h-4 w-4" />,
    action: "notifications",
  },
  {
    title: "Logout",
    icon: <LogOut className="h-4 w-4" />,
    action: "logout",
  },
];

// 404 page
export const notFoundPage = <NotFound />;
