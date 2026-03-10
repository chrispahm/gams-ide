# CAPRI Environmental Indicators -- Detailed Reference

## 1. GHG Emission Sources and Codes

| Greenhouse Gas | Emission Source                                      | Code    |
|----------------|------------------------------------------------------|---------|
| CH4            | Enteric fermentation                                 | CH4Ent  |
| CH4            | Manure management                                    | CH4Man  |
| CH4            | Rice production                                      | CH4Ric  |
| CH4            | LUC biomass burning                                  | CH4bur  |
| N2O            | Manure management                                    | N2OMan  |
| N2O            | Manure excretion on grazings                         | N2OGra  |
| N2O            | Synthetic fertilizer application                     | N2OSyn  |
| N2O            | Manure application                                   | N2OApp  |
| N2O            | Crop residues                                        | N2OCro  |
| N2O            | Indirect -- ammonia volatilization                   | N2OAmm  |
| N2O            | Indirect -- leaching and runoff                      | N2OLea  |
| N2O            | Cultivation of histosols                             | N2Ohis  |
| N2O            | LUC biomass burning                                  | N2Obur  |
| CO2            | Cultivation of histosols                             | CO2his  |
| CO2            | Urea application                                     | CO2urea |
| CO2            | Liming                                               | CO2lim  |
| CO2            | LUC above/below ground biomass                       | CO2bio  |
| CO2            | LUC soil carbon changes                              | CO2soi  |

References: Perez 2005/2006, Leip et al. 2010, IPCC 2006 Guidelines.


## 2. CH4 from Enteric Fermentation (Tier 2)

Methane from enteric fermentation is calculated endogenously from gross energy (GE)
intake, which depends on the feed allocation module:

    CH4_enteric = GE_intake * (Ym / 55.65)

Where:
- `GE_intake`: gross energy intake in MJ/head/day (endogenous from feed module)
- `Ym`: methane conversion factor (fraction of GE converted to CH4)
  - Dairy cattle: 6.0-6.5%
  - Other cattle: 6.5%
  - Sheep/goat: 6.5%
  - Pigs: 1.0% (minor source)
- 55.65 MJ/kg CH4 is the energy content of methane

The GE intake is linked to the CAPRI feed module requirement functions for energy (ENNE)
and crude protein (CRPR). Animal activities: DCOL, DCOH, BULL, BULH, HEIL, HEIH, SCOW,
HEIR, CAMF, CAFF, CAMR, CAFR, PIGF, SOWS, SHGM, SHGF, HENS, POUF.


## 3. CH4 from Manure Management (Tier 2)

    CH4_manure = VS * Bo * MCF * 0.67

Where:
- `VS`: volatile solids excreted (kg/head/year), derived from feed digestibility
- `Bo`: maximum CH4 producing capacity (m3 CH4/kg VS)
  - Cattle: 0.24, Pigs: 0.45, Poultry: 0.39
- `MCF`: methane conversion factor by storage system and climate
  - Liquid/slurry: 10-80% (temperature dependent)
  - Solid storage: 1-5%
  - Pasture/range: 1-2%
- 0.67 kg/m3 is the density of CH4

Storage system shares are from the GAINS database (IIASA), differentiated by member state
and animal type. The share of time on grazing vs. stable is member-state-specific:
- Dairy cows: 41% stable (Ireland) to 93% stable (Switzerland)
- Housing split between liquid and solid systems per country (e.g., Netherlands: 100%
  liquid for cows; Finland: 55% solid)


## 4. N2O Emissions from Agricultural Soils

### Direct N2O from managed soils (IPCC 2006, Chapter 11)

    N2O_direct = (F_SN + F_ON + F_CR + F_SOM) * EF1

Where:
- `F_SN`: synthetic N fertilizer applied (endogenous in CAPRI supply model)
- `F_ON`: organic N applied (manure, adjusted for NH3 losses in housing/storage)
- `F_CR`: N from crop residues (IPCC 2006 Tier 1 factors for above/below ground)
- `F_SOM`: N from mineralisation of soil organic matter (histosols)
- `EF1`: emission factor = 0.01 kg N2O-N / kg N input (IPCC default)

For grazing animals:
    N2O_grazing = F_PRP * EF3
- `EF3` = 0.02 (cattle) or 0.01 (other animals) kg N2O-N / kg N deposited

### Indirect N2O

From volatilization:
    N2O_vol = (F_SN * FracGASF + F_ON * FracGASM) * EF4
- `FracGASF` = 0.10 (fraction of synthetic N volatilized as NH3 + NOx)
- `FracGASM` = 0.20 (fraction of organic N volatilized)
- `EF4` = 0.01 kg N2O-N / kg N volatilized

From leaching:
    N2O_leach = (F_SN + F_ON + F_CR + F_SOM) * FracLEACH * EF5
- `FracLEACH` = 0.30 (or MITERRA-based regional values)
- `EF5` = 0.0075 kg N2O-N / kg N leached


## 5. Nitrogen Balance Equations

The CAPRI N balance for a region r and crop c is (simplified from equation 3.39):

    SUM_c [Levl(r,c) * NutContent(r,c) * (1 - BioFix(c))] * NutFac(r) * (1 + NutFacG(r))
    = NETTRD_N(r) * (1 - NH3LossAnorg(r))
      + NBalAtmDep(r) * NFactAtmDep(c)
      + SUM_a [Levl(r,a) * NManure(r,a) * (1 - NH3LossManure) * (1 - NavFac(r))]

Where:
- `Levl(r,c)`: crop activity level (1000 ha)
- `NutContent(r,c)`: N export per unit of yield (kg N/ton, see table below)
- `BioFix(c)`: biological fixation share (PULS: 0.75, OFAR: 0.10, GRAE/GRAI: 0.05)
- `NutFac(r)`: over-fertilization factor (prior mean 1.20, bounds 0.05-5.00)
- `NutFacG(r)`: grassland additional factor (prior mean 0.10, bounds 0-2.5)
- `NETTRD_N(r)`: regional mineral N fertilizer purchases
- `NH3LossAnorg(r)`: ammonia loss fraction from mineral fertilizer application
- `NBalAtmDep(r)`: atmospheric N deposition
- `NManure(r,a)`: N in manure per head of animal activity a
- `NH3LossManure`: ammonia losses from organic N (housing + storage + application)
- `NavFac(r)`: N availability in manure (prior ~34%, bounds near 0-100%)

The HPD estimator minimizes squared deviations of NutFac, NavFac, NutFacG from their
prior means, weighted by imputed standard deviations (equation 3.40 in documentation).


## 6. Nutrient Export Coefficients (kg per ton of yield)

| Crop                 | N     | P     | K     |
|----------------------|-------|-------|-------|
| Soft wheat (SWHE)    | 20    | 8     | 6     |
| Durum wheat (DWHE)   | 23    | 8     | 7     |
| Rye (RYE)            | 15    | 8     | 6     |
| Barley (BARL)        | 15    | 8     | 6     |
| Oats (OATS)          | 15.5  | 8     | 6     |
| Grain maize (MAIZ)   | 14    | 8     | 5     |
| Other cereals (OCER) | 18    | 8     | 6     |
| Paddy rice (PARI)    | 22    | 7     | 24    |
| Straw                | 6     | 3     | 18    |
| Potatoes (POTA)      | 3.5   | 1.4   | 6     |
| Sugar beet (SUGB)    | 1.8   | 1.0   | 2.5   |
| Pulses (PULS)        | 4.1   | 1.2   | 1.4   |
| Rape seed (RAPE)     | 33    | 18    | 10    |
| Sunflower (SUNF)     | 28    | 16    | 24    |
| Soya (SOYA)          | 58    | 16    | 24    |
| Other oilseeds (OOIL)| 30    | 16    | 16    |
| Grass (GRAE/GRAI)    | 5     | 1.5   | 3.5   |
| Fodder maize (MAIF)  | 3.2   | 2.0   | 4.4   |
| Other fodder (OFAR)  | 5.5   | 1.75  | 3.75  |
| Tomatoes (TOMA)      | 2.0   | 0.7   | 0.6   |
| Other vegetables     | 2.0   | 0.7   | 0.6   |
| Apples/pears (APPL)  | 1.1   | 0.3   | 1.6   |
| Citrus (CITR)        | 2.0   | 0.4   | 1.6   |
| Olive oil (OLIV)     | 4.5   | 1.0   | 0.5   |
| Table wine/grapes    | 1.9   | 1.0   | 3.1   |
| Tobacco (TOBA)       | 30.0  | 4.0   | 45.0  |
| Nurseries/flowers    | 65    | 22    | 20    |

Maximum exports allowed: 200 kg N/ha, 160 kg P/ha, 140 kg K/ha.


## 7. Manure Nutrient Content

### P and K in manure (kg pure nutrient per m3)

| Animal type | P   | K   |
|-------------|-----|-----|
| Cattle      | 2.0 | 5.5 |
| Swine       | 3.3 | 3.3 |
| Poultry     | 6.3 | 5.1 |

Conversion for cattle: 1 LSU (500 kg) produces 18 m3 manure/year.
Per day and kg live weight: multiply by 18 / (500 * 365).

### Additional NPK per kg of milk produced (from RAUMIS)

| Nutrient | kg/kg milk |
|----------|------------|
| N        | 0.0084     |
| P        | 0.004      |
| K        | 0.0047     |

### N in Manure: Crude Protein Approach

N excretion is linked to crude protein (CP) intake via IPCC methodology:
    N_intake = CP_intake / 6.25
    N_manure = N_intake * (1 - N_retention)

Nitrogen retention rates by animal type (IPCC 2000, Table 4.15):

| Activity | CP intake (kg/day) | N in manure (kg/head/yr) | N retention |
|----------|--------------------|--------------------------|-------------|
| DCOH     | 4.3                | 210.1                    | 0.20        |
| DCOL     | 2.7                | 129.4                    | 0.20        |
| BULH     | 1.7                | 83.8                     | 0.07        |
| BULL     | 1.4                | 31.7                     | 0.07        |
| HEIR     | 1.7                | 95.9                     | 0.07        |
| HEIH     | 1.5                | 64.4                     | 0.07        |
| HEIL     | 1.2                | 20.6                     | 0.07        |
| SCOW     | 1.5                | 87.2                     | 0.07        |
| CAMR     | 0.9                | 38.6                     | 0.07        |
| CAFR     | 0.9                | 38.4                     | 0.07        |
| CAMF     | 0.8                | 20.2                     | 0.07        |
| CAFF     | 0.8                | 21.5                     | 0.07        |
| SOWS     | 0.9                | 36.4                     | 0.30        |
| PIGF     | 0.4                | 7.0                      | 0.30        |
| HENS*    | 21.2               | 900.9                    | 0.30        |
| POUF*    | 7.6                | 52.9                     | 0.30        |
| SHGM     | 0.2                | 13.7                     | 0.10        |
| SHGF     | 0.1                | 2.0                      | 0.10        |

*HENS and POUF are per 1000 units.

Values are EU-15 averages (year 2001). The advantage of coupling N excretion to
feed intake is that the gross nutrient surplus becomes independent of fodder yield
assumptions.


## 8. Ammonia Loss Coefficients

### NH3 sinks by stage and animal type

| Stage          | Cattle | Pigs | Poultry | Sheep/goat |
|----------------|--------|------|---------|------------|
| Grazing        | 8%     | --   | --      | 8%         |
| Housing        | 12%    | 17%  | 20%     | 10%        |
| Storage        | 4-20%  | 4-20%| 4-20%  | --         |
| Application    | 8-40%  | 8-40%| 8-40%  | --         |

Member state grazing shares (dairy cows): Ireland 59% grazing, Switzerland 7% grazing.
Liquid/solid housing: Netherlands 100% liquid, Finland 55% solid.

### Abatement technologies
- Low-emission application: 20-40% reduction from baseline losses.
- High-emission application: 80% reduction.
- Covered storage: significant reduction from 4-20% baseline.
- Stable design measures: variable by animal type.


## 9. Carbon Cycle Flows

The carbon balance tracks flows from feed to soil:

1. **Feed C intake**: from amino acid/fatty acid/carbohydrate composition of feedstuffs
   (Sauvant et al. 2004, NRC 2001). Carbohydrate C content = 44%.
2. **C retention**: in animal products (meat, milk, eggs), using live weight to carcass
   ratios.
3. **CH4 enteric**: see Section 2.
4. **CO2 respiration**: from net energy intake minus retention minus CH4, using
   conversion factors: 0.071 (fat), 0.082 (protein), 0.094 (carbohydrate) kg CO2/MJ.
5. **C excretion**: Feed C - retention - respiration CO2 - enteric CH4.
6. **Manure management C losses**: CH4 from storage + CO2 (ratio: CH4 63%, CO2 37%
   of total C loss, per FarmAC model).
7. **Runoff from housing/storage**: share equivalent to N runoff (MITERRA).
8. **C applied to soils**: excretion - management losses - runoff + net manure imports +
   straw used as bedding.
9. **Crop residue C**: IPCC 2006 factors for above/below ground residues, 40% C content.
10. **Crop product C**: from composition data (see feed intake methodology).
11. **Histosol CO2**: from UNFCCC notifications, per ha coefficient.
12. **Liming CO2**: from UNFCCC data, converted to C input.
13. **Rice CH4**: Tier 1, IPCC 2006.
14. **C sequestration**: CENTURY model simulations (Lugato et al. 2014), difference in
    manure + residue input vs. base year, spread over 20 years.
15. **Erosion C loss**: RUSLE equation * soil C content (3% humus arable, 6% grassland,
    2/3 C share in humus).
16. **Soil/root respiration**: residual = all C inputs - CH4 rice - histosol CO2 -
    runoff - erosion - sequestration.


## 10. Soil Erosion (RUSLE)

    A = R * K * L * S * C * P

Where:
- A = soil loss (ton/ha/year)
- R = rainfall-runoff erosivity factor
- K = soil erodibility factor
- L = slope length factor
- S = slope steepness factor
- C = cover management factor (crop-specific, endogenous via crop shares)
- P = support practice factor

Reference: Panagos et al. 2015.


## 11. Energy Module Equations and Parameters

### System boundary
Life cycle analysis from input production through farm gate, following KEA (VDI 4600)
and ISO 14040/14044. Based on ecoinvent/SALCA061 inventories.

### Direct energy factors

| Source      | CED Factor | Unit   |
|-------------|------------|--------|
| Diesel      | 45.7       | MJ/l   |
| Electricity | 11.7       | MJ/kWh |
| Heating gas | 47.9       | MJ/m3  |
| Heating oil | 49.7       | MJ/l   |

Diesel: activity-based from KTBL database (Germany), adjusted for soil type (light/
medium/heavy via European Soil Map), parcel size (EU-FSS parameter C-04), irrigation,
and scaled to national consumption statistics.

Electricity: normative by animal type, three climate zones (North/Middle/South),
herd-size dependent. Milk cooling linked to CAPRI milk yield. Grain drying linked to
estimated harvest moisture content (regression on German harvest statistics + EU
climate data from CRU TS 2.1).

### Indirect energy factors

| Source                 | CED Factor | Unit               |
|------------------------|------------|--------------------|
| Tractor                | 52.34      | MJ/kg machine wt.  |
| Harvester              | 49.27      | MJ/kg machine wt.  |
| Trailed machinery      | 36.44      | MJ/kg machine wt.  |
| N fertilizer           | 58.99      | MJ/kg nutrient     |
| P fertilizer           | 40.06      | MJ/kg nutrient     |
| K fertilizer           | 9.25       | MJ/kg nutrient     |
| Herbicides             | 218.62     | MJ/kg active subst.|
| Insecticides           | 299.02     | MJ/kg active subst.|
| Fungicides             | 124.38     | MJ/kg active subst.|
| Lubricants             | 79.17      | MJ/kg              |
| Minerals (feed suppl.) | 13.52      | MJ/kg              |
| Salt (feed suppl.)     | 6.62       | MJ/kg              |

Machinery: stock from EU-FSS (K-01 to K-03), weight-based depreciation over 20-year
useful life. Activity allocation via KTBL machinery hours per ha.

Buildings: normative from AGROSCOPE ART LCA study, MJ/m2/year, differentiated by
animal type, manure system (UNFCCC Table 4), herd size, and climate zone. 50-year
useful life.

### Energy output assessment
Caloric approach (FAO methodology) for energy content of agricultural products.
Allocation for multi-output activities (e.g., DCOW: COMI 88%, BEEF 8%, YCAM 2%,
YCAF 2%).

### Result tables
- Energy consumption overview: Total MJ per ha or head
- Detailed: diesel, electricity, machinery, fertilizer, feed, seed, plant protection
- Product-referenced: MJ/kg product, domestic energy efficiency (MJ/MJ)
- Sectoral: MJ/EUR income, total energy balance

### Key files
- `gams/reports/enerind_bas.gms`: base data preparation
- `gams/reports/enerind_calc.gms`: scenario calculation
- Energy module is post-model analysis: must be run each time scenario results change


## 12. Key GAMS File Locations

| Topic                        | File / Directory                              |
|------------------------------|-----------------------------------------------|
| GHG inventories (CAPREG)     | `gams/capreg/` (second step of CAPREG)        |
| GHG inventory comparison     | `capri/doc/GHG_inventory_module.docx`         |
| NPK balance calibration      | `gams/capreg/` (HPD estimator)                |
| Ammonia module               | Embedded GAMS code, MITERRA-Europe factors    |
| Fertilizer allocation        | `gams/input/dist_inputs.gms`                  |
| Feed allocation              | `gams/feed/fedtrm_prior.gms`                  |
| Feed declarations            | `gams/feed/feed_decl.gms`                     |
| Carbon balance               | Part of environmental indicators in CAPREG    |
| Soil erosion (RUSLE)         | Part of environmental indicators              |
| Energy base data             | `gams/reports/enerind_bas.gms`                |
| Energy scenario calc         | `gams/reports/enerind_calc.gms`               |
| Dual analysis / marginal     | `supply/margcr.gms`                           |
| Welfare analysis             | `gams/reports/welfare.gms`                    |
| CAPDIS disaggregation        | `gams/capdis/capdis.gms`                      |
| CAPDIS crop spatial model    | `gams/capdis/m_hpdCropSpat.gms`               |
| CAPDIS FSU data              | `dat/capdishsu/`                              |
| Regional data source         | `capri/dat/capreg/regio_data_all.gdx`         |
| Mitigation technologies      | Implemented in supply model (ECAMPA projects) |
| Sugar price estimation       | `sugar/price_est.gms`, `quotasprices.gms`     |


## 13. CAPDIS Nitrogen Disaggregation Detail

The CAPDIS module disaggregates CAPRI NUTS2 results to approximately 1x1 km Farm
Structure Units (FSUs). For nitrogen:

1. **Crop area distribution**: HPD method distributes crop areas to FSUs subject to:
   - Vertical consistency: FSU areas sum to NUTS2 totals
   - Area exhaustion: each FSU is fully allocated
   - Stability: penalty for deviating from prior distribution
   - New crop penalty: high penalty for crops appearing where not previously observed

2. **Nitrogen input allocation**: once crop areas are spatially distributed, N inputs
   (mineral fertilizer, manure, atmospheric deposition, biological fixation) are
   allocated proportionally to crop areas and livestock presence per FSU.

3. **Leaching estimation**: MITERRA-based leaching fractions applied per FSU using:
   - Soil type (from European Soil Map)
   - Land use (grassland vs. cropland)
   - Precipitation surplus
   - Average temperature
   - Soil organic carbon content

4. **Spatial data inputs**:
   - FSU delineation: intersection of 10km grid, NUTS3, soil mapping units, Corine
   - `dat/capdishsu/s_fsu_srnuts2.gdx`: FSU-to-NUTS2 mapping
   - `dat/capdishsu/p_fsu_area.gdx`: FSU areas
   - `dat/capdishsu/pesetagrid_fractionfsu.gdx`: climate data fractions
   - `dat/capdishsu/irriShare2000fsu.gdx`: irrigation shares

Modes: LAPM (a priori), CAPREG (base year), TIMESERIES, CAPMOD (scenarios).
Results collected via task "Collect disaggregation results" into country-level GDX files.
