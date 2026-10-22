# App Flow

The source of truth is the FigJam board: https://www.figma.com/board/FuyLYsGWMqLUlLyKeX1doS
The Mermaid below mirrors it so Claude Code can read it.

Shapes: `([ ])` entry/exit · `[/ /]` input · `[\ \]` output · `{ }` decision · `{{ }}` gate (a person approves) · `[( )]` data.

## 1. Join, intake and labs

```mermaid
flowchart LR
  consult(["Entry: consult request"]) --> discovery["Discovery call with Guide"] --> fit{"Good fit?"}
  fit -->|No| exitFit(["Exit: not a fit"])
  fit -->|Yes| payLink["Payment link sent"] --> paid{"Paid?"}
  paid -->|No| exitPay(["Exit: did not join"])
  paid -->|Yes| welcome["Account created, goals set"] --> consents[/"3 consent forms signed"/] --> sendIntake["Intake sent and blood draw booked"]
  sendIntake --> intakeIn[/"Intake answers"/] --> intakeDone{"Intake complete?"}
  intakeDone -->|No| nudge["Guide nudges"] -.-> intakeIn
  sendIntake --> drawIn[/"Blood draw"/] --> labsBack{"Results back?"}
  labsBack -->|No| chaseLab["MA chases lab"] -.-> labsBack
  intakeDone -->|Yes| concern{"Anything concerning?"}
  labsBack -->|Yes| concern
  concern -->|Yes| toSafety(["To safety flow"])
  concern -->|No| draft["Draft HEAL plan and VHA built"]
  protocols[("Standard protocol")] --> draft
  draft --> gatePre{{"Gate: NP pre-review"}}
  gatePre -->|Sent back| draft
  gatePre -->|Approved| gateCoach{{"Gate: Coach wording review"}}
  gateCoach -->|Clinical change| gatePre
  gateCoach -->|Approved| ready[\"Draft ready"\] --> toDay(["To Your Vyta Day"])
```

## 2. Your Vyta Day

```mermaid
flowchart LR
  arrive(["Entry: member arrives"]) --> inbody[/"InBody"/] --> funct[/"Functional tests"/] --> shape[/"ShapeScale"/] --> vo2[/"VO2 max"/]
  shape --> npSections["NP reviews finished sections"]
  vo2 --> concern{"Anything concerning?"}
  concern -->|Yes| toSafety(["To safety flow"])
  concern -->|No| complete{{"Gate: completeness check"}}
  complete -->|Missing| collect["Collect or skip with reason"] -.-> complete
  complete -->|All in| updated{"Draft updated in time?"}
  npSections --> updated
  vo2 --> wait["Member: coach session"]
  updated -->|Yes| final{{"Gate: NP final review"}}
  updated -->|No| manual["Fallback: NP finalises manually"] --> final
  final --> results["Results conversation"]
  wait --> results
  results --> choices[/"Her choices and consents"/] --> release{{"Gate: approve and release"}}
  release -->|Not ready| final
  release -->|Approved| out[\"Report and plan in her app"\] --> leave(["Exit: leaves with report"])
  release -->|Approved| orders["Order checklist"] --> placed{"All placed?"}
  placed -->|No| place["NP or MA places order"] -.-> placed
  leave --> nextDay["Guide call next day"] --> toOngoing(["To ongoing care"])
```

## 3. Ongoing care, quarterly and renewal

```mermaid
flowchart LR
  fromDay(["Entry: from Your Vyta Day"]) --> earlyNP["NP early check (timing TBC)"] --> weekly[/"Weekly check-in"/]
  weekly --> insights["Insights from approved templates"]
  insights --> memberIns[\"Member insights"\]
  insights --> staffIns[\"Staff insights"\] --> drift{"Concern or drift?"}
  drift -->|Drift| outreach["Guide nudges or calls"]
  drift -->|Concern| toSafety(["To safety flow"])
  sage[/"Member asks SAGE"/] --> inReport{"Answered from her report?"}
  inReport -->|Yes| answer[\"Plain-language answer"\]
  inReport -->|No or concern| toSafety
  weekly -.->|Every 3 months| followUp[/"Follow-up assessment"/] --> newLabs{"New labs needed?"}
  newLabs -->|Yes| draw[/"Blood draw"/] --> retest[/"MA retest"/]
  newLabs -->|No| retest
  retest --> delta["Delta report drafted"] --> gateQ{{"Gate: NP quarterly review"}}
  gateQ -->|Sent back| delta
  gateQ -->|Approved| deltaOut[\"Delta report released"\] --> coachCall["Quarterly coach call"]
  coachCall -.->|Month 12| gate12{{"Gate: 12-month review"}} --> renew{"Renew?"}
  renew -->|Yes| nextYear(["Exit: next program year"])
  renew -->|No| done(["Exit: program complete"])
```

## 4. Safety and setup gates

```mermaid
flowchart LR
  src[/"Intake, labs, check-ins, messages, SAGE"/] --> flagged["Concern flagged"] --> emergency{"Emergency?"}
  emergency -->|Yes| call911[\"Told to call 911"\] --> top["Top of Guide and NP lists"]
  emergency -->|No| told[\"Told when to expect a reply"\] --> top
  top --> clinical{"Clinical?"}
  clinical -->|Yes| np["NP calls, prescribes or orders labs"] --> closed{{"Gate: concern closed"}}
  clinical -->|No| guide["Guide calls or messages"] --> closed
  closed -->|Not resolved| top
  closed -->|Closed| back(["Exit: back to care"])
  proto[/"New or changed protocol"/] --> gateProto{{"Gate: NP protocol sign-off"}} --> lib[("Approved protocols")]
  tmpl[/"Insight templates, body map wording"/] --> gateT{{"Gate: NP approves templates"}} --> live(["Exit: live"])
```
