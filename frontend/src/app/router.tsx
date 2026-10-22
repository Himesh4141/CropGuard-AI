import { lazy } from "react";
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

const AdminDashboardPage = lazy(() => import("@/pages/AdminDashboardPage"));
const AdminUsersPage = lazy(() => import("@/pages/AdminUsersPage"));
const AdminLocationsPage = lazy(() => import("@/pages/AdminLocationsPage"));
const AdminCareCasesPage = lazy(() => import("@/pages/AdminCareCasesPage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const CareCasesPage = lazy(() => import("@/pages/CareCasesPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const DiagnosePage = lazy(() => import("@/pages/DiagnosePage"));
const DiagnosisHistoryPage = lazy(() => import("@/pages/DiagnosisHistoryPage"));
const FarmsPage = lazy(() => import("@/pages/FarmsPage"));
const FieldsPage = lazy(() => import("@/pages/FieldsPage"));
import LandingPage from "@/pages/LandingPage";
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const OfficerCasesPage = lazy(() => import("@/pages/OfficerCasesPage"));
const OfficerCareCasesPage = lazy(() => import("@/pages/OfficerCareCasesPage"));
const OfficerDashboardPage = lazy(() => import("@/pages/OfficerDashboardPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const WeatherPage = lazy(() => import("@/pages/WeatherPage"));


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
            routes.careCases,
          element: (
            <RoleRoute
              roles={[
                "farmer",
              ]}
            >
              <CareCasesPage />
            </RoleRoute>
          ),
        },

        {
          path: routes.homePlanters,
          lazy: async () => ({
            Component: (await import("@/pages/HomePlantersPage")).default,
          }),
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
            routes.officerCareCases,
          element: (
            <RoleRoute
              roles={[
                "extension_officer",
                "admin",
              ]}
            >
              <OfficerCareCasesPage />
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

        {
          path:
            routes.adminCareCases,
          element: (
            <RoleRoute roles={["admin"]}>
              <AdminCareCasesPage />
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
