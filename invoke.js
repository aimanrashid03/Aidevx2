// invoke.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    // login
    console.log("Logging in...");
    const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com', // we'll create or use an existing user
        password: 'password123'
    });

    if (signInError) {
        console.log("Sign in failed, creating user...");
        await supabase.auth.signUp({
            email: 'test@example.com',
            password: 'password123'
        });
        // Wait for sign in
        await new Promise(r => setTimeout(r, 1000));
        await supabase.auth.signInWithPassword({ email: 'test@example.com', password: 'password123' });
    }

    const { data: userCurrent } = await supabase.auth.getUser();
    console.log("Logged in as:", userCurrent?.user?.email);

    // Get a project
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    let projectId = projects?.[0]?.id;

    if (!projectId) {
        const { data: newProj } = await supabase.from('projects').insert({ name: 'Test', user_id: userCurrent.user.id }).select('id').single();
        projectId = newProj.id;
    }

    console.log("Invoking edge function...");
    const { data, error } = await supabase.functions.invoke('embed_document', {
        body: {
            projectId: projectId,
            documentPath: 'test.md',
            content: 'This is a test document content. Ensure it is longer than 10 characters.'
        }
    });

    if (error) {
        console.error("Function Error Payload:", error);

        // Sometimes the error object contains the raw response body
        try {
            const body = await error.context.json();
            console.error("Function Error Body:", body);
        } catch (e) {
            console.error("Could not parse error body.");
        }
    } else {
        console.log("Function Success:", data);
    }
}
run();
