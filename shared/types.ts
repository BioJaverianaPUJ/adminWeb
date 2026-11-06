export interface Species {
  id: string;
  scientificName: string;
  commonName: string;
  family: string;
  woodDensity: number | null;
}
export interface Specimen {
  id: string;
  speciesId: string;
  latitude: number;
  longitude: number;
  circumference: number | null;
  height: number | null;
  healthStatus: "WELL" | "FAIR" | "POOR" | "DEAD" | null;
  notes: string;
  observationDate: string | null;
  createdAt: string;
}
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  gender: string;
  profilePictureUrl?: string | null;
  bannerUrl?: string | null;
}
export interface Page<T> {
  content: T[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
  };
}
export type Coordinate = [number, number];
export type DraftKind =
  "green" | "interest" | "boundary" | "mission" | "achievement" | "curiosity";
export interface Draft {
  id: string;
  kind: DraftKind;
  title: string;
  description: string;
  color: string;
  points: Coordinate[];
  xp: number;
  period: "DAILY" | "WEEKLY" | "EVENT";
  target: number;
  objective: string;
  zoneId: string;
  startsAt: string;
  endsAt: string;
  images: string[];
  updatedAt: string;
}
