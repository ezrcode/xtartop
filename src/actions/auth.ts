"use server";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SignupFormSchema } from "@/lib/definitions";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function register(prevState: any, formData: FormData) {
    const validatedFields = SignupFormSchema.safeParse({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
        workspaceName: formData.get("workspaceName"),
    });

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Register.",
        };
    }

    const { name, email, password, workspaceName } = validatedFields.data;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.$transaction(async (tx) => {
            // Create User
            const user = await tx.user.create({
                data: {
                    name,
                    email,
                    passwordHash: hashedPassword,
                },
            });

            // Create Workspace
            const workspace = await tx.workspace.create({
                data: {
                    name: workspaceName,
                    ownerId: user.id,
                    // slug: workspaceName.toLowerCase().replace(/ /g, "-") + "-" + Math.random().toString(36).substring(2, 7), // Simple slug generation
                },
            });

            // Create Subscription
            await tx.subscription.create({
                data: {
                    workspaceId: workspace.id,
                    plan: "FREE",
                    status: "ACTIVE",
                },
            });
        });

    } catch (error) {
        console.error("Registration error:", error);
        // Handle unique constraint violation for email
        // @ts-ignore
        if (error.code === 'P2002') {
            return { message: 'Email already exists.' };
        }
        return { message: "Database Error: Failed to Register." };
    }

    // Attempt to log the user in immediately
    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/app",
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { message: "Invalid credentials." };
                default:
                    return { message: "Something went wrong during login." };
            }
        }
        throw error;
    }
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
    try {
        const email = formData.get("email") as string | null;
        let redirectTo = "/app";

        if (email) {
            const user = await prisma.user.findUnique({
                where: { email },
                select: { userType: true },
            });
            if (user?.userType === "CLIENT") {
                redirectTo = "/portal";
            }
        }

        await signIn("credentials", {
            ...Object.fromEntries(formData.entries()),
            redirectTo,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials.";
                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}

import { revalidatePath } from "next/cache";

export async function logout() {
    // Clear the cache for the dashboard and home page
    revalidatePath("/", "layout");
    await signOut({ redirectTo: "/" });
}
