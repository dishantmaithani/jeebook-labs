// ChemLab — guided experiments. Beaker 0 = the selected beaker, 1 = the next one.
// Steps: ['empty',b] ['pour',b,id,mL] ['solid',b,id] ['drops',b,id] ['wait',s]
//        ['heat',b,on] ['ice',b,on] ['until',b,fn,timeout] ['tube',b,target|null] ['test',b,tool] ['say',text]
export const EXPERIMENTS = [
  {
    id: 'golden', title: 'Golden rain', tag: 'Precipitation · solubility',
    blurb: 'Yellow PbI₂ dissolves in hot water and comes back as glittering golden crystals when cooled.',
    steps: [['empty', 0], ['pour', 0, 'PbNO3', 2], ['pour', 0, 'KI', 2], ['wait', 1.5], ['pour', 0, 'H2O', 110], ['heat', 0, true],
      ['say', 'Heating to dissolve the yellow lead iodide…'], ['until', 0, v => v.T >= 97, 90], ['wait', 4], ['heat', 0, false],
      ['ice', 0, true], ['say', 'Now cooling in an ice bath. Watch the golden plates crystallise!'], ['until', 0, v => v.T < 20, 90]],
  },
  {
    id: 'silvertree', title: 'Silver tree', tag: 'Displacement · electrochemistry',
    blurb: 'Copper displaces silver: shiny crystals grow and the solution slowly turns blue.',
    steps: [['empty', 0], ['pour', 0, 'AgNO3', 30], ['solid', 0, 'Cu'], ['say', 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag. Watch the crystals grow over the next minute.']],
  },
  {
    id: 'cuzn', title: 'Copper plates out on zinc', tag: 'Displacement · activity series',
    blurb: 'Zinc is more reactive than copper: brown copper coats the zinc and the blue colour fades.',
    steps: [['empty', 0], ['pour', 0, 'CuSO4', 20], ['pour', 0, 'H2O', 20], ['solid', 0, 'Zn'], ['solid', 0, 'Zn'], ['solid', 0, 'Zn']],
  },
  {
    id: 'ammine', title: 'Deep blue copper ammine', tag: 'Coordination compounds',
    blurb: 'A little NH₃ gives pale blue Cu(OH)₂. Excess NH₃ dissolves it to deep blue [Cu(NH₃)₄]²⁺.',
    steps: [['empty', 0], ['pour', 0, 'CuSO4', 5], ['pour', 0, 'H2O', 30], ['pour', 0, 'NH3', 2], ['wait', 3],
      ['say', 'Pale blue precipitate. Now add excess ammonia…'], ['pour', 0, 'NH3', 15]],
  },
  {
    id: 'bloodred', title: 'Blood-red test for Fe³⁺', tag: 'Qualitative analysis',
    blurb: 'Thiocyanate turns a pale Fe³⁺ solution an intense blood-red.',
    steps: [['empty', 0], ['pour', 0, 'H2O', 60], ['pour', 0, 'FeCl3', 1], ['wait', 1.5], ['pour', 0, 'KSCN', 1]],
  },
  {
    id: 'prussian', title: 'Prussian blue', tag: 'Qualitative analysis',
    blurb: 'Fe³⁺ + ferrocyanide gives the famous deep-blue pigment.',
    steps: [['empty', 0], ['pour', 0, 'H2O', 40], ['pour', 0, 'FeCl3', 5], ['wait', 1], ['pour', 0, 'K4FeCN6', 5]],
  },
  {
    id: 'limewater', title: 'Limewater test for CO₂', tag: 'Gas tests · two beakers',
    blurb: 'Marble + acid makes CO₂. It is piped into limewater, which turns milky, then clears with excess CO₂.',
    steps: [['empty', 0], ['empty', 1], ['pour', 1, 'CaOH2', 100], ['solid', 0, 'marble'], ['tube', 0, 1], ['pour', 0, 'HCl', 25],
      ['say', 'CO₂ bubbles through the limewater: first milky (CaCO₃), then clear again (Ca(HCO₃)₂).'], ['wait', 75]],
  },
  {
    id: 'titration', title: 'Neutralisation with phenolphthalein', tag: 'Acids & bases · titration',
    blurb: 'Pink NaOH is neutralised drop by drop. The colour vanishes exactly at the equivalence point.',
    steps: [['empty', 0], ['pour', 0, 'NaOH', 10], ['drops', 0, 'phth'], ['wait', 1], ['pour', 0, 'HCl', 5], ['wait', 1.5],
      ['pour', 0, 'HCl', 4], ['wait', 1.5], ['say', '9 mL added and it is still pink. One more mL…'], ['pour', 0, 'HCl', 1],
      ['say', 'Colourless! 10 mL of 2 M HCl neutralised 10 mL of 2 M NaOH (M₁V₁ = M₂V₂). Note the temperature rise.']],
  },
  {
    id: 'universal', title: 'Rainbow of pH', tag: 'Acids & bases · indicators',
    blurb: 'Universal indicator in acid, then add alkali step by step to sweep through the colours.',
    steps: [['empty', 0], ['pour', 0, 'H2O', 80], ['drops', 0, 'UI'], ['pour', 0, 'HCl', 2], ['wait', 1.5],
      ['pour', 0, 'NaOH', 1.5], ['wait', 1.5], ['pour', 0, 'NaOH', 0.45], ['wait', 1.5], ['pour', 0, 'NaOH', 0.05], ['wait', 1.5], ['pour', 0, 'NaOH', 1], ['wait', 1.5], ['pour', 0, 'NaOH', 4]],
  },
  {
    id: 'kmno4', title: 'KMnO₄ titration of Fe²⁺', tag: 'Redox · titration',
    blurb: 'Purple permanganate is decolourised by Fe²⁺ until the end point: the first permanent pink.',
    steps: [['empty', 0], ['pour', 0, 'FeSO4', 10], ['pour', 0, 'H2SO4', 10], ['pour', 0, 'KMnO4', 25], ['wait', 1.5],
      ['say', 'Still colourless: Fe²⁺ remains. Keep adding…'], ['pour', 0, 'KMnO4', 24], ['wait', 1.5], ['pour', 0, 'KMnO4', 2],
      ['say', 'Permanent pink = end point. 50 mL × 0.02 M × 5 = 10 mL × 0.5 M × 1 (equivalents match).']],
  },
  {
    id: 'dichromate', title: 'Dichromate: orange → green', tag: 'Redox',
    blurb: 'Acidified dichromate oxidises Fe²⁺ and is reduced to green Cr³⁺.',
    steps: [['empty', 0], ['pour', 0, 'K2Cr2O7', 5], ['pour', 0, 'H2SO4', 10], ['pour', 0, 'H2O', 20], ['wait', 1], ['pour', 0, 'FeSO4', 8]],
  },
  {
    id: 'starch', title: 'Iodine appears (starch test)', tag: 'Redox · kinetics',
    blurb: 'H₂O₂ slowly oxidises iodide in acid, and starch turns the iodine blue-black.',
    steps: [['empty', 0], ['pour', 0, 'H2O', 60], ['pour', 0, 'KI', 5], ['pour', 0, 'H2SO4', 5], ['drops', 0, 'starch'], ['pour', 0, 'H2O2', 3]],
  },
  {
    id: 'oxygen', title: 'Oxygen from H₂O₂ + MnO₂', tag: 'Catalysis · gas tests',
    blurb: 'A pinch of MnO₂ catalyses rapid decomposition. The glowing splint relights.',
    steps: [['empty', 0], ['pour', 0, 'H2O2', 30], ['solid', 0, 'MnO2'], ['wait', 2.5], ['test', 0, 'glowing']],
  },
  {
    id: 'sodium', title: 'Sodium in water', tag: 'Alkali metals',
    blurb: 'Sodium skates on the surface making H₂ and NaOH, and phenolphthalein turns pink.',
    steps: [['empty', 0], ['pour', 0, 'H2O', 100], ['drops', 0, 'phth'], ['solid', 0, 'Na'], ['wait', 3], ['test', 0, 'burning']],
  },
  {
    id: 'hydrogen', title: 'Hydrogen: the squeaky pop', tag: 'Metals + acids · gas tests',
    blurb: 'Magnesium ribbon fizzes in hydrochloric acid. A burning splint gives a squeaky pop.',
    steps: [['empty', 0], ['solid', 0, 'Mg'], ['pour', 0, 'HCl', 25], ['wait', 3], ['test', 0, 'burning']],
  },
  {
    id: 'nitric', title: 'Copper + conc. nitric acid', tag: 'Oxidising acids',
    blurb: 'Copper does not react with HCl, but conc. HNO₃ attacks it with brown NO₂ fumes.',
    steps: [['empty', 0], ['solid', 0, 'Cu'], ['pour', 0, 'HCl', 10], ['wait', 2.5], ['empty', 0], ['solid', 0, 'Cu'], ['pour', 0, 'HNO3', 12]],
  },
  {
    id: 'ammonium', title: 'Test for ammonium ions', tag: 'Qualitative analysis · gas tests',
    blurb: 'Warm NH₄Cl with NaOH. NH₃ is given off and turns damp red litmus blue.',
    steps: [['empty', 0], ['pour', 0, 'NH4Cl', 15], ['pour', 0, 'NaOH', 15], ['heat', 0, true], ['until', 0, v => v.T > 72, 60], ['test', 0, 'litmus'], ['wait', 2.5], ['test', 0, 'smell'], ['heat', 0, false]],
  },
  {
    id: 'chloride', title: 'Chloride test with AgNO₃', tag: 'Qualitative analysis',
    blurb: 'White AgCl dissolves in NH₃ and reappears with HNO₃: the confirmatory test for Cl⁻.',
    steps: [['empty', 0], ['pour', 0, 'NaCl', 3], ['pour', 0, 'H2O', 20], ['pour', 0, 'AgNO3', 10], ['wait', 3], ['pour', 0, 'NH3', 10], ['wait', 3], ['pour', 0, 'HNO3', 4]],
  },
  {
    id: 'amphoteric', title: 'Amphoteric Zn(OH)₂', tag: 'Qualitative analysis',
    blurb: 'NaOH first precipitates white Zn(OH)₂, then dissolves it as zincate.',
    steps: [['empty', 0], ['pour', 0, 'ZnSO4', 5], ['pour', 0, 'H2O', 20], ['pour', 0, 'NaOH', 2], ['wait', 3], ['pour', 0, 'NaOH', 10]],
  },
  {
    id: 'feoh', title: 'Fe²⁺ vs Fe³⁺ with NaOH', tag: 'Qualitative analysis · two beakers',
    blurb: 'Dirty-green Fe(OH)₂ slowly browns in air. Fe³⁺ gives rust-brown Fe(OH)₃ at once.',
    steps: [['empty', 0], ['empty', 1], ['pour', 0, 'FeSO4', 8], ['pour', 0, 'H2O', 30], ['pour', 1, 'FeCl3', 5], ['pour', 1, 'H2O', 30],
      ['pour', 0, 'NaOH', 8], ['pour', 1, 'NaOH', 8], ['say', 'Watch beaker on the left: green → brown as Fe²⁺ is oxidised by air.']],
  },
  {
    id: 'sulfide', title: 'Black sulfides & H₂S', tag: 'Qualitative analysis · two beakers',
    blurb: 'Na₂S + HCl makes H₂S, which is piped into CuSO₄ to give black CuS.',
    steps: [['empty', 0], ['empty', 1], ['pour', 1, 'CuSO4', 10], ['pour', 1, 'H2O', 40], ['pour', 0, 'Na2S', 10], ['tube', 0, 1], ['pour', 0, 'HCl', 8], ['wait', 4]],
  },
];
