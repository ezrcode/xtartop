"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { ThemePreference } from "@prisma/client";

const ProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    photoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

const PasswordSchema = z.object({
    currentPassword: z.string().min(6, "Password must be at least 6 characters"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

const PreferencesSchema = z.object({
    dealsViewPref: z.enum(["TABLE", "KANBAN"]),
});

export type ProfileState = {
    errors?: {
        name?: string[];
        email?: string[];
        photoUrl?: string[];
    };
    message?: string;
};

export type PasswordState = {
    errors?: {
        currentPassword?: string[];
        newPassword?: string[];
        confirmPassword?: string[];
    };
    message?: string;
};

export type PreferencesState = {
    errors?: {
        dealsViewPref?: string[];
    };
    message?: string;
};

export async function getUser() {
    const session = await auth();
    if (!session?.user?.email) return null;

    return await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            dealsViewPref: true,
            themePreference: true,
            itemsPerPage: true,
            createdAt: true,
        },
    });
}

export async function updateProfile(prevState: ProfileState | undefined, formData: FormData): Promise<ProfileState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        name: formData.get("name"),
        email: formData.get("email"),
        photoUrl: formData.get("photoUrl") || "",
    };

    const validatedFields = ProfileSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Profile.",
        };
    }

    try {
        // Check if email is already taken by another user
        if (validatedFields.data.email !== session.user.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedFields.data.email },
            });
            if (existingUser) {
                return {
                    errors: { email: ["Email is already taken"] },
                    message: "Email is already in use.",
                };
            }
        }

        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                name: validatedFields.data.name,
                email: validatedFields.data.email,
                photoUrl: validatedFields.data.photoUrl || null,
            },
        });

        revalidatePath("/app/profile");
        return { message: "Profile updated successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Update Profile." };
    }
}

export async function updatePassword(prevState: PasswordState | undefined, formData: FormData): Promise<PasswordState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        currentPassword: formData.get("currentPassword"),
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    };

    const validatedFields = PasswordSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid input. Please check your passwords.",
        };
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return { message: "User not found." };
        }

        // Verify current password
        const passwordsMatch = await bcrypt.compare(
            validatedFields.data.currentPassword,
            user.passwordHash
        );

        if (!passwordsMatch) {
            return {
                errors: { currentPassword: ["Current password is incorrect"] },
                message: "Current password is incorrect.",
            };
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(validatedFields.data.newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { email: session.user.email },
            data: { passwordHash: hashedPassword },
        });

        revalidatePath("/app/profile");
        return { message: "Password updated successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Update Password." };
    }
}

export async function updatePreferences(prevState: PreferencesState | undefined, formData: FormData): Promise<PreferencesState> {
    const session = await auth();
    if (!session?.user?.email) redirect("/login");

    const rawData = {
        dealsViewPref: formData.get("dealsViewPref"),
    };

    const validatedFields = PreferencesSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid preferences.",
        };
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                dealsViewPref: validatedFields.data.dealsViewPref,
            },
        });

        revalidatePath("/app/profile");
        revalidatePath("/app/deals");
        return { message: "Preferences updated successfully." };
    } catch (error) {
        console.error("Database Error:", error);
        return { message: "Database Error: Failed to Update Preferences." };
    }
}

// Update theme preference
export async function updateThemePreference(theme: ThemePreference): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, error: "No autenticado" };
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: { themePreference: theme },
        });

        revalidatePath("/app");
        return { success: true };
    } catch (error) {
        console.error("Error updating theme:", error);
        return { success: false, error: "Error al actualizar el tema" };
    }
}

// Get user theme preference
export async function getUserThemePreference(): Promise<ThemePreference> {
    const session = await auth();
    if (!session?.user?.email) {
        return "SYSTEM";
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { themePreference: true },
    });

    return user?.themePreference ?? "LIGHT";
}

// Update items per page preference
export async function updateItemsPerPage(itemsPerPage: number): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.email) {
        return { success: false, error: "No autenticado" };
    }

    // Validate allowed values
    if (![10, 25, 50].includes(itemsPerPage)) {
        return { success: false, error: "Valor no permitido" };
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: { itemsPerPage },
        });

        revalidatePath("/app");
        revalidatePath("/app/companies");
        revalidatePath("/app/contacts");
        revalidatePath("/app/deals");
        return { success: true };
    } catch (error) {
        console.error("Error updating items per page:", error);
        return { success: false, error: "Error al actualizar la preferencia" };
    }
}

// Get user items per page preference
export async function getUserItemsPerPage(): Promise<number> {
    const session = await auth();
    if (!session?.user?.email) {
        return 10;
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { itemsPerPage: true },
    });

    return user?.itemsPerPage ?? 10;
}
