import { getUser } from "@/actions/profile";
import { getEmailConfig } from "@/actions/email";
import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";

// Profile changes infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function ProfilePage() {
    const [user, emailConfig] = await Promise.all([
        getUser(),
        getEmailConfig(),
    ]);
    
    if (!user) {
        redirect("/login");
    }

    return <ProfileForm user={user} emailConfig={emailConfig} />;
}
