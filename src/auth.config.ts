import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
        newUser: "/signup",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const userType = (auth?.user as { userType?: string } | undefined)?.userType;
            const isOnApp = nextUrl.pathname.startsWith("/app");
            const isOnPortal = nextUrl.pathname.startsWith("/portal");
            const isOnPortalOnboarding = nextUrl.pathname.startsWith("/portal/onboarding");
            const isOnPortalLogin = nextUrl.pathname === "/portal/login";
            
            // Portal onboarding is public (token-based)
            if (isOnPortalOnboarding) {
                return true;
            }
            
            // Portal login is public
            if (isOnPortalLogin) {
                if (isLoggedIn && userType === "CLIENT") {
                    return Response.redirect(new URL("/portal", nextUrl));
                }
                return true;
            }
            
            // Portal routes (except onboarding and login) require CLIENT user
            if (isOnPortal) {
                if (!isLoggedIn) {
                    return Response.redirect(new URL("/portal/login", nextUrl));
                }
                if (userType !== "CLIENT") {
                    return Response.redirect(new URL("/app", nextUrl));
                }
                return true;
            }
            
            // App routes require INTERNAL user
            if (isOnApp) {
                if (!isLoggedIn) {
                    return false; // Redirect to /login
                }
                if (userType === "CLIENT") {
                    return Response.redirect(new URL("/portal", nextUrl));
                }
                return true;
            }
            
            // Redirect logged in users away from login/signup
            if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
                if (userType === "CLIENT") {
                    return Response.redirect(new URL("/portal", nextUrl));
                }
                return Response.redirect(new URL("/app", nextUrl));
            }
            
            return true;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
