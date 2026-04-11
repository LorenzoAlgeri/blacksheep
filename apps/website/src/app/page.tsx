import { HomeClient } from "@/components/HomeClient";
import { getEventStructuredData, getOrganizationStructuredData } from "@/lib/structured-data";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getEventStructuredData()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getOrganizationStructuredData()),
        }}
      />
      <HomeClient />
    </>
  );
}
