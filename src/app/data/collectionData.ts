// ─────────────────────────────────────────────────────────────────────────
// DEPRECATED — no longer imported by any component as of the Supabase
// integration phase. All data now comes from Supabase via /src/hooks/.
// Keep this file as a reference and rollback point until production is
// confirmed stable, then delete it.
// ─────────────────────────────────────────────────────────────────────────

// Raw collection data from the CSV sample — 9M FY2025 (Jul 2024 – Mar 2025)

export interface BusinessRecord {
  name: string;
  category: string;
  credit: number;
  cash: number;
  deposit: number;
  totalCash: number;
  total: number;
  creditSPLY: number;
  cashSPLY: number;
  depositSPLY: number;
  totalCashSPLY: number;
  totalSPLY: number;
  growthPct: number;
}

const raw: Omit<BusinessRecord, 'totalCash' | 'total' | 'totalCashSPLY' | 'totalSPLY' | 'growthPct'>[] = [
  { name: 'ACI Animal Genetics',            category: 'Animal Health', credit: 0,          cash: 39.425877,   deposit: 0,          creditSPLY: 0,          cashSPLY: 40.689292,   depositSPLY: 0 },
  { name: 'ACI Consumer Electronics',       category: 'Consumer',      credit: 0,          cash: 0.1162,      deposit: 0,          creditSPLY: 0.317202,   cashSPLY: 0.352668,    depositSPLY: 0 },
  { name: 'ACI Edible Oils Limited',        category: 'FMCG',          credit: 21.436444,  cash: 0,           deposit: 160.099337, creditSPLY: 52.625736,  cashSPLY: 0,           depositSPLY: 85.585931 },
  { name: 'ACI Foods Limited',              category: 'FMCG',          credit: 127.088312, cash: 0,           deposit: 315.751015, creditSPLY: 351.669973, cashSPLY: 0,           depositSPLY: 308.471378 },
  { name: 'ACI Foods Limited (Rice Unit)',  category: 'FMCG',          credit: 203.741774, cash: 0.075,       deposit: 296.97946,  creditSPLY: 194.080936, cashSPLY: 0,           depositSPLY: 225.39857 },
  { name: 'ACI Formulations',              category: 'Pharma',        credit: 309.848125, cash: 19.855026,   deposit: 0,          creditSPLY: 280.813033, cashSPLY: 24.716876,   depositSPLY: 0 },
  { name: 'ACI Marine',                    category: 'Marine',        credit: 1.5,        cash: 0.863223,    deposit: 0,          creditSPLY: 0,          cashSPLY: 1.125,       depositSPLY: 0 },
  { name: 'ACI Marine - Spare Parts',      category: 'Marine',        credit: 0,          cash: 1.21814,     deposit: 0,          creditSPLY: 0,          cashSPLY: 0.485864,    depositSPLY: 0 },
  { name: 'ACI Motors Limited',            category: 'Motors',        credit: 191.53075,  cash: 6.501818,    deposit: 0,          creditSPLY: 167.563387, cashSPLY: 2.78,        depositSPLY: 0 },
  { name: 'ACI Motors Service income',     category: 'Motors',        credit: 0,          cash: 3.00495,     deposit: 0,          creditSPLY: 0,          cashSPLY: 2.78395,     depositSPLY: 0 },
  { name: 'ACI Premio Plastics',           category: 'Industrial',    credit: 84.38231,   cash: 0,           deposit: 243.340232, creditSPLY: 79.686502,  cashSPLY: 0,           depositSPLY: 217.146877 },
  { name: 'ACI Pure Flour Limited',        category: 'FMCG',          credit: 100.311339, cash: 0,           deposit: 401.135219, creditSPLY: 103.773194, cashSPLY: 0,           depositSPLY: 315.788405 },
  { name: 'ACI Renewable Energy',          category: 'Energy',        credit: 6.887357,   cash: 14.729857,   deposit: 0,          creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'ACI Salt Limited',             category: 'FMCG',          credit: 58.000636,  cash: 0,           deposit: 192.401287, creditSPLY: 52.668061,  cashSPLY: 0,           depositSPLY: 266.923455 },
  { name: 'ACI Water Pump',               category: 'Industrial',    credit: 55.587797,  cash: 110.956881,  deposit: 6.528887,   creditSPLY: 24.206894,  cashSPLY: 111.277705,  depositSPLY: 16.842826 },
  { name: 'Animal Health',                category: 'Animal Health', credit: 261.639362, cash: 325.58814,   deposit: 0,          creditSPLY: 239.896966, cashSPLY: 306.82082,   depositSPLY: 0 },
  { name: 'Beverage',                     category: 'FMCG',          credit: 1.633368,   cash: 0,           deposit: 11.881782,  creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'CEAT Tyre',                    category: 'Motors',        credit: 152.33298,  cash: 21.519524,   deposit: 0,          creditSPLY: 103.525882, cashSPLY: 16.662024,   depositSPLY: 0 },
  { name: 'Construction Equipment',       category: 'Industrial',    credit: 36.028918,  cash: 2,           deposit: 0,          creditSPLY: 58.99775,   cashSPLY: 1,           depositSPLY: 0 },
  { name: 'Consumer',                     category: 'Consumer',      credit: 100.174588, cash: 9.648509,    deposit: 481.81455,  creditSPLY: 75.619798,  cashSPLY: 16.588193,   depositSPLY: 512.075699 },
  { name: 'Diesel Engine',                category: 'Industrial',    credit: 12.849039,  cash: 7.3823,      deposit: 0.25,       creditSPLY: 11.200193,  cashSPLY: 5.679275,    depositSPLY: 0.10125 },
  { name: 'Diesel Generator & Spares',    category: 'Industrial',    credit: 101.365411, cash: 4.650489,    deposit: 0,          creditSPLY: 57.841453,  cashSPLY: 9.866597,    depositSPLY: 0 },
  { name: 'Edulink',                      category: 'Education',     credit: 0.819271,   cash: 0,           deposit: 13.199041,  creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Electrical',                   category: 'Industrial',    credit: 32.240892,  cash: 0.285182,    deposit: 30.250497,  creditSPLY: 47.015186,  cashSPLY: 0.393451,    depositSPLY: 23.181961 },
  { name: 'Fertilizer',                   category: 'Agri',          credit: 80.395228,  cash: 65.151357,   deposit: 0,          creditSPLY: 98.763589,  cashSPLY: 47.21896,    depositSPLY: 0 },
  { name: 'Field Crops',                  category: 'Agri',          credit: 42.977997,  cash: 58.726781,   deposit: 0,          creditSPLY: 93.103938,  cashSPLY: 99.047645,   depositSPLY: 0 },
  { name: 'Flora',                        category: 'FMCG',          credit: 33.388656,  cash: 0,           deposit: 0,          creditSPLY: 42.017127,  cashSPLY: 0,           depositSPLY: 0 },
  { name: 'FOTON',                        category: 'Motors',        credit: 141.62584,  cash: 21.678634,   deposit: 0,          creditSPLY: 107.652104, cashSPLY: 4.654011,    depositSPLY: 0 },
  { name: 'Harvester',                    category: 'Agri',          credit: 79.480707,  cash: 0,           deposit: 0,          creditSPLY: 27.722709,  cashSPLY: 0,           depositSPLY: 0 },
  { name: 'HealthCare Equipment',         category: 'Healthcare',    credit: 0,          cash: 2.718712,    deposit: 0,          creditSPLY: 0,          cashSPLY: 2.69869,     depositSPLY: 0 },
  { name: 'Hygiene',                      category: 'Consumer',      credit: 6.154769,   cash: 0.080467,    deposit: 363.423789, creditSPLY: 9.331364,   cashSPLY: 0.00175,     depositSPLY: 263.667999 },
  { name: 'Institutional Sales',          category: 'Sales',         credit: 0,          cash: 0,           deposit: 0,          creditSPLY: 1.339297,   cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Lab Equipment & Accessories',  category: 'Healthcare',    credit: 0.553584,   cash: 0,           deposit: 0,          creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Liqui Moly',                   category: 'Motors',        credit: 0,          cash: 19.936813,   deposit: 0,          creditSPLY: 0,          cashSPLY: 3.811921,    depositSPLY: 0 },
  { name: 'Lube Oil',                     category: 'Motors',        credit: 0,          cash: 0.59987,     deposit: 0,          creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Mahindra',                     category: 'Motors',        credit: 4.185945,   cash: 0,           deposit: 0,          creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Ndds',                         category: 'Pharma',        credit: 2.37875,    cash: 0.921,       deposit: 0,          creditSPLY: 0.859457,   cashSPLY: 1.123,       depositSPLY: 0 },
  { name: 'New Machineries',              category: 'Industrial',    credit: 1.086133,   cash: 0.18,        deposit: 0,          creditSPLY: 1.422319,   cashSPLY: 0.55,        depositSPLY: 0 },
  { name: 'Paint',                        category: 'Consumer',      credit: 50.912541,  cash: 12.975942,   deposit: 0.37863,    creditSPLY: 44.197468,  cashSPLY: 16.370392,   depositSPLY: 0.02 },
  { name: 'Pharmaceuticals',             category: 'Pharma',        credit: 886.826097, cash: 1219.64351,  deposit: 0,          creditSPLY: 357.011575, cashSPLY: 1319.143528, depositSPLY: 0 },
  { name: 'Power Cable Accessories',      category: 'Industrial',    credit: 1.914819,   cash: 0.275546,    deposit: 0,          creditSPLY: 0.561985,   cashSPLY: 0.011,       depositSPLY: 0 },
  { name: 'Power Products',               category: 'Industrial',    credit: 0.885681,   cash: 4.8461,      deposit: 0,          creditSPLY: 0.501,      cashSPLY: 1.47935,     depositSPLY: 0 },
  { name: 'Power Tiller',                 category: 'Agri',          credit: 18.940437,  cash: 5.335717,    deposit: 0,          creditSPLY: 14.18832,   cashSPLY: 4.661381,    depositSPLY: 0 },
  { name: 'Premiaflex',                   category: 'Industrial',    credit: 680.864542, cash: 0,           deposit: 9.679155,   creditSPLY: 690.652531, cashSPLY: 0,           depositSPLY: 14.338892 },
  { name: 'Spare - Construction Equipment', category: 'Industrial',  credit: 1.807223,   cash: 3.070347,    deposit: 0,          creditSPLY: 1.884314,   cashSPLY: 3.086143,    depositSPLY: 0 },
  { name: 'Spare - New Machineries',      category: 'Industrial',    credit: 0,          cash: 0,           deposit: 0,          creditSPLY: 17.662793,  cashSPLY: 18.395604,   depositSPLY: 0 },
  { name: 'Spare - Tractor',              category: 'Agri',          credit: 73.291442,  cash: 19.216507,   deposit: 0,          creditSPLY: 24.728634,  cashSPLY: 16.468107,   depositSPLY: 0 },
  { name: 'Spare Parts',                  category: 'Industrial',    credit: 5.999611,   cash: 0.43898,     deposit: 0,          creditSPLY: 6.647099,   cashSPLY: 2.385027,    depositSPLY: 0 },
  { name: 'Tire',                         category: 'Motors',        credit: 0.13,       cash: 0,           deposit: 0,          creditSPLY: 0.434787,   cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Tools and Accessories',        category: 'Industrial',    credit: 1.82764,    cash: 13.232944,   deposit: 0,          creditSPLY: 1.068307,   cashSPLY: 13.951236,   depositSPLY: 0 },
  { name: 'Vegetables',                   category: 'Agri',          credit: 21.50699,   cash: 12.158865,   deposit: 0,          creditSPLY: 18.867676,  cashSPLY: 10.287267,   depositSPLY: 0 },
  { name: 'Yamaha Apparels',              category: 'Motors',        credit: 0,          cash: 0.00991,     deposit: 0,          creditSPLY: 0,          cashSPLY: 0,           depositSPLY: 0 },
  { name: 'Yamaha Motorcycles',           category: 'Motors',        credit: 243.126187, cash: 2087.600356, deposit: 556.584275, creditSPLY: 137.012448, cashSPLY: 1808.600741, depositSPLY: 493.2209 },
  { name: 'Yamaha Music',                 category: 'Consumer',      credit: 0,          cash: 3.27075,     deposit: 0,          creditSPLY: 1.2135,     cashSPLY: 1.513499,    depositSPLY: 0.0032 },
  { name: 'Yamaha Spare Parts',           category: 'Motors',        credit: 0.000001,   cash: 169.687339,  deposit: 0,          creditSPLY: 0,          cashSPLY: 126.86567,   depositSPLY: 0 },
];

// Compute derived fields
export const collectionData: BusinessRecord[] = raw.map(r => {
  const totalCash = r.cash + r.deposit;
  const total = r.credit + totalCash;
  const totalCashSPLY = r.cashSPLY + r.depositSPLY;
  const totalSPLY = r.creditSPLY + totalCashSPLY;
  const growthPct = totalSPLY > 0 ? parseFloat(((total - totalSPLY) / totalSPLY * 100).toFixed(2)) : 0;
  return { ...r, totalCash, total, totalCashSPLY, totalSPLY, growthPct };
});

// Aggregate totals
export const periodTotals = collectionData.reduce(
  (acc, r) => ({
    credit:    acc.credit    + r.credit,
    cash:      acc.cash      + r.cash,
    deposit:   acc.deposit   + r.deposit,
    totalCash: acc.totalCash + r.totalCash,
    total:     acc.total     + r.total,
  }),
  { credit: 0, cash: 0, deposit: 0, totalCash: 0, total: 0 }
);

export const splyTotals = collectionData.reduce(
  (acc, r) => ({
    credit:    acc.credit    + r.creditSPLY,
    cash:      acc.cash      + r.cashSPLY,
    deposit:   acc.deposit   + r.depositSPLY,
    totalCash: acc.totalCash + r.totalCashSPLY,
    total:     acc.total     + r.totalSPLY,
  }),
  { credit: 0, cash: 0, deposit: 0, totalCash: 0, total: 0 }
);

// Top 10 by total descending
export const top10Businesses = [...collectionData]
  .sort((a, b) => b.total - a.total)
  .slice(0, 10);

// Portfolio groupings (as shown in Figma design)
export interface Portfolio {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  bgColor: string;
  initials: string;
  total: number;
  totalSPLY: number;
  growthPct: number;
}

const sumGroup = (names: string[]) => {
  const items = collectionData.filter(r => names.includes(r.name));
  const total = items.reduce((s, r) => s + r.total, 0);
  const totalSPLY = items.reduce((s, r) => s + r.totalSPLY, 0);
  return { total, totalSPLY, growthPct: totalSPLY > 0 ? parseFloat(((total - totalSPLY) / totalSPLY * 100).toFixed(2)) : 0 };
};

export const portfolios: Portfolio[] = [
  {
    id: 'pharma',
    name: 'ACI Pharma',
    subtitle: 'Local | HCE | NDDS | Lab EQ',
    color: '#00A65D',
    bgColor: '#ECFDF3',
    initials: 'ACI',
    ...sumGroup(['Pharmaceuticals', 'Ndds', 'HealthCare Equipment', 'Lab Equipment & Accessories', 'ACI Formulations']),
  },
  {
    id: 'agribusiness',
    name: 'ACI Agribusiness',
    subtitle: 'Including Motors',
    color: '#66B663',
    bgColor: '#F0FDF4',
    initials: 'AG',
    ...sumGroup(['Field Crops', 'Fertilizer', 'Vegetables', 'Harvester', 'Power Tiller', 'Spare - Tractor', 'ACI Animal Genetics', 'Animal Health', 'FOTON', 'Mahindra']),
  },
  {
    id: 'yamaha',
    name: 'ACI Yamaha',
    subtitle: 'Motorcycles & Parts',
    color: '#E91922',
    bgColor: '#FEF3F2',
    initials: 'YM',
    ...sumGroup(['Yamaha Motorcycles', 'Yamaha Spare Parts', 'Yamaha Apparels', 'Yamaha Music']),
  },
  {
    id: 'consumer',
    name: 'ACI Consumer',
    subtitle: 'FMCG & Hygiene',
    color: '#465FFF',
    bgColor: '#EEF2FF',
    initials: 'CN',
    ...sumGroup(['Consumer', 'Hygiene', 'ACI Foods Limited', 'ACI Foods Limited (Rice Unit)', 'ACI Edible Oils Limited', 'ACI Pure Flour Limited', 'ACI Salt Limited', 'Beverage', 'Flora']),
  },
  {
    id: 'motors',
    name: 'ACI Motors',
    subtitle: 'Vehicles & Spares',
    color: '#F79009',
    bgColor: '#FFFAEB',
    initials: 'MT',
    ...sumGroup(['ACI Motors Limited', 'ACI Motors Service income', 'CEAT Tyre', 'Spare Parts', 'Tire', 'Liqui Moly', 'Lube Oil']),
  },
];

// Monthly trend data for Performance Statistics chart (synthetic, based on 9M averages)
export interface MonthlyTrend {
  month: string;
  current: number;
  sply: number;
}

export const monthlyTrend: MonthlyTrend[] = [
  { month: 'Jan', current: 1380,  sply: 1180 },
  { month: 'Feb', current: 1290,  sply: 1095 },
  { month: 'Mar', current: 1520,  sply: 1250 },
  { month: 'Apr', current: 1100,  sply: 950 },
  { month: 'May', current: 1060,  sply: 890 },
  { month: 'Jun', current: 1230,  sply: 1020 },
  { month: 'Jul', current: 1080,  sply: 920 },
  { month: 'Aug', current: 1150,  sply: 1010 },
  { month: 'Sep', current: 1320,  sply: 1100 },
  { month: 'Oct', current: 1410,  sply: 1180 },
  { month: 'Nov', current: 1490,  sply: 1240 },
  { month: 'Dec', current: 1560,  sply: 1300 },
];

// Category breakdown for projection gauge
export const projectionData = {
  projection: 12500,          // total projection for the period (M)
  collected: periodTotals.total,
  depositPct: 85,
  creditPct: Math.round((periodTotals.credit / periodTotals.total) * 100),
};