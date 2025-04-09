import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  startRegistration,
  startAuthentication
} from "@simplewebauthn/browser";

type AuthResponse = SelectUser | { user: SelectUser, redirect: string };

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthResponse, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthResponse, Error, InsertUser>;
  
  // WebAuthn
  passkeyLoginMutation: UseMutationResult<AuthResponse, Error, { username: string }>;
  registerPasskeyMutation: UseMutationResult<{ status: string, message: string }, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: SelectUser | { user: SelectUser, redirect: string }) => {
      if ('user' in data && 'redirect' in data) {
        // Handle response with redirect
        queryClient.setQueryData(["/api/user"], data.user);
        
        // If we have a redirect URL from an OAuth flow, don't navigate immediately
        // Let the auth page handle the redirection
      } else {
        // Standard user login without redirect
        queryClient.setQueryData(["/api/user"], data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (data: SelectUser | { user: SelectUser, redirect: string }) => {
      if ('user' in data && 'redirect' in data) {
        // Handle response with redirect
        queryClient.setQueryData(["/api/user"], data.user);
        
        // If we have a redirect URL from an OAuth flow, don't navigate immediately
        // Let the auth page handle the redirection
      } else {
        // Standard user login without redirect
        queryClient.setQueryData(["/api/user"], data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // WebAuthn Passkey Registration
  const registerPasskeyMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to register a passkey");
      }

      // 1. Get registration options from the server
      const optionsResponse = await fetch('/api/webauthn/registration/options', { 
        method: 'POST',
        credentials: 'include'
      });
      
      if (!optionsResponse.ok) {
        const message = await optionsResponse.text();
        throw new Error(`Failed to get registration options: ${message}`);
      }
      
      // 2. Get options for the authenticator
      const options = await optionsResponse.json();
      
      // 3. Create a credential using the browser's WebAuthn API
      let attestationResponse;
      try {
        attestationResponse = await startRegistration(options);
      } catch (error) {
        console.error(error);
        throw new Error('Passkey registration failed. Your browser may not support WebAuthn.');
      }
      
      // 4. Verify the attestation with the server
      const verifyResponse = await fetch('/api/webauthn/registration/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(attestationResponse)
      });
      
      if (!verifyResponse.ok) {
        const message = await verifyResponse.text();
        throw new Error(`Failed to verify passkey: ${message}`);
      }
      
      return await verifyResponse.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Passkey registered",
        description: "You can now sign in using your passkey"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Passkey registration failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // WebAuthn Passkey Login
  const passkeyLoginMutation = useMutation({
    mutationFn: async ({ username }: { username: string }) => {
      // 1. Get authentication options from server
      const optionsResponse = await fetch('/api/webauthn/authentication/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (!optionsResponse.ok) {
        const message = await optionsResponse.text();
        throw new Error(`Failed to get authentication options: ${message}`);
      }
      
      // 2. Get options for the authenticator
      const options = await optionsResponse.json();
      
      // 3. Use the browser's WebAuthn API to create an assertion
      let assertionResponse;
      try {
        assertionResponse = await startAuthentication(options);
      } catch (error) {
        console.error(error);
        throw new Error('Passkey authentication failed. Your browser may not support WebAuthn.');
      }
      
      // 4. Verify the assertion with the server
      const verifyResponse = await fetch('/api/webauthn/authentication/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(assertionResponse)
      });
      
      if (!verifyResponse.ok) {
        const message = await verifyResponse.text();
        throw new Error(`Failed to verify passkey: ${message}`);
      }
      
      return await verifyResponse.json();
    },
    onSuccess: (data: AuthResponse) => {
      if ('user' in data && 'redirect' in data) {
        // Handle response with redirect
        queryClient.setQueryData(["/api/user"], data.user);
      } else {
        // Standard user login without redirect
        queryClient.setQueryData(["/api/user"], data);
      }
      
      toast({
        title: "Signed in with passkey",
        description: "You are now logged in"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Passkey login failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        passkeyLoginMutation,
        registerPasskeyMutation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
