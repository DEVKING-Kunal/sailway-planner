import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Trash2, Shield, Users } from "lucide-react";
import { useAssignRole, useRemoveRole, useIsAdmin, type AppRole } from "@/hooks/useRoles";
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
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [userEmail, setUserEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("viewer");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<{ id: string; email: string; roles: AppRole[] } | null>(null);
  const { toast } = useToast();
  
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  // Redirect non-admins
  useEffect(() => {
    if (isAdmin === false) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You do not have permission to access the admin panel.",
      });
      navigate("/");
    }
  }, [isAdmin, navigate, toast]);

  const handleLookupUser = async () => {
    if (!userEmail.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address",
      });
      return;
    }

    setLookupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-user-by-email', {
        body: { email: userEmail.trim() },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setFoundUser(data);
      toast({
        title: "User found",
        description: `Found user: ${data.email}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to find user",
      });
      setFoundUser(null);
    } finally {
      setLookupLoading(false);
    }
  };

  // Fetch all user roles with user details
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
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
            email: null,
          };
        }
        acc[role.user_id].roles.push(role.role);
        return acc;
      }, {});
      
      // Return users with their roles (email will be shown as UUID for now)
      // To show actual emails, an edge function with service role would be needed
      return Object.values(grouped);
    },
  });

  const handleAssignRole = async () => {
    if (!foundUser || !selectedRole) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please look up a user and select a role",
      });
      return;
    }

    assignRole.mutate(
      { userId: foundUser.id, role: selectedRole },
      {
        onSuccess: () => {
          setUserEmail("");
          setSelectedRole("viewer");
          setFoundUser(null);
        },
      }
    );
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    await removeRole.mutateAsync({ userId, role });
  };

  // Show loading while checking admin status
  if (isAdmin === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (rolesLoading) {
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
            Enter a user's email address to look them up, then select a role to assign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">User Email</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="user@example.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookupUser()}
              />
              <Button 
                onClick={handleLookupUser} 
                disabled={lookupLoading || !userEmail.trim()}
              >
                {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lookup"}
              </Button>
            </div>
          </div>

          {foundUser && (
            <Alert>
              <AlertDescription>
                <div className="space-y-1">
                  <p><strong>Email:</strong> {foundUser.email}</p>
                  <p><strong>User ID:</strong> {foundUser.id}</p>
                  {foundUser.roles.length > 0 && (
                    <p><strong>Current Roles:</strong> {foundUser.roles.map(r => ROLE_LABELS[r]).join(', ')}</p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Role to Assign</label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="planner">Planner</SelectItem>
                <SelectItem value="senior_planner">Senior Planner</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleAssignRole}
            disabled={assignRole.isPending || !foundUser || !selectedRole}
            className="w-full"
          >
            {assignRole.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Role"
            )}
          </Button>
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
                    <p className="font-medium text-foreground">{user.email || user.user_id}</p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground">{user.user_id}</p>
                    )}
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
