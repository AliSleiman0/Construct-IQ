export type UnitStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD';
export type UnitType = '1BR' | '2BR' | '3BR' | 'Penthouse';

export interface MockUnit {
  id: string;
  label: string;            // e.g. "12B"
  floor: number;
  position: 'A' | 'B' | 'C' | 'D';
  type: UnitType;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  priceUsd: number;
  status: UnitStatus;
  buyerId: string | null;
  imageUrl: string;
  description: string;
}

const TYPE_BY_POS: Record<MockUnit['position'], UnitType> = {
  A: '2BR',
  B: '3BR',
  C: '1BR',
  D: '2BR',
};

const SQFT_BY_TYPE: Record<UnitType, number> = {
  '1BR': 720,
  '2BR': 1080,
  '3BR': 1420,
  Penthouse: 2200,
};

const BEDROOMS_BY_TYPE: Record<UnitType, number> = {
  '1BR': 1,
  '2BR': 2,
  '3BR': 3,
  Penthouse: 4,
};

const BATHROOMS_BY_TYPE: Record<UnitType, number> = {
  '1BR': 1,
  '2BR': 2,
  '3BR': 2,
  Penthouse: 3,
};

const PRICE_BY_TYPE: Record<UnitType, number> = {
  '1BR': 285000,
  '2BR': 410000,
  '3BR': 525000,
  Penthouse: 890000,
};

const buildUnits = (): MockUnit[] => {
  const out: MockUnit[] = [];
  const floors = [7, 8, 9, 10, 11, 12];
  const positions: MockUnit['position'][] = ['A', 'B', 'C', 'D'];
  let i = 0;

  for (const floor of floors) {
    for (const position of positions) {
      const isPenthouse = floor === 12 && (position === 'A' || position === 'D');
      const type: UnitType = isPenthouse ? 'Penthouse' : TYPE_BY_POS[position];
      const label = `${floor}${position}`;
      // Distribute statuses for variety
      let status: UnitStatus = 'AVAILABLE';
      if (i % 4 === 1) status = 'SOLD';
      else if (i % 5 === 2) status = 'RESERVED';

      let buyerId: string | null = null;
      // Carlos owns 12B specifically — mark RESERVED to him
      if (label === '12B') {
        status = 'RESERVED';
        buyerId = 'user-client';
      }

      const floorPremium = (floor - 7) * 7500;
      const priceUsd = PRICE_BY_TYPE[type] + floorPremium;

      out.push({
        id: `unit-${label.toLowerCase()}`,
        label,
        floor,
        position,
        type,
        bedrooms: BEDROOMS_BY_TYPE[type],
        bathrooms: BATHROOMS_BY_TYPE[type],
        sqft: SQFT_BY_TYPE[type] + floorPremium / 100,
        priceUsd,
        status,
        buyerId,
        imageUrl: `https://picsum.photos/seed/${label.toLowerCase()}/640/420`,
        description:
          type === 'Penthouse'
            ? 'Top-floor penthouse with wraparound balcony, panoramic city views, and dedicated elevator access.'
            : `Bright ${BEDROOMS_BY_TYPE[type]}-bedroom layout with floor-to-ceiling windows and a private balcony facing the city skyline.`,
      });
      i += 1;
    }
  }
  return out;
};

export const mockUnits: MockUnit[] = buildUnits();

export const findUnitById = (id: string): MockUnit | undefined =>
  mockUnits.find((u) => u.id === id);

export const findUnitByLabel = (label: string): MockUnit | undefined =>
  mockUnits.find((u) => u.label === label);

export const findUnitForBuyer = (buyerId: string): MockUnit | undefined =>
  mockUnits.find((u) => u.buyerId === buyerId);
