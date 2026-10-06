import {
  createHashRouter,
} from "react-router-dom";

import {
  NotFound,
} from "@/components/common/NotFound";

import {
  ProtectedRoute,
} from "@/components/common/ProtectedRoute";

import {
  RoleRoute,
} from "@/components/common/RoleRoute";

import {
  routes,
} from "@/config/routes";

import {
  AuthLayout,
} from "@/layouts/AuthLayout";

import {
  DashboardLayout,
} from "@/layouts/DashboardLayout";

import AdminDashboardPage from "@/pages/AdminDashboardPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import AdminLocationsPage from "@/pages/AdminLocationsPage";
import AlertsPage from "@/pages/AlertsPage";
import DashboardPage from "@/pages/DashboardPage";
import DiagnosePage from "@/pages/DiagnosePage";
import DiagnosisHistoryPage from "@/pages/DiagnosisHistoryPage";
import FarmsPage from "@/pages/FarmsPage";
import FieldsPage from "@/pages/FieldsPage";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import OfficerCasesPage from "@/pages/OfficerCasesPage";
import OfficerDashboardPage from "@/pages/OfficerDashboardPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import WeatherPage from "@/pages/WeatherPage";


export const router =
  createHashRouter([
    {
      path:
        routes.home,
      element:
        <LandingPage />,
    },

    {
      element:
        <AuthLayout />,

      children: [
        {
          path:
            routes.login,
          element:
            <LoginPage />,
        },
        {
          path:
            routes.register,
          element:
            <RegisterPage />,
        },
      ],
    },

    {
      element: (
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      ),

      children: [
        {
          path:
            routes.dashboard,
          element:
            <DashboardPage />,
        },

        {
          path:
            routes.farms,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <FarmsPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.fields,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <FieldsPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.diagnose,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <DiagnosePage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.diagnosisHistory,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <DiagnosisHistoryPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.weather,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <WeatherPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.alerts,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <AlertsPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.profile,
          element:
            <ProfilePage />,
        },

        {
          path:
            routes.officer,
          element: (
            <RoleRoute
              roles={[
                "extension_officer",
                "admin",
              ]}
            >
              <OfficerDashboardPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.officerCases,
          element: (
            <RoleRoute
              roles={[
                "extension_officer",
                "admin",
              ]}
            >
              <OfficerCasesPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.admin,
          element: (
            <RoleRoute
              roles={[
                "admin",
              ]}
            >
              <AdminDashboardPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.adminUsers,
          element: (
            <RoleRoute
              roles={[
                "admin",
              ]}
            >
              <AdminUsersPage />
            </RoleRoute>
          ),
        },

        {
          path:
            routes.adminLocations,
          element: (
            <RoleRoute roles={["admin"]}>
              <AdminLocationsPage />
            </RoleRoute>
          ),
        },
      ],
    },

    {
      path: "*",
      element:
        <NotFound />,
    },
  ]);
