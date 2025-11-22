import { getUser } from "@/actions/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    const user = await getUser();
    
    if (!user) {
        redirect("/login");
    }

    return <ProfileForm user={user} />;
}
