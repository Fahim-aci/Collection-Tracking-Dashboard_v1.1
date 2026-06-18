# Example CSV — Correct Format for Daily Import

> Copy the CSV block below, paste it into a plain text file, save it as `collection_YYYYMMDD.csv`, and upload it on the Import Data page. Every business name here is spelled exactly as it exists in the `businesses` table, so all 55 rows will show **Matched** (green) in the preview.

---

## Required CSV Columns

The parser reads these **7 columns by name** (header row is mandatory, order does not matter):

| Column | What it means | Required? |
|---|---|---|
| `Business` | SBU name — must match `businesses.name` exactly | ✅ Yes |
| `Credit` | Credit collection amount (BDT million) for the current period | ✅ Yes |
| `Cash` | Cash collection amount for the current period | ✅ Yes |
| `Deposit` | Deposit collection amount for the current period | ✅ Yes |
| `CreditSPLY` | Credit amount — same period last year | ✅ Yes (if SPLY toggle is on) |
| `CashSPLY` | Cash amount — same period last year | ✅ Yes (if SPLY toggle is on) |
| `DepositSPLY` | Deposit amount — same period last year | ✅ Yes (if SPLY toggle is on) |

Any **extra columns** (e.g. `TotalCash`, `Total`, `TotalCashSPLY`, `TotalSPLY`) are safely ignored — the parser skips any column it does not recognise. You do not need to remove them from your ERP export.

Use `0` for any amount that is zero — do not leave the cell blank.

---

## The 55-SBU Template CSV

Copy everything between the triple-backtick fences below (including the header line) and save it as a `.csv` file. Replace the sample numbers with your real figures before uploading.

```
Business,Credit,Cash,Deposit,CreditSPLY,CashSPLY,DepositSPLY
ACI Animal Genetics,0,39.425877,0,0,40.689292,0
ACI Consumer Electronics,0,0.1162,0,0.317202,0.352668,0
ACI Edible Oils Limited,21.436444,0,160.099337,52.625736,0,85.585931
ACI Foods Limited,127.088312,0,315.751015,351.669973,0,308.471378
ACI Foods Limited (Rice Unit),203.741774,0.075,296.97946,194.080936,0,225.39857
ACI Formulations,309.848125,19.855026,0,280.813033,24.716876,0
ACI Marine,1.5,0.863223,0,0,1.125,0
ACI Marine - Spare Parts,0,1.21814,0,0,0.485864,0
ACI Motors Limited,191.53075,6.501818,0,167.563387,2.78,0
ACI Motors Service income,0,3.00495,0,0,2.78395,0
ACI Premio Plastics,84.38231,0,243.340232,79.686502,0,217.146877
ACI Pure Flour Limited,100.311339,0,401.135219,103.773194,0,315.788405
ACI Renewable Energy,6.887357,14.729857,0,0,0,0
ACI Salt Limited,58.000636,0,192.401287,52.668061,0,266.923455
ACI Water Pump,55.587797,110.956881,6.528887,24.206894,111.277705,16.842826
Animal Health,261.639362,325.58814,0,239.896966,306.82082,0
Beverage,1.633368,0,11.881782,0,0,0
CEAT Tyre,152.33298,21.519524,0,103.525882,16.662024,0
Construction Equipment,36.028918,2,0,58.99775,1,0
Consumer,100.174588,9.648509,481.81455,75.619798,16.588193,512.075699
Diesel Engine,12.849039,7.3823,0.25,11.200193,5.679275,0.10125
Diesel Generator & Spares,101.365411,4.650489,0,57.841453,9.866597,0
Edulink,0.819271,0,13.199041,0,0,0
Electrical,32.240892,0.285182,30.250497,47.015186,0.393451,23.181961
Fertilizer,80.395228,65.151357,0,98.763589,47.21896,0
Field Crops,42.977997,58.726781,0,93.103938,99.047645,0
Flora,33.388656,0,0,42.017127,0,0
FOTON,141.62584,21.678634,0,107.652104,4.654011,0
Harvester,79.480707,0,0,27.722709,0,0
HealthCare Equipment,0,2.718712,0,0,2.69869,0
Hygiene,6.154769,0.080467,363.423789,9.331364,0.00175,263.667999
Institutional Sales,0,0,0,1.339297,0,0
Lab Equipment & Accessories,0.553584,0,0,0,0,0
Liqui Moly,0,19.936813,0,0,3.811921,0
Lube Oil,0,0.59987,0,0,0,0
Mahindra,4.185945,0,0,0,0,0
Ndds,2.37875,0.921,0,0.859457,1.123,0
New Machineries,1.086133,0.18,0,1.422319,0.55,0
Paint,50.912541,12.975942,0.37863,44.197468,16.370392,0.02
Pharmaceuticals,886.826097,1219.64351,0,357.011575,1319.143528,0
Power Cable Accessories,1.914819,0.275546,0,0.561985,0.011,0
Power Products,0.885681,4.8461,0,0.501,1.47935,0
Power Tiller,18.940437,5.335717,0,14.18832,4.661381,0
Premiaflex,680.864542,0,9.679155,690.652531,0,14.338892
Spare - Construction Equipment,1.807223,3.070347,0,1.884314,3.086143,0
Spare - New Machineries,0,0,0,17.662793,18.395604,0
Spare - Tractor,73.291442,19.216507,0,24.728634,16.468107,0
Spare Parts,5.999611,0.43898,0,6.647099,2.385027,0
Tire,0.13,0,0,0.434787,0,0
Tools and Accessories,1.82764,13.232944,0,1.068307,13.951236,0
Vegetables,21.50699,12.158865,0,18.867676,10.287267,0
Yamaha Apparels,0,0.00991,0,0,0,0
Yamaha Motorcycles,243.126187,2087.600356,556.584275,137.012448,1808.600741,493.2209
Yamaha Music,0,3.27075,0,1.2135,1.513499,0.0032
Yamaha Spare Parts,0.000001,169.687339,0,0,126.86567,0
```

---

## Naming Rules — What Will Break a Match

The system compares names after normalising both sides (lowercase, collapse spaces, strip invisible characters), so minor spacing issues are forgiven. But these will still cause a **"Not Found"** result:

| Problem | CSV example | Database name | Fix |
|---|---|---|---|
| Extra word | `ACI Foods Ltd` | `ACI Foods Limited` | Use the full name |
| Missing bracket part | `ACI Foods` | `ACI Foods Limited (Rice Unit)` | Include the `(Rice Unit)` part |
| Wrong punctuation | `Diesel Generator and Spares` | `Diesel Generator & Spares` | Use `&` not `and` |
| Wrong capitalisation on a word | `Healthcare Equipment` | `HealthCare Equipment` | Capital `C` in `HealthCare` |
| Abbreviation | `ACIML` | `ACI Motors Limited` | Use the full name |

---

## Quick Spot-Check After Upload

Once you drop the CSV on the Import page, check the **Data Preview** table on the right:

- All 55 rows should show a green **Matched** badge.
- The **Grand Total** footer row should match the sum you expect from your ERP report.
- If any row shows **Not Found**, compare that business name character-by-character against the table above. See `troubleshoot.md` for the full diagnostic guide.

---

## File Naming Convention (Recommendation)

Save your daily CSV with the collection date in the file name so the import log is easy to read later:

```
collection_20260422.csv        ← for 22 April 2026
collection_20260422_revised.csv ← if you re-upload a corrected version
```

---

*All 55 names above are sourced directly from the `INSERT INTO businesses` seed block in `DATABASE.md` Section 8A and will match 100% against a freshly seeded `businesses` table.*
