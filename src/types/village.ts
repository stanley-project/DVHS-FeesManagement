export interface Village {
  id: string;
  name: string;
  distance_from_school: number;
  is_active: boolean;
  bus_number?: string | null;
  created_at: string;
  updated_at: string;
}