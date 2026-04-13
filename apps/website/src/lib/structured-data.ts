export function getEventStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: "BLACK SHEEP Monday",
    startDate: "2026-04-14T23:00:00+02:00",
    endDate: "2026-04-15T04:00:00+02:00",
    location: {
      "@type": "NightClub",
      name: "11 Clubroom",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Corso Como 11",
        addressLocality: "Milano",
        postalCode: "20154",
        addressCountry: "IT",
      },
    },
    performer: [
      { "@type": "MusicGroup", name: "DEEJVADO" },
      { "@type": "MusicGroup", name: "ANUBIS" },
      { "@type": "MusicGroup", name: "RAFWORLD" },
    ],
    organizer: {
      "@type": "Organization",
      name: "Black Sheep Community",
      url: "https://www.blacksheep-community.com",
    },
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };
}

export function getOrganizationStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Black Sheep Community",
    url: "https://www.blacksheep-community.com",
    logo: "https://www.blacksheep-community.com/bs-logo.svg",
    foundingDate: "2019",
    award: "Red Bull Turn It Up Milano 2025 Winner",
    sameAs: [
      "https://www.instagram.com/blacksheep.community_",
      "https://www.tiktok.com/@blacksheepcommunity",
      "https://www.facebook.com/blacksheepnight",
    ],
  };
}
