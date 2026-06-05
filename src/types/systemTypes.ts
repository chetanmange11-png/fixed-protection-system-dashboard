export type SystemCategory = 'Fixed System' | 'Foam System' | 'Sprinkler System' | 'Rim Seal Protection';

export interface LocationRecord {
  id: string;
  area: string;
  subArea: string;
  plantLocation: string;
  systemCategory: SystemCategory;
}
