# Sample Data (all fictional)

**Source:** the synthetic report "Testelle M · Vyta Optimize" (labelled *FICTIONAL PATIENT · SYNTHETIC TEST DATA*). Its full text is in `docs/source-testelle-optimize-vha.txt`.
- **Baseline** values = the report's *Baseline* column. They drive Phases 1–3.
- **Quarterly** values = the report's *Current* column. They drive the 3-month review.
- Demo dates are shifted: **Your Vyta Day = Wed 28 Oct 2026**, and the quarterly review is on 27 Jan 2027.

**Never use:** real patient data; any name from Vyta's real roster or from call transcripts; the "existing baseline" zip (it's a real patient). Staff names below are invented.

## 1. Staff

| id | Name | Role | Title |
|---|---|---|---|
| s-guide | Maya Ellis | guide | Vyta Guide |
| s-ma | Jordan Park | ma | Medical Assistant |
| s-np | Dana Reyes | np | Nurse Practitioner |
| s-coach | Sienna Clarke | coach | Wellness Coach |
| s-admin | Quinn Harper | admin | Clinic owner · Super admin |

## 2. Lead member: Testelle M

| Field | Value |
|---|---|
| id | m-testelle |
| DOB | 1 Jan 1980 (46) |
| Status | Peri (baseline FSH 13.4) |
| Program | Discover |
| Height / weight | 5 ft 6 in / 171 lb (baseline; BMI 27.6) |
| Work | Desk job, ~6 h sitting a day |
| Diagnosed | Osteopenia |
| Other | Mild intermittent left-knee discomfort with high-impact activity; frequent bloating |

**Goals (her words):** "Energy for my family, travel and hobbies." "Steadier mood." "Feel strong again, especially upper body." "Recover better after workouts." "Less bloating."

**Milestones (set at onboarding):**

| Milestone | Baseline | Target | 3-month |
|---|---|---|---|
| Steady energy for family and travel | 1 | 7 | 8 |
| Steady mood | 7 | 8 | 7 |
| Upper-body strength (grip, carry) | 4 | 7 | 7 |
| Recovery after exercise | 5 | 7 | 7 |
| Digestive comfort | 5 | 7 | 6 |
| Feeling connected | 2 | 7 | 7 |

## 3. Intake answers (fictional, matching the report)

Questions come from `Intake - latest (Oct 26)`; use those exact question IDs (VYTA_Q02–Q89) and wording. Answers for Testelle:

| Section | Key answers |
|---|---|
| 1. Goals & background | Brings her: low energy/fatigue, mood changes, weight/body composition, sleep issues/night sweats, low libido. Duration 1–3 years. Disruption "Often disruptive". Diagnoses: Osteopenia. Family history of breast/ovarian cancer: No. Implants: No. Allergies: None reported. Autoimmune: No. |
| 2. Hormones & meds | Cycle irregular. On HRT: No (starts with Vyta). Birth control: No. Supplements: Vitamin D3, magnesium, B12, fish oil. Peptides: No. |
| 3. Sleep, habits, nutrition | Sleep quality Good, 7–8 h. Wind-down 1–2 nights/week, other sleep habits 5+. Substances: none. Nutrition Good; fiber 35 g on 1–2 days/week; hydration 5+; protein 3–4 days/week. Digestive: bloating (frequent). |
| 4. Movement & mental health | Movement Good. Strength 1–2 days/week, Zone 2 3–4, other movement 1–2. Sitting 6 h. Injury: left knee, mild. Mental health "Average". No diagnoses, not in therapy. Stress 3/5. |
| 5. Relationships & purpose | Married/long-term. Feels supported: Somewhat. Joy: family, travel, hiking, cooking. Wants more: energy, adventure, strength. Wants less: fatigue, brain fog. Statement: "I'm rebuilding myself." |
| 6. Core 0–10 | Energy 1 · Sleep 10 · Mood 7 · Stress resilience 4 · Focus 6 · Digestive 5 · Sexual wellness 5 · Body confidence 5 · Connection 2 · Motivation 1 |
| 7. Safety & readiness | Self-harm: No. Seizures/fainting/cardiac: No. Firearms: No. Urgent concerns: No. Readiness 9. Barrier: time. Support wanted: "Help me understand what my body needs at this stage." |

The scenario "Intake in progress" stops Testelle at section 3 (40%).

## 4. Baseline scores

VMRI **54** (Moderate burden) · Biological age **51** · Symptoms **58/100**.
After the quarter: VMRI 58 · Biological age 42 · Symptoms 73.

Top 3 focus areas (baseline, member-facing):
1. "Rebuild your energy: iron stores are low (ferritin 8)."
2. "Calm inflammation: hs-CRP is 9.5 and your immune ratio is high."
3. "Build strength and protect your bones: fat mass is high for your frame, and you have osteopenia."

## 5. Body tests (Your Vyta Day)

**InBody** (upload fills these): Weight 171.0 lb · Skeletal muscle mass 48.5 lb · Body fat % 41.8 · Body fat mass 71.5 lb · Visceral fat area 159.3 cm² · BMI 27.6 · ECW/TBW 0.389 · Total body water 73.0 lb (42.7%) · Phase angle 4.6° · BMR 1,345 kcal · Body cell mass 62.0 lb · SMI 6.3 kg/m² · Lean mass: legs 27.8 lb, trunk 41.4 lb, arms 9.08 lb · Grip 58.0 lb.
Targets from the report: SMM 42–50 lb · Body fat 21–30% · Visceral <100 cm² · BMI 18.5–24.9 · ECW/TBW 0.360–0.380 · Phase angle 5.0–7.0° · SMI ≥6.5.

**Functional** (MA enters these; illustrative cutoffs, labelled):

| Test | Baseline | 3-month | Band rule (illustrative) |
|---|---|---|---|
| Farmer carry | 70 lb | 110 lb | ≥100 Elite · 70–99 Optimal · <70 Watch |
| Single-leg balance R | 30 s | >30 s | ≥30 Optimal · <20 Watch |
| Single-leg balance L | 30 s | >30 s | same |
| Gait speed (30 ft) | 6.9 s | 6.0 s | ≤6.0 Elite · 6.1–7.5 Optimal · >7.5 Watch |
| Grip strength | 58 lb | 66 lb | >60 Elite · ≥35.3 Optimal · <35.3 Watch |
| Sit-to-stand floor rise | One-hand assistance | No assistance | None = Optimal · One-hand = Watch · Two-hand/unable = Needs attention |
| Subjective strength | Fair | Good | not scored |
| Exercise consistency | Fair | Good | not scored |

**ShapeScale:** **skipped at baseline**, reason "Scanner offline – reschedule at 3-month" (the report shows no baseline scan). This is the demo's "Skip with reason, not counted as zero" moment. At 3 months: Shape score 86 · Health score 89 · Waist 28.3 in · Hips 39.7 in · Shoulders 40.0 in.

**VO2 max** (upload): VO2 max 32.0 mL/kg/min (target 25–35, Optimal) · Max HR 180 · Max power 100 W · VT2 HR 158 · VT2 power 85 W · VT1 HR 108 · Percentile 52%. Unchanged at 3 months.

## 6. Labs (baseline → 3-month)

Format: marker: baseline → current (target) · baseline band. Out-of-range baseline values become **Findings** (★).

**Hormones**
- FSH: 13.4 → 73.4 mIU/mL (peri 10–25) · Optimal
- LH: 14.3 → 35.7 · Optimal
- Estradiol: 90 → 8 pg/mL (peri/HRT 50–100) · Optimal
- Progesterone: 9.0 ng/mL (10–20) · Below target ★
- Free testosterone: 0.7 → 2.3 pg/mL (4.5–10.0) · Below target ★
- Total testosterone: 13 → 27 ng/dL (60–200) · Below target ★
- SHBG: 78 → 49 nmol/L (60–70) · Watch
- DHEA-S: 86 mcg/dL (200–600) · Below target ★
- TSH: 2.37 (0.5–2.5) · Optimal
- Free T3: 2.4 pg/mL (2.8–4.2) · Below target ★
- Free T4: 1.1 (0.8–1.8) · Optimal
- Prolactin: 6.6 · Optimal

**Metabolic**
- hs-CRP: 9.5 → 4.3 mg/L (<1.0) · Needs attention ★
- HbA1c: 5.1 → 5.5% (5.0–5.3) · Optimal
- Fasting glucose: 80 → 93 (70–85) · Optimal
- Fasting insulin: 5.6 → 6.8 (2–5) · Watch
- HOMA-IR: 1.11 → 1.56 (<1.5) · Optimal
- Total cholesterol: 205 → 192 (<200) · Watch
- HDL: 52 → 58 (≥50) · Optimal
- LDL: 130 → 115 (<100) · Watch ★
- Triglycerides: 115 → 95 (<100) · Watch

**CBC**
- Hemoglobin: 12.7 → 13.8 · Optimal
- RDW: 13.7 → 14.4 (<13.5) · Watch
- Neutrophils: 74.5 → 53.0% (40–60) · Needs attention ★
- Lymphocytes (abs): 671 → 1,770 (1,000–4,800) · Below target ★
- NLR: 5.44 → 1.53 (<3.0) · Needs attention ★

**Nutrients**
- Ferritin: 8 → 11 ng/mL (12–150) · Needs attention ★
- Iron total: 37 → 110 (60–170) · Below target ★
- Iron saturation: 10 → 28% (20–50) · Below target ★
- Vitamin D: 32 → 49 ng/mL (40–60) · Watch ★
- B12: 351 pg/mL (400–900) · Below target ★
- Homocysteine: 11.2 (<10) · Watch ★
- Magnesium: 2.0 · Optimal

**Liver and kidney** (all Optimal): ALT 7, AST 14, albumin 4.3, eGFR 109, creatinine 0.63, BUN 11.

## 7. Draft HEAL plan (baseline, what the NP pre-reviews)

Pre-filled from the "Standard perimenopause protocol" template. Dose options are **illustrative** and labelled so in the UI. Items marked † are incomplete in the source and must be completed by the NP. Items marked * are proposals that need clinician review.

| Group | Item | Change | Default | Options | Flag | Consent | Supplier |
|---|---|---|---|---|---|---|---|
| Rx | Estradiol | New | 0.05 mg patch, twice weekly | Form: patch / cream / gel / ring / troche | | | Retail pharmacy |
| Rx | Micronized progesterone | New | 100 mg oral, nightly | 100 / 200 mg | | | Retail pharmacy |
| Rx | Testosterone | New | Troche 0.5 mg, twice weekly | Form: troche / cream / injection; dose: Other… | † strength per troche missing | Testosterone use consent | Compounding pharmacy |
| Supplement | Iron | New | 1 tablet daily | Elemental iron: 18 / 25 / 65 mg / Other… | † elemental amount missing | | Fullscript |
| Supplement | Vitamin D3 | Continued | 2,000 IU daily | 1,000 / 2,000 / 4,000 / 5,000 IU | | | Fullscript |
| Supplement | Magnesium L-threonate | Continued | 2 caps nightly | | | | Fullscript |
| Supplement | B12 drops | Continued | 1,000 mcg daily | | | | Fullscript |
| Supplement | Omega-3 fish oil | Continued | 2 g daily | | | | Fullscript |
| Peptide | Tirzepatide | New | Dose not supplied | Other… | † dose and route missing | Peptides (not FDA-approved) consent | Peptide supplier |
| Nutrition | Fiber 35 g/day | Build | 3–4 target days/week | | * proposed | | |
| Nutrition | Protein first at each meal | New | Every main meal | | | | |
| Exercise | Strength training | Build | 2 → 3 sessions/week, upper body + loaded carries | | * proposed | | |
| Exercise | Zone 2 cardio | Continue | 3–4 days/week; cycling if knee flares | | | | |
| Sleep | 60-min wind-down | Build | 3 → 5 nights/week | | * proposed | | |

Demo moment at the results conversation: Testelle **declines tirzepatide** ("not ready") and **accepts testosterone**. The testosterone consent is pushed to her phone and she signs it. That leaves 1 consent signed, 1 item declined, and 7 orders created.

## 8. Onboarding consents (from `Vyta Forms`, with Malla references removed)

1. **Consent to be recorded** (telehealth transcription). Body: "Recording purpose… confidentiality and security… voluntary… acknowledgement." Signature: typed full name.
2. **Informed consent for telehealth.** Body: risks (connection may drop, picture unclear) and benefits (no travel, specialist access); confidentiality. Signature: typed full name.
3. **Treatment consent.** Body: right to be informed; consent continues after diagnosis; right to discuss the plan. Signature: typed full name.

Treatment consents (pushed from the plan): **Testosterone use** and **Peptides (not FDA-approved)**. Body text: "[CLINIC TO PROVIDE]", with a one-paragraph placeholder summary.

Replace "Malla" with "Vyta" in every body text and remove the platform references.

## 9. Roster (fill the queues)

| Member | Program / phase | State for queues |
|---|---|---|
| Maren Holt | Discover / intake & labs | Intake 40% · 3 days (Guide nudge) |
| Priya Nandakumar | Discover / intake & labs | Blood draw overdue, snoozed "on antibiotics, retry 3 Nov" |
| Celeste Arroyo | Discover / Your Vyta Day | Visit today 11:00 |
| Ingrid Halvorsen | Heal / first 30 days | Unsigned treatment consent |
| Joanne Whitaker | Heal / ongoing | Drifting: missed 2 check-ins, energy trending down |
| Renata Kowalski | Optimize / ongoing | Quarterly review due |
| Corinne Dubois | Heal / first 30 days | Released last week; NP early check due |
| Hana Sato | Thrive / ongoing | Unread message 26 h (SLA breached) → SAGE holding reply shown |

## 10. SAGE script

| Member asks | SAGE replies | Effect |
|---|---|---|
| "What is my VMRI?" | "Your VMRI is 54 out of 100, in the Moderate burden band. It sums up how menopause is affecting your resilience across sleep, mood, energy and body. Higher is better." *From your report › Your VMRI* | None |
| "Why is my ferritin low?" | "Ferritin shows your iron stores. Yours is 8, below the 12–150 range, which can go with low energy. Your NP added iron to your plan; ask her about anything that changes how you take it." *From your report › Bloodwork › Nutrients* | None |
| "Can I take my iron with coffee?" | "That's a question for your care team, since it's about how to take your medication. I've passed it to Maya, your Guide. You'll hear back by 2:00 pm today." | Review flag (Guide) |
| "I've had chest tightness since I started the new dose. Should I stop it?" | "I'm an AI and can't advise on this. **If you have chest pain or trouble breathing now, call 911.** I've alerted your care team and they'll contact you shortly." | **Urgent** safety flag → Guide + NP, pinned |
| (Hana, no human reply for 24 h) | "I've let your Guide know you're waiting. Someone will reply today." Then, 6 h later: "Quick update: Maya has your message and will call this afternoon." | Holding reply; staff see SLA breached |

## 11. Insight templates

Member:
- "Your energy check-ins are up three weeks in a row."
- "You kept to your plan 4 of the last 4 weeks."

Staff:
- "Missed 2 weekly check-ins."
- "Energy trending down for 3 weeks."
- "No app activity in 10 days."
