// National Museum (Zamboanga) buildings and their galleries. Each overview is a
// short summary of the museum's own gallery panel text, read aloud by the guide
// after the AR intro. Keep summaries faithful to the panels: no outside facts.

export const MUSEUM_BUILDINGS = [
  {
    id: 'S2',
    galleries: [
      {
        title: 'Spirit in Nature',
        parts: [
          {
            heading: 'Wonders of Land and Sea',
            text: "The Zamboanga Peninsula is rich in natural wealth, from tropical forests to coral reefs. Its forests shelter unique wildlife, like the Zamboanga bulbul and the critically endangered Philippine eagle, while the rare Philippine crocodile finds refuge in protected areas. Its seas are part of the Coral Triangle, Earth's center of marine biodiversity. Through the artists' eyes, we see both the beauty and the fragility of this living heritage, and a call to protect it for tomorrow.",
          },
          {
            heading: 'Spirit and Stewardship',
            text: 'For generations, communities have shared a deep relationship with the land and sea, seeing nature as a gift and a responsibility. These artworks invite us to see nature not merely as something to be used, but as a reflection of divine creativity. Each artwork is a tribute and a reminder: we are entrusted with this living heritage, and our creativity can inspire greater care for the world.',
          },
        ],
      },
      {
        title: 'All Out Peace Not War',
        parts: [
          {
            heading: 'Kalinaw Hindi Digmaan',
            text: 'All Out Peace Not War, also titled Kalinaw Hindi Digmaan, is an exhibition by internationally acclaimed Filipino visual artist Bert Monterona. Its 22 tapestry paintings carry his advocacies: sustainable living, protecting the environment, campaigning against war, and building a culture of peace.',
          },
          {
            heading: 'The Tapestry Paintings',
            text: 'Inspired by Lumad and Muslim traditions, Monterona borrows motifs and patterns from their woodcarving, weaving, embroidery and brass casting. His technique is influenced by the Mandaya handwoven skirt, the dagmay, using natural dyes, textile paint and acrylic instead of the usual canvas. The paintings tell stories of the culture and struggles of Mindanao, to spark dialogue on peace, justice and the environment.',
          },
        ],
      },
    ],
  },
  {
    id: 'S3',
    galleries: [
      {
        title: 'Intersecting Currents',
        parts: [
          {
            heading: 'Magkasalubong na Alon: Ang Sama Dilaut at ang Dagat Sulu',
            text: 'Intersecting Currents, or Magkasalubong na Alon: Ang Sama Dilaut at ang Dagat Sulu.',
          },
        ],
      },
      {
        title: 'The Underwater Jewels of the Sulu Sea',
        parts: [
          {
            heading: 'The Sulu Sea',
            text: 'The Sulu Sea is bordered by Palawan, the Visayas, the Sulu Archipelago and Borneo. Its marine and coastal resources give the people of the surrounding islands food, livelihood, and protection from natural catastrophes. At its heart sits the Tubbataha Reef National Marine Park, a UNESCO World Heritage Site since 1993, with 396 coral species, almost 90 percent of all species found in the Philippines.',
          },
          {
            heading: 'Tubbataha and Zamboanga',
            text: "According to Filipino marine biologists Dr. Porfirio Aliño and Dr. Wilfredo Licuanan, Tubbataha Reef has a higher species diversity per square meter than Australia's Great Barrier Reef. The Basilan Strait and the Sulu Sea separate mainland Mindanao from the Sulu Archipelago. Zamboanga City, on the southwestern end of the peninsula, is rich in cultural and natural resources, and these waters are widely used for interisland commerce, fishing, and trade in marine products.",
          },
        ],
      },
    ],
  },
  {
    id: 'S4',
    galleries: [
      {
        title: 'Southern Philippines',
        parts: [
          {
            heading: 'Portal and Nexus of Barter, Trade, and Exchange',
            text: "Southern Philippines covers the big island of Mindanao and the small islands of the Sulu Archipelago, including Basilan, Jolo, Tawi-Tawi and Sibutu. Mindanao's strategic location let the region flourish through sea and land trade, along routes connecting the Philippines, Southeast Asia, mainland Asia and Europe.",
          },
          {
            heading: 'Zamboanga as a Portal',
            text: "Zamboanga is one of the most important portals, connecting mainland Mindanao to the Sulu Archipelago, Borneo, Malaysia and Indonesia, and giving traders access to forest goods and sea resources. As goods flowed, relationships between people and groups were created and transformed. Centuries of trade between many peoples shaped today's systems and regional relations, and this exhibition features the material goods that were part of these exchanges.",
          },
        ],
      },
      {
        title: 'Tabawan',
        parts: [
          {
            heading: 'Pre-Islamic Ritual and Traditional Practices in Tawi-Tawi',
            text: "Tabawan is a peaceful island in Tawi-Tawi, the last frontier of Sama heritage. Its rituals blend shamanic rites with Islamic beliefs, a 'folk Islam' that follows the phases of the moon and accompanies the Sama Tabawan from cradle to grave. The people actively preserve their culture for the next generation.",
          },
          {
            heading: 'Life by the Sea',
            text: 'The Sama Tabawan build their houses on stilts along the coast, close to air and water, and bring these elements into their ritual food, dance and music. They honor their ancestors through dance and food offerings, believing their forebears give guidance, sustenance and protection. They believe in Allah and Prophet Muhammad, respect other religions, and close their rituals with a thanksgiving prayer for the well-being of all.',
          },
        ],
      },
    ],
  },
];

export const BUILDING_IDS = MUSEUM_BUILDINGS.map((b) => b.id);

// Guide steps for GuideSpeechModal: a short welcome naming the galleries, then
// one step per overview part.
export function galleryTourSteps(buildingId) {
  const building = MUSEUM_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return [];
  const names = building.galleries.map((g) => g.title);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const steps = [{
    label: `BUILDING ${building.id}`,
    title: 'Welcome to the Galleries',
    text: `Building ${building.id} has ${names.length} galleries: ${list}. Let me tell you about each one.`,
  }];
  building.galleries.forEach((g) => {
    g.parts.forEach((p, i) => {
      steps.push({
        label: g.parts.length > 1 ? `${g.title.toUpperCase()} · ${i + 1} OF ${g.parts.length}` : g.title.toUpperCase(),
        title: p.heading,
        text: p.text,
      });
    });
  });
  return steps;
}
