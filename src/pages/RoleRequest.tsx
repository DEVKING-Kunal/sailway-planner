import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Clock, CheckCircle, XCircle, Info } from "lucide-react";

type AppRole = 'admin' | 'senior_planner' | 'planner' | 'viewer';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  senior_planner: "Senior Planner",
  planner: "Planner",
  viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: "Full system access, can manage users and delete any data",
  senior_planner: "Can create scenarios and manage all planning operations",
  planner: "Can create orders, plans, and manage inventory",
  viewer: "Read-only access to all data",
};

export default function RoleRequest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedRole, setSelectedRole] = useState<AppRole>("viewer");
  const [reason, setReason] = useState("");

  // Fetch user's role requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-role-requests'],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createRequest = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!reason.trim()) throw new Error("Please provide a reason for your request");
      if (reason.trim().length < 20) throw new Error("Please provide a more detailed reason (at least 20 characters)");
      if (reason.trim().length > 500) throw new Error("Reason is too long (maximum 500 characters)");

      const { data, error } = await supabase
        .from('role_requests')
        .insert({
          user_id: user.id,
          requested_role: selectedRole,
          reason: reason.trim(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-role-requests'] });
      toast({
        title: "Request Submitted",
        description: "An admin will review your role request soon.",
      });
      setReason("");
      setSelectedRole("viewer");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message,
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>
            Please sign in to request a role.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if user has a pending request
  const hasPendingRequest = requests?.some(r => r.status === 'pending');

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Request Role</h1>
          <p className="text-muted-foreground">Request access to additional features</p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong>
          <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
            <li>Select the role you need and explain why you need it</li>
            <li>An administrator will review your request</li>
            <li>You'll be notified when your request is approved or rejected</li>
            <li>You can only have one pending request at a time</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>New Role Request</CardTitle>
          <CardDescription>
            Select the role you're requesting and provide a detailed reason
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Requested Role</label>
            <Select 
              value={selectedRole} 
              onValueChange={(value) => setSelectedRole(value as AppRole)}
              disabled={hasPendingRequest || createRequest.isPending}
            >
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
            <p className="text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[selectedRole]}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for Request</label>
            <Textarea
              placeholder="Explain why you need this role and how you plan to use it... (minimum 20 characters)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              disabled={hasPendingRequest || createRequest.isPending}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {reason.length}/500 characters
            </p>
          </div>

          <Button
            onClick={() => createRequest.mutate()}
            disabled={hasPendingRequest || createRequest.isPending || !reason.trim() || reason.trim().length < 20}
            className="w-full"
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Submit Request
              </>
            )}
          </Button>

          {hasPendingRequest && (
            <Alert>
              <AlertDescription>
                You already have a pending request. Please wait for it to be reviewed before submitting a new one.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {requests && requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Previous Requests</CardTitle>
            <CardDescription>
              View the status of your role requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ROLE_LABELS[request.requested_role as AppRole]}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                  {request.reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      Reviewed on {new Date(request.reviewed_at).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
