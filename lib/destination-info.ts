export type DestinationInfo = {
  slug: string; name: string; flag: string; currency: string; countryCode: string;
  capital: string; languages: string; foods: string[]; sports: string[]; places: {name:string; description:string}[];
  overview: string;
};

export const destinations: DestinationInfo[] = [
  { slug:"india", name:"India", flag:"🇮🇳", currency:"INR", countryCode:"IND", capital:"New Delhi",
    languages:"India has no single national language. Hindi and English are used for Union government purposes; 22 languages are constitutionally scheduled, with many regional languages spoken across the country.",
    foods:["Biryani","Masala dosa","Butter chicken","Chole bhature","Samosa"], sports:["Cricket","Field hockey","Football","Badminton","Kabaddi"],
    places:[{name:"Taj Mahal, Agra",description:"The white-marble mausoleum and UNESCO World Heritage Site."},{name:"Jaipur",description:"Known for Amber Fort, Hawa Mahal and its historic Pink City."},{name:"Kerala backwaters",description:"Lush waterways, houseboats and coastal villages."},{name:"Varanasi",description:"Historic riverfront ghats along the Ganges."},{name:"Goa",description:"Beaches, Portuguese-era heritage and coastal cuisine."}],
    overview:"A vast and diverse country known for its regional cultures, historic architecture, festivals and varied landscapes." },
  { slug:"pakistan", name:"Pakistan", flag:"🇵🇰", currency:"PKR", countryCode:"PAK", capital:"Islamabad",
    languages:"Urdu and English are official languages. Punjabi, Pashto, Sindhi, Saraiki, Balochi and other languages are widely spoken regionally.",
    foods:["Biryani","Nihari","Chapli kebab","Haleem","Sajji"], sports:["Cricket","Field hockey","Football","Squash","Kabaddi"],
    places:[{name:"Hunza Valley",description:"Mountain scenery, historic forts and views of the Karakoram."},{name:"Lahore Fort and Badshahi Mosque",description:"Landmarks of Mughal-era architecture."},{name:"Faisal Mosque, Islamabad",description:"A distinctive modern mosque set against the Margalla Hills."},{name:"Skardu",description:"A gateway to high mountain lakes and trekking routes."},{name:"Mohenjo-daro",description:"Archaeological remains of an ancient Indus Valley city."}],
    overview:"A country of rich regional traditions, major Mughal heritage and dramatic mountain landscapes." },
  { slug:"nepal", name:"Nepal", flag:"🇳🇵", currency:"NPR", countryCode:"NPL", capital:"Kathmandu",
    languages:"Nepali is the official language. Maithili, Bhojpuri, Tharu, Tamang, Newar and many other languages are spoken.",
    foods:["Dal bhat","Momo","Thukpa","Sel roti","Chatamari"], sports:["Football","Cricket","Volleyball","Martial arts","Basketball"],
    places:[{name:"Kathmandu Valley",description:"Historic temples, palaces and traditional squares."},{name:"Pokhara",description:"Lakeside views and a popular base for Himalayan adventures."},{name:"Chitwan National Park",description:"Wildlife safaris and subtropical forest."},{name:"Lumbini",description:"The revered birthplace of Gautama Buddha."},{name:"Sagarmatha National Park",description:"Home to Mount Everest and high Himalayan trails."}],
    overview:"A Himalayan nation celebrated for mountain trekking, Buddhist and Hindu heritage and distinctive local food." },
  { slug:"bangladesh", name:"Bangladesh", flag:"🇧🇩", currency:"BDT", countryCode:"BGD", capital:"Dhaka",
    languages:"Bangla (Bengali) is the official and principal language. English is also used in education, business and administration.",
    foods:["Hilsa fish curry","Kacchi biryani","Fuchka","Pitha","Beef tehari"], sports:["Cricket","Football","Kabaddi","Field hockey","Badminton"],
    places:[{name:"Sundarbans",description:"The world's largest mangrove forest and a UNESCO World Heritage Site."},{name:"Cox's Bazar",description:"A long sandy beach on the Bay of Bengal."},{name:"Old Dhaka",description:"Historic streets, riverfront sights and traditional food."},{name:"Srimangal",description:"Tea gardens, green hills and wetlands."},{name:"Paharpur",description:"The remains of the ancient Buddhist monastery at Somapura Mahavihara."}],
    overview:"A river-rich South Asian country with vibrant Bengali culture, historic sites, tea gardens and a renowned textile heritage." },
  { slug:"egypt", name:"Egypt", flag:"🇪🇬", currency:"EGP", countryCode:"EGY", capital:"Cairo",
    languages:"Arabic is the official language. Egyptian Arabic is widely spoken; English and French are used in some tourism and business settings.",
    foods:["Koshari","Ful medames","Ta'ameya","Molokhia","Mahshi"], sports:["Football","Squash","Handball","Basketball","Volleyball"],
    places:[{name:"Pyramids of Giza",description:"Ancient pyramids and the Great Sphinx near Cairo."},{name:"Luxor",description:"Karnak Temple, Luxor Temple and the Valley of the Kings."},{name:"Aswan",description:"Nile scenery, Nubian culture and Philae Temple."},{name:"Abu Simbel",description:"Monumental rock-cut temples built by Ramesses II."},{name:"Red Sea coast",description:"Coral reefs and seaside resorts around Hurghada and Sharm El-Sheikh."}],
    overview:"A historic North African country shaped by the Nile, ancient Egyptian civilization and Red Sea coastal destinations." },
  { slug:"philippines", name:"Philippines", flag:"🇵🇭", currency:"PHP", countryCode:"PHL", capital:"Manila",
    languages:"Filipino and English are official languages. Cebuano, Ilocano, Hiligaynon, Waray and many other regional languages are spoken.",
    foods:["Adobo","Sinigang","Lechon","Pancit","Halo-halo"], sports:["Basketball","Boxing","Volleyball","Football","Badminton"],
    places:[{name:"Palawan",description:"Limestone cliffs, lagoons and clear-water island scenery."},{name:"Boracay",description:"Known for White Beach and water activities."},{name:"Chocolate Hills, Bohol",description:"A distinctive landscape of rounded hills."},{name:"Banaue Rice Terraces",description:"Mountain rice terraces shaped by generations of farming."},{name:"Intramuros, Manila",description:"The historic walled district of the capital."}],
    overview:"An archipelago of more than 7,000 islands known for beaches, marine life, warm hospitality and diverse regional cultures." },
];

export function getDestination(slug: string) {
  return destinations.find((destination) => destination.slug === slug);
}
