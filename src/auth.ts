import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";

const INTERNAL_DOMAIN = "nearbycrm.com"; // Internal users domain

async function getUser(email: string): Promise<User | null> {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw new Error("Failed to fetch user.");
    }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) return null;
                    
                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
                    if (!passwordsMatch) {
                        console.log("Invalid password");
                        return null;
                    }

                    // Validate INTERNAL users must have @nearbycrm.com domain
                    if (user.userType === "INTERNAL") {
                        const domain = email.split("@")[1];
                        if (domain !== INTERNAL_DOMAIN) {
                            console.log("Internal user must have @nearbycrm.com domain");
                            return null;
                        }
                    }

                    return user;
                }

                console.log("Invalid credentials");
                return null;
            },
        }),
    ],
    callbacks: {
        authorized: authConfig.callbacks.authorized,
        async jwt({ token, user }) {
            if (user) {
                token.id = (user as User).id;
                token.userType = (user as User).userType;
                token.contactId = (user as User).contactId;
            }
            // Refresh user data from DB only if userType or id is missing
            if (token.email && (!token.userType || !token.id)) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: token.email as string },
                        select: { id: true, userType: true, contactId: true },
                    });
                    if (dbUser) {
                        token.id = dbUser.id;
                        token.userType = dbUser.userType;
                        token.contactId = dbUser.contactId;
                    }
                } catch (error) {
                    console.error("Error refreshing user data in JWT:", error);
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id?: string }).id = token.id as string || token.sub;
                (session.user as { userType?: string }).userType = token.userType as string;
                (session.user as { contactId?: string | null }).contactId = token.contactId as string | null;
            }
            return session;
        },
    },
});
