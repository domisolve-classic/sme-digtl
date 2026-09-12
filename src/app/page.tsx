import { AssessmentForm } from "@/components/AssessmentForm";

export default function Home() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">
        Generate a Construction Site Risk Assessment
      </h1>
      <p className="mb-6 max-w-2xl text-sm text-gray-600">
        Enter the project and activity details below. The assessment is
        generated with AI assistance, grounded in a curated Qatar hazard
        reference library and Qatar&apos;s mandated summer working-hours
        rules. Every result is a draft that requires sign-off by a certified
        HSE professional before use on site.
      </p>
      <AssessmentForm />
    </div>
  );
}
