export interface CropField {
  id: string;
  farm_id: string;
  name: string;
  crop_name: string;
  variety: string | null;
  area_acres: number;
  sowing_date: string | null;
}


export interface FieldCreate {
  farm_id: string;
  name: string;
  crop_name: string;
  variety?: string | null;
  area_acres: number;
  sowing_date?: string | null;
}


export type FieldUpdate =
  FieldCreate;
