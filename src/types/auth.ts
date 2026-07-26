export interface Profile {
  user_id: string;
  email: string;
  name: string;
  age: number | null;
  gender: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  conditions: string[];
  history_text: string | null;
  medications_text: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
  health_goals?: string[];
  active_diseases?: string[];
  other_disease?: string;
  medical_history?: string;
  no_medication?: boolean;
  dob?: string;
}
