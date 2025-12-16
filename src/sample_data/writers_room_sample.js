const sampleData = [
  {
    creative: {
      creativity_to_reporter: 90,
      fact_to_fiction: 15,
      length: 'short',
      tone_strictness: 30,
    },
    final_draft: {
      draft_markdown:
        'Everyone loves free cheese until they realize it’s bait. The same goes for that shiny Class 8 truck on the lot with the price tag that seems like it fell off the back of a clearance sale. In this business, hurried buying is just a fancier mousetrap.\n\n-----\n\nA driver I know walked onto a yard in Kansas last spring. His boss wanted a truck quickly; freight was lined up and his current rig was down for overhaul. On the row sat a metallic blue Cascadia, fresh paint, low advertised miles, and a salesman saying all the right things. The buyer felt that little rush that comes right before you reach for your wallet. He stopped himself. “Let’s get under it,” he said.\n\nFlashlight out. First glance under the frame revealed coolant stains near the reservoir and a damp streak along an oil seal. The fifth wheel’s top rail had a fracture the size of a hairline, but a crack all the same. Half an hour later, the VIN check pulled up a salvage record out of Ohio. Inspection patience saved him about $40,000 and eight months of downtime he never had.\n\n-----\n\nThe truth: every solid used truck deal starts with a process, not a promise. Don’t buy if you haven’t completed these steps:\n\n- Engine compartment check: Make sure there’s no oil or coolant leaking. Confirm the oil filler cap and coolant reservoir are secure. Look for frayed belts or cracked U-bolts around the engine mounts.\n- Underbody and suspension: Check U-bolts, leaf springs, and shocks for cracks or rust. Shine your light along the driveshaft; any dent or visible twist means a walk-away moment.\n- Tires and wheels: Look for even tread wear, proper pressure, and matching size and manufacturer. Replace mismatched tires before rolling.\n- Coupling and fifth wheel: Top rail should show no cracks; verify air and electrical lines are intact. The fifth wheel should tilt and lock smoothly. A current PM sticker is a good sign maintenance wasn’t an afterthought.\n- Lights and safety: DOT standards require functioning brake, signal, and clearance lights. Confirm the suspension and exhaust mounts are intact—missing hangers are warning signs.\n- Documents and history: Confirm license, title, VIN, and previous inspection reports. If the dealer hesitates to show maintenance records, that’s your cue to slow down or walk away.\n\nDo this before signing anything. Oil sampling is worth the cost—it’s a blood test for engines. A clean sample means years of life left; metal or soot in the oil tells a different story. Truck services come around every 15,000 to 25,000 miles for a reason. If you don’t know when the last one happened, you’re already guessing your way into a risk.\n\n-----\n\nPatience doesn’t look exciting on the yard, but it’s what separates a clean fleet from a regret in progress. Insist on the full inspection, read the reports twice, and sleep on the deal. The cheese will still be there tomorrow—if it’s real, it’ll hold up under the light.',
      role: 'Head Writer',
      summary:
        'This Tonka Blog post reminds used Class 8 truck buyers that patience and a complete inspection process prevent costly surprises. By following clear checklists that cover engine, undercarriage, tires, fifth wheel, and documentation, buyers can avoid falling for rushed or “too-good” offers. Smart buying isn’t about chasing the deal—it’s about letting careful inspection and time protect your investment.',
      thesis:
        'In the used Class 8 truck market, exercising patience and conducting thorough inspections are essential to avoid costly mistakes and ensure a sound investment.',
      title: 'Patience Pays: How to Avoid the Mousetrap in Used Truck Deals',
    },
    future_story_arc_generator: {
      arcs: [
        {
          arc_title: 'Buying in Bulk: How Fleet Purchases Multiply Risk',
          one_line_premise:
            'When scaling a small fleet, buying multiple used Class 8s at once amplifies hidden problems—here’s how to manage batch risk without breaking the bank.',
          suggested_story_seed:
            'Practical checklist for multi-truck buys: prioritize VIN history parity, staggered acceptance windows, third-party inspection standards you can demand, simple escrow/holdback clauses, and minimum spare-parts/tech support commitments to build into the deal.',
          why_it_matters:
            'A single bad truck is costly; a bad batch can wipe out cashflow, spike maintenance, and hurt delivery commitments. Small fleets need affordable safeguards to avoid systemic downtime and resale losses.',
        },
        {
          arc_title: 'Price vs. Uptime: The Owner-Operator’s Trade-offs',
          one_line_premise:
            'For owner-operators, the cheapest rustbucket often costs more in lost revenue than a pricier, better-maintained truck—how to pick the right balance.',
          suggested_story_seed:
            'Concrete scenarios comparing low-cost vs. higher-quality buys with real numbers for average downtime, typical repair bills, and cashflow impact; quick inspection thresholds (e.g., transmission/service history, axle wear) that are worth paying up for.',
          why_it_matters:
            'Owner-operators live on uptime. Choosing by sticker price alone risks long repair waits, loan default, and ruined routes—decisions that affect day-to-day earnings more than initial outlay.',
        },
        {
          arc_title:
            'Buying for Tomorrow: Emissions, Compliance, and Resale Risk',
          one_line_premise:
            'Used-truck value and operability are increasingly tied to emissions equipment and upcoming regional regs—buyers must read the regulatory clock before signing.',
          suggested_story_seed:
            'List of practical questions and inspection points: verify engine family and EPA-cert sticker, aftertreatment condition (DPF/DEF/SCR), known retrofit costs, expected regional restrictions, and a short buying rule-of-thumb for where to pay premium for newer emissions hardware.',
          why_it_matters:
            'Regulation-driven retrofits, route limits, and resale pools can turn a seemingly cheap truck into a stranded asset. Planning for emissions compliance protects future earnings and trade-in value.',
        },
      ],
    },
    head_writer_system_message:
      'You are the HEAD WRITER in a multi-writer room.\n\nStory seed: Write a Tonka Blog article for cautious used Class 8 truck buyers that uses the mousetrap and \'free cheese\' only as a light metaphor for risky, rushed deals. Focus mainly on practical inspection steps, research-based checklists, and how patience and a proper inspection process prevent expensive mistakes.\nTarget audience: truck buyers who are cautious about getting burned on a used semi truck\n\nBrand: Tonka Blog\nTagline: Dispatches from the iron business.\nVoice: Straight-talking broker, reflective but practical\nBrand guidelines:\nDo:\n- Explain how the business actually works\n- Use real scenarios, deals, and shop-floor logic\n- Emphasize trust, transparency, and long-term thinking\nDon’t:\n- No generic “content marketing” tone\n- No pretending every deal is perfect\nCreative sliders:\n- fact_to_fiction: 15\n- creativity_to_reporter: 90\n- tone_strictness: 30\n- length: short\n\nWriter panel (roles + weighted notes):\n[\n  {\n    "role": "comedy",\n    "weight": 0.1\n  },\n  {\n    "role": "documentary",\n    "weight": 0.7\n  },\n  {\n    "role": "action",\n    "weight": 0.2\n  }\n]\n\nProject mode: Blog post (blog_post)\n\nMode description:\nWrite a clear, engaging blog post that blends story, insight, and practical value for the reader.\n\nHead Writer instructions:\n- Open with a strong hook that makes the reader feel seen.\n- Blend real-world examples and clear explanations.\n- Focus on one main idea or lesson, not everything at once.\n- Use headings and short paragraphs so it is easy to skim.\n\nStructural hints (not strict, but preferred):\n- Hook / problem the reader recognizes.\n- Context or a short anecdote that illustrates the issue.\n- Breakdown of what’s really going on.\n- Concrete recommendations or steps.\n- Short closing that reinforces the main takeaway.\n\nTask:\n- Treat the story_seed and writer_notes as conceptual origin only, not as a literal fable you must retell.\n- Write a professional Tonka Blog article for working truck buyers, not a children’s story.\n- Keep any allegory or metaphor to at most 1–2 short lines of framing, then focus on clear, practical guidance.\n- Use the research findings to ground inspections, risk, and process details whenever you describe “what to do”.\n- Use headings and short paragraphs; prioritize clarity and usefulness over cleverness.\n- Avoid extended scenes about mice or characters; anchor the piece in inspections, deals, and shop-floor reality.',
    outputs: {
      blog_post: true,
      future_story_arc: true,
      gdocs_folder_id: '1EFwmu8YdaRT-yGGGm1kFv_8DIcVZ07re',
      mongo_log: true,
      reference_doc: true,
      screenplay: false,
      socials: false,
      story_prompts: false,
      visual_prompts: true,
    },
    platform_summaries: {
      linkedin:
        'For professionals in trucking, this article highlights the importance of patience and detailed inspections to avoid expensive pitfalls when purchasing used Class 8 trucks.',
      meta: 'Used Class 8 truck buyers: avoid rushed deals and costly surprises by following a thorough inspection checklist. Patience is key to a smart investment.',
      tonkaintl:
        'Tonka Blog shares essential inspection steps and the value of patience for used Class 8 truck buyers worldwide. Avoid traps and protect your investment.',
      x: 'Buying a used Class 8 truck? Don\u0019t rush. Follow these inspection tips and stay clear of costly traps. Patience pays off in the long haul.',
      youtube:
        'Discover how patience and thorough inspections can save you thousands when buying used Class 8 trucks. Learn practical steps to avoid costly mistakes in this Tonka Blog guide.',
    },
    project: {
      audience:
        'truck buyers who are cautious about getting burned on a used semi truck',
      brand: 'tonka_blog',
      brand_meta: {
        guidelines: {
          do: [
            'Explain how the business actually works',
            'Use real scenarios, deals, and shop-floor logic',
            'Emphasize trust, transparency, and long-term thinking',
          ],
          dont: [
            'No generic “content marketing” tone',
            'No pretending every deal is perfect',
          ],
          style_examples: [
            'We don’t sell the dream. We explain the work.',
            'Every truck has a story. We care about the ones that start after you pay for it.',
          ],
        },
        name: 'Tonka Blog',
        slug: 'tonka_blog',
        tagline: 'Dispatches from the iron business.',
        voice: 'Straight-talking broker, reflective but practical',
      },
      mode: 'blog_post',
    },
    project_mode: 'blog_post',
    project_mode_profile: {
      description:
        'Write a clear, engaging blog post that blends story, insight, and practical value for the reader.',
      headWriterInstructions: [
        'Open with a strong hook that makes the reader feel seen.',
        'Blend real-world examples and clear explanations.',
        'Focus on one main idea or lesson, not everything at once.',
        'Use headings and short paragraphs so it is easy to skim.',
      ],
      label: 'Blog post',
      structureHints: [
        'Hook / problem the reader recognizes.',
        'Context or a short anecdote that illustrates the issue.',
        'Breakdown of what’s really going on.',
        'Concrete recommendations or steps.',
        'Short closing that reinforces the main takeaway.',
      ],
      taskLines: [
        'Treat the story_seed and writer_notes as conceptual origin only, not as a literal fable you must retell.',
        'Write a professional Tonka Blog article for working truck buyers, not a children’s story.',
        'Keep any allegory or metaphor to at most 1–2 short lines of framing, then focus on clear, practical guidance.',
        'Use the research findings to ground inspections, risk, and process details whenever you describe “what to do”.',
        'Use headings and short paragraphs; prioritize clarity and usefulness over cleverness.',
        'Avoid extended scenes about mice or characters; anchor the piece in inspections, deals, and shop-floor reality.',
      ],
    },
    research: {
      citations: [
        'https://schneiderjobs.com/blog/pre-trip-inspection',
        'https://csa.fmcsa.dot.gov/safetyplanner/documents/396%20Forms/Inspection%20Procedure.pdf',
        'https://safetyculture.com/checklists/heavy-vehicle-inspection',
        'https://www.geotab.com/blog/dot-audit/',
        'https://truckingacademy.us/products/used-truck-inspection-checklist',
        'https://consolidatedtruck.com/buying-a-used-truck-your-truck-inspection-checklist/',
        'https://heavyvehicleinspection.com/checklist-center/truck-service-checklist',
        'https://www.papekenworth.com/blog/what-to-look-for-when-buying-a-used-semi-truck',
      ],
      enable_research: true,
      facts: 'Most buyers do not take time to fully inspect their purchase',
      findings: [
        'DOT Level 1 North American Standard Inspection checks brakes, steering, suspension, tires, lights, coupling devices, exhaust, and cargo securement.',
        'Pre-trip inspections include engine compartment items like oil filler cap secure, coolant reservoir no leaks, U-bolts no cracks, driveshaft not cracked.',
        'Used truck checklists recommend inspecting tires for leaks, tread wear, matching size/manufacturer; coolant color; oil level and cleanliness; belts for fraying.',
        'Fifth wheel area inspection covers top rail no cracks, air/electrical lines intact, PM sticker current.',
        'DOT inspections verify driver documents: license, medical certificate, hours of service logs.',
        'Truck service every 15,000-25,000 miles includes oil/filter change, fluid checks, tire pressure.',
      ],
      role: 'researcher',
      sources: [
        'https://schneiderjobs.com/blog/pre-trip-inspection',
        'https://csa.fmcsa.dot.gov/safetyplanner/documents/396%20Forms/Inspection%20Procedure.pdf',
        'https://safetyculture.com/checklists/heavy-vehicle-inspection',
        'https://www.geotab.com/blog/dot-audit/',
        'https://consolidatedtruck.com/buying-a-used-truck-your-truck-inspection-checklist/',
        'https://www.papekenworth.com/blog/what-to-look-for-when-buying-a-used-semi-truck',
        'https://heavyvehicleinspection.com/checklist-center/truck-service-checklist',
      ],
      weight: 0.7,
    },
    revision: {
      max_revisions: 0,
      revisionCount: 0,
    },
    story_seed:
      "Write a Tonka Blog article for cautious used Class 8 truck buyers that uses the mousetrap and 'free cheese' only as a light metaphor for risky, rushed deals. Focus mainly on practical inspection steps, research-based checklists, and how patience and a proper inspection process prevent expensive mistakes.",
    target_audience:
      'truck buyers who are cautious about getting burned on a used semi truck',
    target_brand: {
      id: 'tonka_blog',
      project: {
        guidelines: {
          do: [
            'Explain how the business actually works',
            'Use real scenarios, deals, and shop-floor logic',
            'Emphasize trust, transparency, and long-term thinking',
          ],
          dont: [
            'No generic “content marketing” tone',
            'No pretending every deal is perfect',
          ],
          style_examples: [
            'We don’t sell the dream. We explain the work.',
            'Every truck has a story. We care about the ones that start after you pay for it.',
          ],
        },
        name: 'Tonka Blog',
        slug: 'tonka_blog',
        tagline: 'Dispatches from the iron business.',
        voice: 'Straight-talking broker, reflective but practical',
      },
    },
    title_variations: [
      'Avoiding the Mousetrap: A Patient Approach to Buying Used Class 8 Trucks',
      'Why Patience Is Your Best Tool When Buying Used Semi Trucks',
      'Steer Clear of Costly Mistakes: Inspection Tips for Used Truck Buyers',
      'The Smart Buyer\u0019s Guide to Used Class 8 Trucks: Patience and Inspection Matter',
      'How to Spot a Trap and Buy Used Trucks with Confidence',
    ],
    tokens: {
      writer_token_count: 802,
    },
    visual_prompts: [
      {
        id: 'vp-01',
        intent: 'hero',
        prompt:
          "Wide, steady still of a used Class 8 tractor parked in a used-truck sales and inspection yard among several other Class 8 trucks. The tractor's hood is propped open to expose the engine bay showing grease and surface corrosion on metal components; a portable workbench with diagnostic tools and a coil of air hose sits next to the truck. Ground shows oil stains, compacted gravel, and tire tracks. Overcast daylight, neutral color, documentary feel. No people or signage.",
      },
      {
        id: 'vp-02',
        intent: 'detail',
        prompt:
          'Close-up still of a used Class 8 wheel and brake assembly: worn tire with uneven tread wear and small sidewall cracks, rusted hub and brake drum with flaking corrosion, several lug nuts showing surface rust. A metal caliper rests on the tire tread as an inspection reference, a thin film of brake dust visible in crevices. Plain background of yard gravel; no hands, no people.',
      },
      {
        id: 'vp-03',
        intent: 'process',
        prompt:
          "Still image of an inspection setup beside a used Class 8 truck: a folding work table holds a blank inspection checklist on a clipboard, a closed laptop with a dark screen, a portable LED inspection lamp aimed at the truck's chassis, and a hydraulic jack positioned under the frame. Tools and a small parts tray are arranged as if mid-inspection; engine compartment open but no people present.",
      },
      {
        id: 'vp-04',
        intent: 'environment',
        prompt:
          'Panoramic still of a used Class 8 truck yard on an overcast day: multiple Class 8 trucks parked in rows showing a range of conditions from weathered and rusty to recently cleaned, muddy lanes with puddles and visible tire tracks, portable service carts and jacks positioned next to several units, an equipment storage shed in the background. No people, no signage, emphasis on yard context and condition variations.',
      },
      {
        id: 'vp-05',
        intent: 'metaphor',
        prompt:
          'Literal, side-by-side comparison still in a used-truck yard: two Class 8 tractors parked next to each other to show contrasting condition — the left truck with a relatively clean, intact frame and a tire with deep tread; the right truck with heavy frame rust, flaking paint, and a visibly bald tire. Ground between them shows grease spots and compressed gravel, emphasizing the visual contrast in condition. No people.',
      },
    ],
    writer_notes: {
      action: {
        notes: [
          'Buyer spots a gleaming truck deal that looks too good to be true.',
          'He pauses, sensing the bait, and pulls out his inspection checklist.',
          'Under the hood, a faint oil leak glistens — the first red flag.',
          'Seller pressures him to sign fast; he steps back, refusing the rush.',
          'He crawls beneath the chassis, snapping photos of hidden rust.',
          'Hours later, he walks away from the trap, saving thousands by patience.',
        ],
        role: 'action',
        weight: 0.2,
      },
      comedy: {
        notes: [
          "Everyone loves a bargain until that 'too good to be true' deal starts leaking oil faster than coffee leaks through a paper cup.",
          'Free cheese is nice—until you realize you’re the one in the mousetrap holding the bill for engine repairs.',
          'Patience may not make you rich, but it does prevent you from buying a truck that sounds like a rock tumbler full of regret.',
          'Inspecting the undercarriage isn’t glamorous, but neither is calling a tow truck on day two.',
          'Rushing the deal is like skipping leg day—sure, it’s faster, but you’ll regret it when things start wobbling.',
        ],
        role: 'comedy',
        weight: 0.1,
      },
    },
    writer_panel: [
      {
        role: 'comedy',
        weight: 0.1,
      },
      {
        role: 'documentary',
        weight: 0.7,
      },
      {
        role: 'action',
        weight: 0.2,
      },
    ],
    writers: {
      action: {
        enabled: true,
        weight: 0.2,
      },
      biographer: {
        enabled: false,
        weight: 0,
      },
      comedy: {
        enabled: true,
        weight: 0.1,
      },
      documentary: {
        enabled: true,
        weight: 0.7,
      },
      historic: {
        enabled: false,
        weight: 0,
      },
      scifi: {
        enabled: false,
        weight: 0,
      },
    },
  },
];

export default sampleData;
