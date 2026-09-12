-- Seed data for hazard_library and climate_rules.
--
-- IMPORTANT: this is a starting-point dataset compiled from general public
-- knowledge of QCS 2014 and Qatar Labour Law (Decree No. 14 of 2004)
-- health & safety practice. It is NOT a certified legal source. A licensed
-- Qatar HSE professional must review and expand this library before any
-- production or regulatory-facing use. See SPEC.md section 6.

insert into climate_rules
  (rule_key, description, effective_start_month, effective_end_month, effective_start_time, effective_end_time, legal_reference, applies_to)
values
  ('midday_work_ban',
   'Outdoor work prohibited 10:00-15:30, June 1 - September 15',
   6, 9, '10:00', '15:30',
   'Ministerial Decision No. 16 of 2007 (as amended), on outdoor work hour restrictions during summer',
   'outdoor_work'),
  ('heat_stress_general',
   'Mandatory heat-stress mitigation (hydration, shaded rest, buddy system, acclimatization)',
   null, null, null, null,
   'Qatar Labour Law, Decree No. 14 of 2004',
   'all_construction'),
  ('dust_storm',
   'Respiratory PPE and visibility-dependent suspension of crane/lifting operations',
   null, null, null, null,
   'QCS 2014, Health & Safety sections',
   'all_construction'),
  ('high_wind',
   'Suspension of crane lifting and work-at-height above specified wind thresholds',
   null, null, null, null,
   'QCS 2014, Health & Safety sections',
   'all_construction');

insert into hazard_library
  (project_type, activity, hazard_description, default_likelihood, default_severity, standard_control_measures, regulatory_reference, climate_trigger)
values
  -- Scaffolding erection (high-rise)
  ('high-rise', 'scaffolding erection', 'Fall from height during scaffold erection/dismantling', 3, 5,
   'Use of full-body harness with double lanyard, guardrails installed progressively as scaffold rises, scaffold erected only by TUV/competent-authority certified scaffolders, daily pre-use inspection tags', 'QCS 2014 Section 5 Part 3 - Scaffolding', null),
  ('high-rise', 'scaffolding erection', 'Scaffold collapse due to inadequate base support or overloading', 2, 5,
   'Base plates/sole boards on stable ground, load calculations verified by engineer, maximum load signage, regular structural inspection', 'QCS 2014 Section 5 Part 3 - Scaffolding', null),
  ('high-rise', 'scaffolding erection', 'Falling tools/materials striking workers below', 3, 4,
   'Toe boards and debris netting installed, exclusion zone barricaded below work area, tool lanyards for hand tools', 'QCS 2014 Section 5 Part 3 - Scaffolding', null),
  ('high-rise', 'scaffolding erection', 'Scaffold instability in high wind', 3, 4,
   'Wind speed monitoring, scaffold tied to structure at required intervals, work suspended above manufacturer wind threshold', 'QCS 2014, Health & Safety sections', 'high_wind'),

  -- Working at heights (high-rise, demolition)
  ('high-rise', 'working at heights', 'Fall from unprotected edge or opening', 3, 5,
   'Guardrails/edge protection installed before work starts, floor openings covered and signed, harness with lanyard anchored to rated anchor point', 'QCS 2014 Section 5 Part 3', null),
  ('high-rise', 'working at heights', 'Heat exhaustion/heat stroke during elevated summer work', 3, 4,
   'Mandatory hydration breaks every 30 minutes, shaded rest platform access, work rescheduled outside banned hours', 'Qatar Labour Law, Decree No. 14 of 2004', 'extreme_heat'),
  ('demolition', 'working at heights', 'Fall through weakened/unstable structural elements', 3, 5,
   'Structural survey before access, no-go zones marked over compromised areas, harness and anchor point independent of structure being demolished', 'QCS 2014 Section 5 Part 3', null),

  -- Crane lifting
  ('high-rise', 'crane lifting', 'Load drop due to rigging failure or overload', 2, 5,
   'Lifting plan approved by competent person, rigging inspected before each lift, load charts followed strictly, exclusion zone under load', 'QCS 2014 Section 5 Part 3 - Lifting Operations', null),
  ('high-rise', 'crane lifting', 'Crane instability/tip-over in high wind', 2, 5,
   'Wind speed monitored continuously, lifting suspended above crane manufacturer wind limit, outriggers fully extended and on stable ground', 'QCS 2014, Health & Safety sections', 'high_wind'),
  ('infrastructure', 'crane lifting', 'Contact with overhead power lines during lift', 2, 5,
   'Utility survey before lift, minimum approach distances maintained, spotter assigned, permit-to-work for lifts near power lines', 'QCS 2014 Section 5 Part 3 - Lifting Operations', null),

  -- Welding / hot work
  ('mep', 'welding / hot work', 'Fire/explosion from hot work near flammable materials', 3, 5,
   'Hot work permit system, fire watch posted with extinguisher, flammable materials cleared 10m radius, fire blankets used', 'QCS 2014 Section 5 Part 3 - Hot Work', null),
  ('mep', 'welding / hot work', 'Exposure to welding fumes causing respiratory harm', 3, 3,
   'Local exhaust ventilation, respiratory PPE (welding fume respirator), work rotation to limit exposure duration', 'Qatar Labour Law, Decree No. 14 of 2004', null),
  ('mep', 'welding / hot work', 'Arc eye / skin burns from UV radiation', 3, 3,
   'Welding curtains/screens to protect nearby workers, full welding PPE (helmet, gloves, apron), trained/certified welders only', 'QCS 2014 Section 5 Part 3 - Hot Work', null),
  ('infrastructure', 'welding / hot work', 'Fire/explosion from hot work near flammable materials', 3, 5,
   'Hot work permit system, fire watch posted with extinguisher, flammable materials cleared 10m radius', 'QCS 2014 Section 5 Part 3 - Hot Work', null),

  -- Excavation / trenching
  ('excavation', 'excavation / trenching', 'Trench collapse burying workers', 3, 5,
   'Shoring/shielding or battering to safe angle per soil classification, daily inspection by competent person, no entry without protection system', 'QCS 2014 Section 5 Part 3 - Excavation', null),
  ('excavation', 'excavation / trenching', 'Striking buried utilities (gas, electrical, water)', 2, 5,
   'Utility survey and cable/pipe locating before digging, permit-to-dig system, hand-digging near known services', 'QCS 2014 Section 5 Part 3 - Excavation', null),
  ('excavation', 'excavation / trenching', 'Worker or plant falling into open excavation', 3, 4,
   'Barricading and signage around excavation, edge protection, safe access/egress (ladders) at required intervals', 'QCS 2014 Section 5 Part 3 - Excavation', null),
  ('excavation', 'excavation / trenching', 'Vehicle/plant collapsing excavation edge (surcharge)', 2, 4,
   'Exclusion zone for plant/vehicles from excavation edge, spoil stored at safe distance, edge load calculations checked', 'QCS 2014 Section 5 Part 3 - Excavation', null),

  -- Confined space entry
  ('excavation', 'confined space entry', 'Asphyxiation from oxygen-deficient atmosphere', 2, 5,
   'Atmosphere testing before and during entry, continuous ventilation, permit-to-work with standby rescue person', 'QCS 2014 Section 5 Part 3 - Confined Spaces', null),
  ('mep', 'confined space entry', 'Toxic gas exposure in confined space', 2, 5,
   'Gas detection equipment used continuously, forced ventilation, emergency retrieval equipment on standby', 'QCS 2014 Section 5 Part 3 - Confined Spaces', null),

  -- Shoring installation
  ('excavation', 'shoring installation', 'Shoring failure due to incorrect installation', 2, 5,
   'Shoring designed/checked by competent engineer, installed per manufacturer specification, inspected daily', 'QCS 2014 Section 5 Part 3 - Excavation', null),

  -- Concrete pouring
  ('high-rise', 'concrete pouring', 'Formwork collapse during pour', 2, 5,
   'Formwork design checked by engineer, pour sequence controlled to avoid overloading, inspection before and during pour', 'QCS 2014 Section 5 Part 3', null),
  ('high-rise', 'concrete pouring', 'Skin burns/dermatitis from wet concrete contact', 3, 2,
   'PPE including gloves, boots, and eye protection; immediate wash stations available; training on concrete handling hazards', 'Qatar Labour Law, Decree No. 14 of 2004', null),
  ('high-rise', 'concrete pouring', 'Heat stress during outdoor summer concrete pours', 3, 4,
   'Pours scheduled outside banned hours where possible, hydration and shade for crew, rotation of workers', 'Qatar Labour Law, Decree No. 14 of 2004', 'extreme_heat'),

  -- Formwork installation
  ('high-rise', 'formwork installation', 'Fall from height while erecting formwork', 3, 5,
   'Working platforms with guardrails, harness use above 2m, formwork erected per engineered sequence', 'QCS 2014 Section 5 Part 3', null),

  -- Pipe laying
  ('infrastructure', 'pipe laying', 'Trench collapse during pipe laying', 3, 5,
   'Shoring/shielding per soil classification, competent person inspection, safe access/egress maintained', 'QCS 2014 Section 5 Part 3 - Excavation', null),
  ('infrastructure', 'pipe laying', 'Manual handling injury from heavy pipe sections', 3, 3,
   'Mechanical lifting aids used for heavy sections, team lifting procedures, manual handling training', 'Qatar Labour Law, Decree No. 14 of 2004', null),

  -- Road works
  ('road-works', 'road works', 'Vehicle strike on workers in live traffic area', 3, 5,
   'Traffic management plan with certified traffic marshals, physical barriers/cones per QCS layout, high-visibility PPE mandatory', 'QCS 2014, Traffic Management sections', null),
  ('road-works', 'road works', 'Burns from hot asphalt/bitumen', 3, 3,
   'Heat-resistant PPE (gloves, boots), safe handling procedures, first aid readily available', 'Qatar Labour Law, Decree No. 14 of 2004', null),
  ('road-works', 'asphalt paving', 'Exposure to bitumen fumes', 3, 3,
   'Ventilation/wind-direction awareness, respiratory PPE where fume levels are high, work rotation', 'Qatar Labour Law, Decree No. 14 of 2004', null),
  ('road-works', 'traffic management', 'Vehicle strike on workers in live traffic area', 3, 5,
   'Traffic management plan with certified traffic marshals, physical barriers/cones, high-visibility PPE mandatory', 'QCS 2014, Traffic Management sections', null),

  -- Electrical works
  ('mep', 'electrical works', 'Electric shock/electrocution from live circuits', 2, 5,
   'Lockout-tagout procedures, work only by licensed electricians, insulated tools and PPE, isolation verified before work', 'Qatar Labour Law, Decree No. 14 of 2004', null),
  ('mep', 'electrical works', 'Arc flash injury during panel work', 2, 5,
   'Arc-rated PPE, de-energization before work where possible, approach boundaries maintained', 'QCS 2014, Health & Safety sections', null),

  -- Demolition
  ('demolition', 'demolition', 'Uncontrolled structural collapse', 2, 5,
   'Engineered demolition sequence, structural survey beforehand, exclusion zones enforced, competent supervision throughout', 'QCS 2014 Section 5 Part 3', null),
  ('demolition', 'dust control', 'Silica dust exposure during demolition', 3, 3,
   'Water suppression/dust misting, respiratory PPE (P2/N95 minimum), air monitoring where required', 'Qatar Labour Law, Decree No. 14 of 2004', 'dust_storm'),

  -- General / cross-cutting (project_type = 'other', activity-agnostic style entries)
  ('other', 'general site work', 'Heat exhaustion/heat stroke among outdoor workers', 3, 4,
   'Hydration schedule, shaded rest areas, buddy system for early symptom recognition, acclimatization program for new workers, adherence to summer working-hours restrictions', 'Qatar Labour Law, Decree No. 14 of 2004', 'extreme_heat'),
  ('other', 'general site work', 'Reduced visibility and respiratory hazard during dust storms', 2, 3,
   'Work suspension criteria for severe dust storms, respiratory PPE issued, vehicle movement restricted', 'QCS 2014, Health & Safety sections', 'dust_storm'),
  ('other', 'general site work', 'Manual handling injuries (strains/sprains)', 3, 2,
   'Mechanical aids provided where possible, manual handling training, team lifting for heavy/awkward loads', 'Qatar Labour Law, Decree No. 14 of 2004', null),
  ('other', 'general site work', 'Slips, trips and falls on cluttered walkways', 3, 2,
   'Housekeeping schedule, designated walkways kept clear, adequate site lighting', 'QCS 2014, Health & Safety sections', null);
