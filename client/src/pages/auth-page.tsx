import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import type { InsertUser } from "@shared/schema";
import { Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle>OAuth2 Authorization Server</CardTitle>
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
  onSubmit: (data: InsertUser) => void;
  isLoading: boolean;
}) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Sign In" : "Create Account"}
        </Button>
      </form>
    </Form>
  );
}