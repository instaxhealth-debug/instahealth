import { TestDetail } from "@/components/bloodz/TestDetail";

interface TestPageProps {
  params: {
    slug: string;
  };
}

export default async function TestPage({ params }: TestPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <TestDetail slug={params.slug} />
    </div>
  );
}

