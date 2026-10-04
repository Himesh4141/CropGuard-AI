export interface Farm {
  id: string;
  owner_id: string;
  name: string;
  village: string | null;
  district: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
}


export interface FarmCreate {
  name: string;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}


export type FarmUpdate =
  FarmCreate;
