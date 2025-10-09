import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userRoles, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError || !userRoles?.some(r => r.role === 'admin')) {
      throw new Error('Forbidden: Admin access required');
    }

    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      throw new Error('Email is required');
    }

    // Look up user by email using service role
    const { data: authUsers, error } = await supabaseClient.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    const targetUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user roles
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUser.id);

    return new Response(
      JSON.stringify({
        id: targetUser.id,
        email: targetUser.email,
        created_at: targetUser.created_at,
        roles: roles?.map(r => r.role) || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-user-by-email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isForbidden = errorMessage.includes('Forbidden');
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: isForbidden ? 403 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
