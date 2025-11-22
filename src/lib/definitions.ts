import { z } from "zod";

export const SignupFormSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters long." }),
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
    workspaceName: z.string().min(2, { message: "Workspace name must be at least 2 characters long." }),
});

export const LoginFormSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email." }),
    password: z.string().min(1, { message: "Password is required." }),
});
