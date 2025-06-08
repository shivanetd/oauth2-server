import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import { Loader2, Fingerprint, KeyRound } from "lucide-react";
import { useState, useEffect } from "react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [oAuthState, setOAuthState] = useState<string | null>(null);

  // Extract oauth_state from URL if present
  useEffect(() => {
    const url = new URL(window.location.href);
    const state = url.searchParams.get('oauth_state');
    if (state) {
      setOAuthState(state);
    }
  }, []);

  // Handle redirect after successful authentication with OAuth state
  useEffect(() => {
    if (user && oAuthState) {
      fetch(`/api/oauth/complete/${oAuthState}`)
        .then(response => response.json())
        .then(data => {
          if (data.redirect) {
            window.location.href = data.redirect;
          }
        })
        .catch(error => {
          console.error("Error completing OAuth flow:", error);
        });
    } else if (user) {
      // Check if we have a redirect in the login/register mutation result
      if (loginMutation.data && 'redirect' in loginMutation.data) {
        if (loginMutation.data.redirect.startsWith('/api/oauth/complete/')) {
          // Handle OAuth completion
          fetch(loginMutation.data.redirect)
            .then(response => response.json())
            .then(data => {
              if (data.redirect) {
                window.location.href = data.redirect;
              }
            })
            .catch(error => {
              console.error("Error completing OAuth flow:", error);
            });
        } else {
          // Handle other redirects
          window.location.href = loginMutation.data.redirect;
        }
      } else if (registerMutation.data && 'redirect' in registerMutation.data) {
        if (registerMutation.data.redirect.startsWith('/api/oauth/complete/')) {
          // Handle OAuth completion
          fetch(registerMutation.data.redirect)
            .then(response => response.json())
            .then(data => {
              if (data.redirect) {
                window.location.href = data.redirect;
              }
            })
            .catch(error => {
              console.error("Error completing OAuth flow:", error);
            });
        } else {
          // Handle other redirects
          window.location.href = registerMutation.data.redirect;
        }
      } else {
        // Default redirect to home page
        setLocation("/");
      }
    }
  }, [user, oAuthState, setLocation, loginMutation.data, registerMutation.data]);

  if (user && !oAuthState) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl sm:text-2xl">OAuth2 Authorization Server</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Sign in to manage your applications and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <AuthForm 
                  mode="login" 
                  onSubmit={(data) => loginMutation.mutate(data)}
                  isLoading={loginMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="register">
                <AuthForm 
                  mode="register" 
                  onSubmit={(data) => registerMutation.mutate(data)}
                  isLoading={registerMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center p-12">
        <div className="max-w-lg">
          <h1 className="text-4xl font-bold mb-6">
            Secure OAuth2 Authorization
          </h1>
          <p className="text-lg text-muted-foreground">
            A complete OAuth2 server implementation supporting multiple authentication methods,
            perfect for securing your applications with industry-standard authentication.
          </p>
        </div>
      </div>
    </div>
  );
}

function AuthForm({ 
  mode, 
  onSubmit, 
  isLoading 
}: { 
  mode: "login" | "register";
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const { passkeyLoginMutation, registerPasskeyMutation, user } = useAuth();
  const [usernameForPasskey, setUsernameForPasskey] = useState<string>("");
  
  // Different schemas for login vs register
  const loginSchema = insertUserSchema.pick({ username: true, password: true });
  const schema = mode === "login" ? loginSchema : insertUserSchema;
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: "",
      ...(mode === "register" && { email: "" }),
    },
  });
  
  // Update username for passkey login when username field changes
  const watchUsername = form.watch("username");
  useEffect(() => {
    if (watchUsername) {
      setUsernameForPasskey(watchUsername);
    }
  }, [watchUsername]);
  
  // Handle passkey login
  const handlePasskeyLogin = () => {
    if (!usernameForPasskey) {
      form.setError("username", { 
        type: "manual", 
        message: "Username is required for passkey login" 
      });
      return;
    }
    
    passkeyLoginMutation.mutate({ username: usernameForPasskey });
  };
  
  // Handle passkey registration
  const handleRegisterPasskey = () => {
    if (!user) {
      return; // Can only register passkey when logged in
    }
    
    registerPasskeyMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="username" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} autoComplete={mode === "login" ? "current-password" : "new-password"} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "register" && (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} autoComplete="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <KeyRound className="mr-2 h-4 w-4" />
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
      </Form>
      
      {/* Passkey section */}
      {mode === "login" && (
        <>
          <div className="flex items-center">
            <Separator className="flex-1" />
            <span className="mx-2 text-xs text-muted-foreground">OR</span>
            <Separator className="flex-1" />
          </div>
          
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handlePasskeyLogin}
            disabled={passkeyLoginMutation.isPending}
          >
            {passkeyLoginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Fingerprint className="mr-2 h-4 w-4" />
            Sign in with Passkey
          </Button>
        </>
      )}
      
      {/* Passkey registration for existing users */}
      {user && (
        <div className="mt-6 pt-4 border-t">
          <CardDescription className="mb-4">
            Add a passkey for more secure login next time
          </CardDescription>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleRegisterPasskey}
            disabled={registerPasskeyMutation.isPending}
          >
            {registerPasskeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Fingerprint className="mr-2 h-4 w-4" />
            Register Passkey
          </Button>
        </div>
      )}
    </div>
  );
}