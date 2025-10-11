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

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      throw new Error('User ID is required');
    }

    // Look up user by ID using service role
    const { data: targetUser, error } = await supabaseClient.auth.admin.getUserById(userId);

    if (error) {
      console.error('Error fetching user:', error);
      throw error;
    }

    if (!targetUser.user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user roles
    const { data: roles } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUser.user.id);

    return new Response(
      JSON.stringify({
        id: targetUser.user.id,
        email: targetUser.user.email,
        created_at: targetUser.user.created_at,
        roles: roles?.map(r => r.role) || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-user-by-id:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
