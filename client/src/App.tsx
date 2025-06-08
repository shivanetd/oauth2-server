import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AdminPage from "@/pages/admin-page";
import AdminUsersPage from "@/pages/admin-users-page";
import AdminClientsPage from "@/pages/admin-clients-page";
import ScopeDemoPage from "@/pages/scope-demo-page";
import UserTrendsPage from "@/pages/user-trends-page";
import EnterpriseDashboard from "@/pages/enterprise-dashboard";
import MultiTenantDashboard from "@/pages/multi-tenant-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <ProtectedRoute path="/" component={HomePage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute path="/admin" component={AdminPage} />
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute path="/admin/users" component={AdminUsersPage} />
      </Route>
      <Route path="/admin/clients">
        <ProtectedRoute path="/admin/clients" component={AdminClientsPage} />
      </Route>
      <Route path="/admin/scope-demo">
        <ProtectedRoute path="/admin/scope-demo" component={ScopeDemoPage} />
      </Route>
      <Route path="/admin/trends">
        <ProtectedRoute path="/admin/trends" component={UserTrendsPage} />
      </Route>
      <Route path="/admin/enterprise">
        <ProtectedRoute path="/admin/enterprise" component={EnterpriseDashboard} />
      </Route>
      <Route path="/multi-tenant">
        <ProtectedRoute path="/multi-tenant" component={MultiTenantDashboard} />
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
