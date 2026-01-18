import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelView } from "./channel-view";

interface ChannelPageProps {
  params: Promise<{
    workspaceId: string;
    channelId: string;
  }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { workspaceId, channelId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check workspace membership (RLS will handle this)
  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .single();

  if (membershipError || !membership) {
    redirect("/login?error=access-denied");
  }

  // Get channel info
  const { data: channel, error: channelError } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .eq("workspace_id", workspaceId)
    .single();

  if (channelError || !channel) {
    redirect(`/w/${workspaceId}?error=channel-not-found`);
  }

  return (
    <ChannelView
      workspaceId={workspaceId}
      channelId={channelId}
      channelName={channel.name}
      userId={user.id}
    />
  );
}
