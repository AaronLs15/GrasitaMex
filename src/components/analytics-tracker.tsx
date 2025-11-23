"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const trackView = async () => {
            if (pathname !== "/modelos") return;

            const supa = supabaseBrowser();
            // Simple tracking: just path. 
            // In a real app, you might want to hash IP or get user agent server-side,
            // but for client-side tracking we'll just log the path and let RLS handle user_id.
            await supa.from("page_views").insert({
                path: pathname,
                user_agent: navigator.userAgent,
            });
        };

        trackView();
    }, [pathname, searchParams]);

    return null;
}
