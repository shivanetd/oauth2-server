import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { 
  Loader2, 
  Users, 
  TrendingUp, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Activity,
  UserPlus,
  Filter,
  Download
} from "lucide-react";
import { useState, useMemo } from "react";

export default function UserTrendsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<string>("30");
  const [viewType, setViewType] = useState<string>("activity");
  const [userFilter, setUserFilter] = useState<string>("all");

  const { data: users = [], isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
  });

  if (!user?.isAdmin) {
    setLocation("/");
    return null;
  }

  // Calculate date ranges
  const dateRanges = useMemo(() => {
    const now = new Date();
    const ranges: { [key: string]: Date } = {
      "7": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      "30": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      "90": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      "365": new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    };
    return ranges;
  }, []);

  // Filter users based on selected criteria
  const filteredUsers = useMemo(() => {
    let filtered = users;
    
    if (userFilter === "active") {
      filtered = filtered.filter(u => u.isActive);
    } else if (userFilter === "admin") {
      filtered = filtered.filter(u => u.isAdmin);
    } else if (userFilter === "recent") {
      const cutoff = dateRanges[timeRange];
      filtered = filtered.filter(u => new Date(u.createdAt) > cutoff);
    }
    
    return filtered;
  }, [users, userFilter, timeRange, dateRanges]);

  // Generate daily user activity data
  const activityData = useMemo(() => {
    const days = parseInt(timeRange);
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const registrations = users.filter(u => {
        const userDate = new Date(u.createdAt);
        return userDate.toDateString() === date.toDateString();
      }).length;
      
      const logins = users.filter(u => {
        if (!u.lastLogin) return false;
        const loginDate = new Date(u.lastLogin);
        return loginDate.toDateString() === date.toDateString();
      }).length;
      
      data.push({
        date: dateStr,
        registrations,
        logins,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    
    return data;
  }, [users, timeRange]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const cutoff = dateRanges[timeRange];
    const recentUsers = users.filter(u => new Date(u.createdAt) > cutoff);
    const activeUsers = users.filter(u => u.lastLogin && new Date(u.lastLogin) > cutoff);
    
    return {
      totalUsers: users.length,
      newUsers: recentUsers.length,
      activeUsers: activeUsers.length,
      adminUsers: users.filter(u => u.isAdmin).length,
      growthRate: recentUsers.length > 0 ? ((recentUsers.length / users.length) * 100).toFixed(1) : "0",
      activeRate: users.length > 0 ? ((activeUsers.length / users.length) * 100).toFixed(1) : "0"
    };
  }, [users, timeRange, dateRanges]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">User Trends Explorer</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Analyze user activity patterns and engagement trends
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button asChild variant="outline" size="sm" className="sm:size-default">
            <Link to="/admin">← Back to Admin</Link>
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
              <SelectItem value="recent">Recent Users</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.growthRate}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeRate}% active rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.adminUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.growthRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                User Activity Timeline
              </CardTitle>
              <CardDescription>
                Daily user registrations and login activity over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Simple Bar Chart */}
                <div className="grid gap-2">
                  {activityData.map((day, index) => {
                    const maxValue = Math.max(...activityData.map(d => Math.max(d.registrations, d.logins)));
                    return (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-16 text-xs text-muted-foreground">{day.displayDate}</div>
                        <div className="flex-1 flex gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-20 text-xs">Registrations</div>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all"
                                style={{width: `${maxValue > 0 ? (day.registrations / maxValue) * 100 : 0}%`}}
                              ></div>
                            </div>
                            <div className="w-8 text-xs font-medium">{day.registrations}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-20 text-xs">Logins</div>
                            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{width: `${maxValue > 0 ? (day.logins / maxValue) * 100 : 0}%`}}
                              ></div>
                            </div>
                            <div className="w-8 text-xs font-medium">{day.logins}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Activity Patterns</CardTitle>
                <CardDescription>User behavior patterns and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Peak Registration Day</span>
                    <Badge variant="secondary">
                      {activityData.reduce((max, day) => 
                        day.registrations > max.registrations ? day : max, 
                        activityData[0]
                      )?.displayDate || "N/A"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Peak Login Day</span>
                    <Badge variant="secondary">
                      {activityData.reduce((max, day) => 
                        day.logins > max.logins ? day : max, 
                        activityData[0]
                      )?.displayDate || "N/A"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Daily Registrations</span>
                    <Badge variant="outline">
                      {(activityData.reduce((sum, day) => sum + day.registrations, 0) / activityData.length).toFixed(1)}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Daily Logins</span>
                    <Badge variant="outline">
                      {(activityData.reduce((sum, day) => sum + day.logins, 0) / activityData.length).toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Breakdown of user types and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active vs Inactive</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{width: `${(users.filter(u => u.isActive).length / users.length) * 100}%`}}
                        ></div>
                      </div>
                      <span className="text-xs">
                        {users.filter(u => u.isActive).length}/{users.length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Admin vs Regular</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full" 
                          style={{width: `${(users.filter(u => u.isAdmin).length / users.length) * 100}%`}}
                        ></div>
                      </div>
                      <span className="text-xs">
                        {users.filter(u => u.isAdmin).length}/{users.length}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>User Segments</CardTitle>
              <CardDescription>Detailed breakdown of filtered user data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {filteredUsers.slice(0, 20).map((user) => (
                  <div key={user._id.toString()} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
                      <Badge variant={user.isActive ? "default" : "outline"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {user.lastLogin && (
                        <span className="text-xs text-muted-foreground">
                          Last login: {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {filteredUsers.length > 20 && (
                  <p className="text-center text-muted-foreground text-sm">
                    Showing 20 of {filteredUsers.length} users
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Automated analysis of user trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Growth Trend</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {metrics.newUsers > 0 
                        ? `${metrics.newUsers} new users registered in the last ${timeRange} days, representing ${metrics.growthRate}% growth.`
                        : `No new registrations in the last ${timeRange} days.`
                      }
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-100">Engagement</h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {metrics.activeRate}% of users have been active in the selected time period.
                      {parseFloat(metrics.activeRate) > 70 
                        ? " This indicates strong user engagement." 
                        : " Consider strategies to improve user engagement."
                      }
                    </p>
                  </div>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">Administration</h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {metrics.adminUsers} admin users manage the system, representing {((metrics.adminUsers / metrics.totalUsers) * 100).toFixed(1)}% of total users.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>Suggested actions based on data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parseFloat(metrics.growthRate) < 5 && (
                    <div className="flex items-start gap-2">
                      <TrendingUp className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Boost User Acquisition</p>
                        <p className="text-xs text-muted-foreground">
                          Consider marketing campaigns or referral programs to increase registrations.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {parseFloat(metrics.activeRate) < 50 && (
                    <div className="flex items-start gap-2">
                      <Activity className="h-4 w-4 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Improve User Engagement</p>
                        <p className="text-xs text-muted-foreground">
                          Low activity rate suggests need for better onboarding or features.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {metrics.adminUsers < 2 && (
                    <div className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Consider More Admins</p>
                        <p className="text-xs text-muted-foreground">
                          Having multiple admin users can help with system management.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <Download className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Export Data</p>
                      <p className="text-xs text-muted-foreground">
                        Consider implementing data export features for detailed analysis.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}