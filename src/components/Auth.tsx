import { Auth as SupaAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "lib/getClient";

export const Auth = () => (
  <SupaAuth
    supabaseClient={supabase}
    appearance={{ theme: ThemeSupa }}
    providers={[]}
  />
);
