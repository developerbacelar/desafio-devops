import { ChatWidget } from "@/components/chat/ChatWidget";

interface EmbedPageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { companySlug } = await params;
  return <ChatWidget companySlug={companySlug} />;
}
