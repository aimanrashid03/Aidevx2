import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Check if the user is calling the function
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // Verify if the caller is an admin
        const { data: profileData, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || !profileData || profileData.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Forbidden: Admin access only' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Initialize Supabase Admin Client using Service Role Key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, payload } = await req.json()

        if (action === 'create_user') {
            const { email, password, full_name, role } = payload

            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name }
            })

            if (error) throw error

            // Update role explicitly since handle_new_user trigger defaults to 'user'
            if (role === 'admin' && data.user) {
                // Wait briefly for trigger to complete, though not ideal, or directly update
                await new Promise(resolve => setTimeout(resolve, 500))
                await supabaseAdmin
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', data.user.id)
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })

        } else if (action === 'delete_user') {
            const { user_id } = payload

            const { data, error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
            if (error) throw error

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })

        } else if (action === 'update_role') {
            const { user_id, role } = payload

            // Update role in profiles table directly (using service role bypasses RLS/Triggers)
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .update({ role })
                .eq('id', user_id)

            if (error) throw error

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            })

        } else {
            throw new Error(`Unknown action: ${action}`)
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
