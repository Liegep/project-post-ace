import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const appId = Deno.env.get("META_APP_ID");
  const appSecret = Deno.env.get("META_APP_SECRET");

  if (!appId || !appSecret) {
    return new Response(JSON.stringify({ error: "Meta app credentials not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const url = new URL(req.url);

  try {
    const { action, ...body } = await req.json();

    // Step 1: Generate OAuth URL
    if (action === "get_auth_url") {
      const { redirect_uri } = body;
      const scopes = [
        "pages_manage_posts",
        "pages_read_engagement",
        "pages_show_list",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
      ].join(",");

      const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${scopes}&response_type=code`;

      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Exchange code for token
    if (action === "exchange_token") {
      const { code, redirect_uri, client_id: clientId } = body;

      // Get auth header to identify user
      const authHeader = req.headers.get("authorization");
      let userId: string | null = null;
      if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        userId = user?.id || null;
      }

      // Exchange code for short-lived token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirect_uri)}&client_secret=${appSecret}&code=${code}`;
      const tokenRes = await fetch(tokenUrl);
      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(JSON.stringify({ error: tokenData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange for long-lived token
      const longTokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`;
      const longRes = await fetch(longTokenUrl);
      const longData = await longRes.json();

      const accessToken = longData.access_token || tokenData.access_token;
      const expiresIn = longData.expires_in || 5184000; // ~60 days

      // Get user info
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`);
      const meData = await meRes.json();

      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Upsert meta account
      const { data: account, error: accountError } = await supabase
        .from("meta_accounts")
        .upsert({
          client_id: clientId,
          meta_user_id: meData.id,
          meta_user_name: meData.name || "",
          access_token: accessToken,
          token_expires_at: expiresAt,
          created_by: userId,
        }, { onConflict: "client_id,meta_user_id" })
        .select()
        .single();

      if (accountError) {
        return new Response(JSON.stringify({ error: accountError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch pages
      const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}&fields=id,name,access_token,instagram_business_account`);
      const pagesData = await pagesRes.json();

      const pages = pagesData.data || [];
      for (const page of pages) {
        // Insert Facebook page
        await supabase.from("meta_pages").upsert({
          meta_account_id: account.id,
          client_id: clientId,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          platform: "facebook",
        }, { onConflict: "meta_account_id,page_id,platform" }).select();

        // Check for Instagram business account
        if (page.instagram_business_account) {
          const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.instagram_business_account.id}?fields=id,username&access_token=${page.access_token}`);
          const igData = await igRes.json();

          await supabase.from("meta_pages").upsert({
            meta_account_id: account.id,
            client_id: clientId,
            page_id: page.id,
            page_name: page.name,
            page_access_token: page.access_token,
            instagram_account_id: igData.id,
            instagram_username: igData.username || "",
            platform: "instagram",
          }, { onConflict: "meta_account_id,page_id,platform" }).select();
        }
      }

      return new Response(JSON.stringify({ success: true, account_id: account.id, pages_count: pages.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: List pages for a client
    if (action === "list_pages") {
      const { client_id: clientId } = body;

      const { data: pages } = await supabase
        .from("meta_pages")
        .select("*, meta_accounts(meta_user_name, token_expires_at)")
        .eq("client_id", clientId);

      return new Response(JSON.stringify({ pages: pages || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 4: Refresh token
    if (action === "refresh_token") {
      const { account_id } = body;

      const { data: account } = await supabase
        .from("meta_accounts")
        .select("*")
        .eq("id", account_id)
        .single();

      if (!account) {
        return new Response(JSON.stringify({ error: "Account not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const longTokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${account.access_token}`;
      const res = await fetch(longTokenUrl);
      const data = await res.json();

      if (data.error) {
        return new Response(JSON.stringify({ error: data.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();

      await supabase
        .from("meta_accounts")
        .update({ access_token: data.access_token, token_expires_at: expiresAt })
        .eq("id", account_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Disconnect account
    if (action === "disconnect") {
      const { account_id } = body;
      await supabase.from("meta_accounts").delete().eq("id", account_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("meta-auth error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
