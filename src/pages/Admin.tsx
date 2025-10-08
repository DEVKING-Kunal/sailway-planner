import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Trash2, Shield, Users } from "lucide-react";
import { useAssignRole, useRemoveRole, type AppRole } from "@/hooks/useRoles";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  senior_planner: "Senior Planner",
  planner: "Planner",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-destructive text-destructive-foreground",
  senior_planner: "bg-primary text-primary-foreground",
  planner: "bg-secondary text-secondary-foreground",
  viewer: "bg-muted text-muted-foreground",
};

export default function Admin() {
  const [userEmail, setUserEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("viewer");
  const { toast } = useToast();
  
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  // Fetch all user roles with user details
  const { data: userRoles, isLoading } = useQuery({
    queryKey: ['allUserRoles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Group roles by user_id
      const grouped = data.reduce((acc: any, role: any) => {
        if (!acc[role.user_id]) {
          acc[role.user_id] = {
            user_id: role.user_id,
            roles: [],
          };
        }
        acc[role.user_id].roles.push(role.role);
        return acc;
      }, {});
      
      // Fetch user emails from auth.users (admin API)
      const userIds = Object.keys(grouped);
      
      // Since we can't directly access auth.admin in the browser,
      // we'll use a different approach - store emails in a separate profiles table
      // or use Supabase Edge Functions. For now, we'll show user IDs.
      const usersWithRoles = userIds.map((userId) => ({
        ...grouped[userId],
        email: userId, // Will show user ID for now
      }));
      
      return usersWithRoles;
    },
  });

  const handleAssignRole = async () => {
    if (!userEmail) {
      toast({
        title: "Email required",
        description: "Please enter a user email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, we'll use the email as the userId (simplified approach)
      // In production, you'd want to implement a server-side edge function
      // to properly look up users by email using the admin API
      
      toast({
        title: "Implementation Note",
        description: "Please enter the user's ID directly. Email lookup requires server-side implementation.",
        variant: "destructive",
      });
      
      // Uncomment when you have the user ID:
      // await assignRole.mutateAsync({ userId: userEmail, role: selectedRole });
      // setUserEmail("");
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    await removeRole.mutateAsync({ userId, role });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">User Administration</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Role Permissions:</strong>
          <ul className="mt-2 space-y-1 text-sm">
            <li><strong>Admin:</strong> Full system access, can manage users and delete any data</li>
            <li><strong>Senior Planner:</strong> Can create scenarios and manage all planning operations</li>
            <li><strong>Planner:</strong> Can create orders, plans, and manage inventory</li>
            <li><strong>Viewer:</strong> Read-only access to all data</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Role to User
          </CardTitle>
          <CardDescription>
            Enter a user's ID (UUID) and select a role to assign. You can find user IDs in the list below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter user ID (UUID)"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="planner">Planner</SelectItem>
                <SelectItem value="senior_planner">Senior Planner</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAssignRole} disabled={assignRole.isPending}>
              {assignRole.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Assign Role"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current User Roles
          </CardTitle>
          <CardDescription>
            All users and their assigned roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userRoles && userRoles.length > 0 ? (
              userRoles.map((user: any) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.user_id}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {user.roles.map((role: AppRole) => (
                      <div key={role} className="flex items-center gap-1">
                        <Badge className={ROLE_COLORS[role]}>
                          {ROLE_LABELS[role]}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveRole(user.user_id, role)}
                          disabled={removeRole.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No users with assigned roles yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
