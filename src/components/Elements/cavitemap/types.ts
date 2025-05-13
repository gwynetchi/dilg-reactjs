export interface MayorData {
  name: string;
  bio: string;
  image: string;
  termStart: string;
  termEnd: string;
  politicalParty: string;
}

export interface CityData {
  name: string;
  image: string;
  description: string;
  coordinates: [number, number];
  mayor?: MayorData;
}

export interface MayorManagementProps {
  cities: Record<string, CityData>;
  onSave: (updatedCities: Record<string, CityData>) => Promise<void>;
}

export interface CaviteMapProps {
  onCityClick?: (city: CityData) => void;
}

// Utility function to normalize city names
export function normalizeCityName(name: string): string {
  return name.trim().toLowerCase();
}