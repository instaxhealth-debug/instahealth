import { ServiceDetail } from "@/components/ivz/ServiceDetail";

interface ServicePageProps {
  params: {
    slug: string;
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ServiceDetail slug={params.slug} />
    </div>
  );
}

