import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAssignRole } from "@/hooks/useRoles";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

type AppRole = 'admin' | 'senior_planner' | 'planner' | 'viewer';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  senior_planner: "Senior Planner",
  planner: "Planner",
  viewer: "Viewer",
};

export default function AdminRoleRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const assignRole = useAssignRole();

  // Fetch all pending role requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['all-role-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, status, userId, role }: { id: string; status: string; userId: string; role: AppRole }) => {
      // Update request status
      const { error } = await supabase
        .from('role_requests')
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // If approved, assign the role
      if (status === 'approved') {
        return { userId, role };
      }
    },
    onSuccess: async (data) => {
      if (data) {
        // Assign the role
        assignRole.mutate(
          { userId: data.userId, role: data.role },
          {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['all-role-requests'] });
              toast({
                title: "Request Approved",
                description: "Role has been assigned to the user.",
              });
            },
          }
        );
      } else {
        queryClient.invalidateQueries({ queryKey: ['all-role-requests'] });
        toast({
          title: "Request Rejected",
          description: "The role request has been rejected.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') || [];
  const reviewedRequests = requests?.filter(r => r.status !== 'pending') || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Role Requests</h1>
        <p className="text-muted-foreground">Review and approve user role requests</p>
      </div>

      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
            <CardDescription>Requests awaiting your review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-lg">{ROLE_LABELS[request.requested_role as AppRole]}</p>
                      <p className="text-sm text-muted-foreground">User ID: {request.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className="bg-muted p-3 rounded">
                    <p className="text-sm font-medium mb-1">Reason:</p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateRequest.mutate({
                        id: request.id,
                        status: 'approved',
                        userId: request.user_id,
                        role: request.requested_role as AppRole,
                      })}
                      disabled={updateRequest.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateRequest.mutate({
                        id: request.id,
                        status: 'rejected',
                        userId: request.user_id,
                        role: request.requested_role as AppRole,
                      })}
                      disabled={updateRequest.isPending}
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {reviewedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviewed Requests ({reviewedRequests.length})</CardTitle>
            <CardDescription>Previously reviewed requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviewedRequests.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg space-y-2 opacity-60">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ROLE_LABELS[request.requested_role as AppRole]}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(request.created_at).toLocaleDateString()} • 
                        Reviewed {request.reviewed_at ? new Date(request.reviewed_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {requests && requests.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No role requests yet</p>
        </Card>
      )}
    </div>
  );
}
