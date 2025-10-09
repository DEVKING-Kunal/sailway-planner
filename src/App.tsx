import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Inventory from "./pages/Inventory";
import Wagons from "./pages/Wagons";
import LoadingPoints from "./pages/LoadingPoints";
import Plans from "./pages/Plans";
import Scenarios from "./pages/Scenarios";
import Admin from "./pages/Admin";
import RoleRequest from "./pages/RoleRequest";
import AdminRoleRequests from "./pages/AdminRoleRequests";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute requireRole="viewer">
                <Layout><Orders /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute requireRole="viewer">
                <Layout><Inventory /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/wagons" element={
              <ProtectedRoute requireRole="viewer">
                <Layout><Wagons /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/loading-points" element={
              <ProtectedRoute requireRole="viewer">
                <Layout><LoadingPoints /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/plans" element={
              <ProtectedRoute requireRole="planner">
                <Layout><Plans /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/scenarios" element={
              <ProtectedRoute requireRole="senior_planner">
                <Layout><Scenarios /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireRole="admin">
                <Layout><Admin /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/role-request" element={
              <ProtectedRoute>
                <Layout><RoleRequest /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/role-requests" element={
              <ProtectedRoute requireRole="admin">
                <Layout><AdminRoleRequests /></Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
