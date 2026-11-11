/*
 * Nexvia Group: site content.
 *
 * Everything the page lists (services, training programs, value proposition) lives here,
 * taken from the company presentation. Edit the text in this file and the page, the menus,
 * the search and the contact form all update together. main.js turns it into HTML.
 */
globalThis.NEXVIA_CONTENT = {
  contactEmail: "info@nexviagroupe.com",

  /* The eight overview cards. `service` opens a service line below; `section` jumps to a section. */
  disciplines: [
    {
      icon: "chip",
      title: "Instrumentation & Controls",
      text: "DCS, PLC, SCADA, ESD, and field instrumentation engineering.",
      service: "instrumentation",
    },
    {
      icon: "gauge",
      title: "Turbine Controls",
      text: "Protection, governing, and anti-surge compressor control systems.",
      service: "instrumentation",
    },
    {
      icon: "bolt",
      title: "Electrical Engineering",
      text: "Power networks, switchgear, generators, and solar PV integration.",
      service: "electrical",
    },
    {
      icon: "gears",
      title: "Mechanical Maintenance",
      text: "Rotating equipment overhaul, static integrity, and alignment.",
      service: "mechanical",
    },
    {
      icon: "shield",
      title: "OT Cybersecurity",
      text: "IEC 62443 compliance, network hardening, and ICS protection.",
      service: "ot-security",
    },
    {
      icon: "box",
      title: "Procurement & Parts",
      text: "Certified OEM spare parts supply with complete traceability.",
      service: "spare-parts",
    },
    {
      icon: "bricks",
      title: "Civil & Construction",
      text: "Piping fabrication, structural steel, and plant modifications.",
      service: "piping-civil",
    },
    {
      icon: "cap",
      title: "Technical Training",
      text: "Competency development programs in reliability and instrumentation.",
      section: "training",
    },
  ],

  /* Menu columns for the "Services" panel in the header. */
  serviceGroups: [
    {
      title: "Engineering & maintenance",
      ids: ["instrumentation", "mechanical", "electrical", "ot-security"],
    },
    {
      title: "Projects & supply",
      ids: ["piping-civil", "spare-parts", "fat", "commissioning", "oem-upgrades"],
    },
  ],

  /* The service lines shown in the explorer. */
  services: [
    {
      id: "instrumentation",
      icon: "chip",
      title: "Instrumentation & Control Systems",
      tag: "I&C · DCS / PLC / SCADA / ESD / F&G",
      menu: "DCS, PLC, SCADA, ESD, F&G and turbine control systems.",
      summary:
        "Engineering and maintenance for DCS, PLC, SCADA, ESD, F&G and turbine control systems, from field instrument installation and calibration to modernization and migration projects.",
      image: {
        src: "assets/img/svc-instrumentation.jpg",
        alt: "Technician checking a field instrument with a handheld calibrator",
        width: 678,
        height: 452,
      },
      groups: [
        {
          items: [
            "Instrument installation, calibration, testing, commissioning, and start-up support",
            "DCS, PLC, SCADA, ESD, F&G, and Turbine Control Systems engineering and maintenance",
            "Well head Control and Protection",
            "Control valve testing, diagnostics, repair, and performance optimization",
            "Turbine control system maintenance, troubleshooting, and upgrades",
            "Field instrumentation installation, loop checking, and functional testing",
            "Shutdown, turnaround, and plant start-up support services",
            "Condition monitoring and asset integrity management solutions",
            "Centrifugal Gas Compressor Control Systems support",
            "Anti-Surge Control System tuning, testing, troubleshooting, and commissioning",
            "Compressor performance monitoring and optimization",
            "Vibration monitoring systems and machinery protection systems",
            "Bently Nevada and rotating equipment condition monitoring solutions",
            "Proximity probe, velocity sensor, and seismic monitoring system maintenance",
            "SIL verification, proof testing, and functional safety support",
            "Instrument and control system modernization and migration projects",
            "Telecommunications and industrial network systems support",
            "Root cause analysis (RCA) and reliability improvement programs",
            "Technical manpower supply with highly experienced Instrumentation & Control specialists",
          ],
        },
      ],
    },
    {
      id: "mechanical",
      icon: "gears",
      title: "Mechanical Services",
      tag: "Rotating & static equipment",
      menu: "Rotating and static equipment maintenance and reliability.",
      summary:
        "Maintenance and overhaul of rotating and static equipment, backed by condition monitoring, reliability engineering and shutdown support.",
      image: {
        src: "assets/img/svc-mechanical.jpg",
        alt: "Engineer reviewing a mechanical seal failure analysis sheet beside a pump",
        width: 1200,
        height: 800,
      },
      groups: [
        {
          items: [
            "Rotating equipment maintenance and overhaul",
            "Pumps, compressors, turbines, blowers, fans, and auxiliary systems",
            "Dynamic equipment installation, alignment, commissioning, and troubleshooting",
            "Static equipment maintenance and repair",
            "Pressure vessels, heat exchangers, separators, tanks, and piping systems",
            "Preventive, predictive, and corrective maintenance programs",
            "Equipment installation, startup, commissioning, and performance testing",
            "Plant shutdown, turnaround, and outage support",
            "Machinery performance assessment and optimization",
            "Reliability-Centered Maintenance (RCM) implementation",
            "Machinery reliability improvement programs",
            "Condition monitoring and predictive maintenance services",
            "Vibration analysis and diagnostics",
            "Thermography and infrared inspection",
            "Lubrication management and oil analysis",
            "Dynamic balancing and shaft alignment",
            "Root Cause Failure Analysis (RCFA)",
            "Asset integrity and lifecycle management",
            "Performance monitoring of critical rotating equipment",
            "Reliability engineering studies and maintenance optimization",
          ],
        },
      ],
    },
    {
      id: "electrical",
      icon: "bolt",
      title: "Electrical Services",
      tag: "LV / MV / HV · Solar PV · BESS",
      menu: "Power networks, switchgear, generators and solar PV.",
      summary:
        "Power plant electrical systems, LV, MV and HV networks, switchgear and protection, plus solar and hybrid renewable energy systems from design to asset management.",
      image: {
        src: "assets/img/svc-electrical.jpg",
        alt: "Electrician measuring current in a distribution panel with a clamp meter",
        width: 500,
        height: 350,
      },
      groups: [
        {
          title: "Power and electrical systems",
          items: [
            "Power Plant Electrical Systems",
            "Turbo-Generators & Auxiliary Systems",
            "Generator Protection & Synchronization Systems",
            "LV, MV & HV Networks",
            "Switchgear & Transformer Maintenance",
            "UPS & Critical Power Systems",
            "Protection Relays & Control Systems",
            "Industrial Motor & MCC Systems",
            "Electrical Reliability & Condition Monitoring",
            "Testing, Commissioning & Troubleshooting",
          ],
        },
        {
          title: "Solar and renewable energy",
          items: [
            "Solar Power Systems (Photovoltaic - PV) Installation & Commissioning",
            "Solar Panel Design, Supply, Installation & Maintenance",
            "Grid-Tied and Off-Grid Solar Energy Solutions",
            "Solar Inverters, Battery Energy Storage Systems (BESS) & Monitoring Systems",
            "Hybrid Renewable Energy Systems Integration",
            "Solar Power Plant Construction, Testing & Performance Optimization",
            "Renewable Energy Asset Management & Maintenance",
          ],
        },
      ],
    },
    {
      id: "ot-security",
      icon: "shield",
      title: "OT Cybersecurity & Industrial Control Systems Security",
      short: "OT Cybersecurity & ICS Security",
      tag: "IEC 62443 · ICS / SCADA",
      menu: "IEC 62443 compliance, network hardening and ICS protection.",
      summary:
        "Assessment, hardening and monitoring of industrial control systems, with compliance to IEC 62443 and industrial cybersecurity standards.",
      image: {
        src: "assets/img/svc-ot-security.jpg",
        alt: "Illustration of a plant control room protected by a security shield",
        width: 1200,
        height: 857,
      },
      groups: [
        {
          items: [
            "OT Cybersecurity Assessment and Risk Analysis",
            "Industrial Control System (ICS) Security",
            "DCS, PLC, SCADA, ESD, and F&G Cybersecurity",
            "Network Architecture Review and Security Hardening",
            "Industrial Firewall Configuration and Management",
            "Secure Remote Access Solutions",
            "Industrial Network Segmentation and Zone Design",
            "Vulnerability Assessment and Remediation",
            "Patch Management for Industrial Control Systems",
            "Security Monitoring and Incident Response Support",
            "OT Asset Inventory and Risk Management",
            "Backup and Disaster Recovery Solutions",
            "Compliance with IEC 62443 and Industrial Cybersecurity Standards",
            "OT/IT Convergence Security Management",
            "Security Awareness and Training Programs",
            "Critical Infrastructure Protection",
          ],
        },
      ],
    },
    {
      id: "piping-civil",
      icon: "bricks",
      title: "Piping, Fabrication & Civil Construction",
      tag: "Piping · Structural steel · Civil works",
      menu: "Piping fabrication, structural steel and construction works.",
      summary:
        "Piping fabrication, structural steel and plant modifications, together with industrial and commercial construction works.",
      image: {
        src: "assets/img/svc-piping.jpg",
        alt: "Flanged steel pipe spools laid out after fabrication",
        width: 400,
        height: 400,
      },
      groups: [
        {
          title: "Piping & Fabrication",
          items: [
            "Piping installation and modification works",
            "Pipe fabrication and welding services",
            "Pressure testing and flushing activities",
            "Structural steel fabrication and erection",
            "Plant modification and brownfield projects",
          ],
        },
        {
          title: "Civil & Construction Services",
          items: [
            "Industrial and commercial construction works",
            "Foundations and concrete structures",
            "Building renovation and refurbishment",
            "Infrastructure development",
            "Facility expansion projects",
          ],
        },
      ],
    },
    {
      id: "spare-parts",
      icon: "box",
      title: "Certified Spare Parts Supply",
      tag: "OEM parts · Full traceability",
      menu: "Certified OEM spare parts with complete traceability.",
      summary:
        "Reliable supply chain solutions: certified OEM spare parts supply with complete traceability.",
      image: {
        src: "assets/img/svc-spare-parts.jpg",
        alt: "Pressure gauge, solenoid valves, fittings and other instrumentation spare parts",
        width: 694,
        height: 442,
      },
      groups: [
        {
          title: "Product categories",
          items: [
            "Instrumentation Components",
            "Electrical Equipment",
            "Mechanical Spare Parts",
            "Control System Components",
            "OEM Replacement Parts",
          ],
        },
        {
          title: "Quality commitment",
          items: [
            "Certified Products",
            "Full Traceability",
            "International Standards Compliance",
            "Vendor Qualification",
          ],
        },
      ],
    },
    {
      id: "fat",
      icon: "clipboard",
      title: "Factory Acceptance Testing Services",
      short: "Factory Acceptance Testing",
      tag: "Independent third-party witness",
      menu: "Independent third-party witness inspection.",
      summary:
        "As an independent Third-Party Witness Inspector, our role is to verify that the equipment complies with the approved specifications, project requirements, and applicable standards. We will work collaboratively with the Client, Vendor, and all stakeholders to facilitate a smooth and successful Factory Acceptance Test (FAT). Through open communication, timely observations, and constructive feedback, we aim to ensure that all FAT activities are efficiently executed, documented, and accepted in compliance with project requirements.",
      groups: [
        {
          title: "Our commitment during FAT",
          items: [
            "Act as an independent witness to FAT activities.",
            "Collaborate closely with the Client and Vendor.",
            "Verify compliance with project specifications and standards.",
            "Provide timely observations and feedback.",
            "Support prompt resolution of findings and issues.",
            "Maintain transparency and effective communication.",
            "Contribute to a successful FAT acceptance and project execution.",
          ],
        },
      ],
      /* Who does what at each stage of the test. The vendor performs the FAT. */
      flow: {
        caption: "FAT workflow: who does what at each stage",
        columns: ["Contractor / vendor stage", "Client", "Nexvia Group"],
        steps: [
          ["Manufacturing", "Witness", "Witness"],
          ["Submit documents", "Review document", "Verify documents"],
          ["Prepare FAT", "Review FAT procedure", "Review FAT procedure"],
          ["Perform FAT", "Witness testing", "Witness testing"],
          ["Resolve findings", "Approve NCR closure", "Verify closure"],
          ["FAT completion", "Final acceptance", "Recommendation"],
          ["Shipment release request", "Shipment approval", "Witness release"],
        ],
      },
    },
    {
      id: "commissioning",
      icon: "power",
      title: "Commissioning & Start-Up Support",
      tag: "Pre-commissioning to start-up",
      menu: "End-to-end commissioning, from loop checks to start-up.",
      summary:
        "End-to-end commissioning services, from pre-commissioning and loop checking to start-up support.",
      image: {
        src: "assets/img/svc-commissioning.jpg",
        alt: "Aerial view of a process plant with steam rising from its units",
        width: 1200,
        height: 800,
      },
      groups: [
        {
          title: "Scope",
          items: [
            "Pre-commissioning",
            "Loop checking",
            "Instrument calibration",
            "Functional testing",
            "System integration testing",
            "Start-up support",
          ],
        },
        {
          title: "Systems covered",
          items: [
            "Process control systems",
            "ESD systems",
            "Fire & Gas systems",
            "Electrical systems",
            "Rotating equipment",
          ],
        },
      ],
      result: { label: "Result", text: "Safe and successful project handover." },
    },
    {
      id: "oem-upgrades",
      icon: "upgrade",
      title: "OEM Upgrades & Service Bulletin Implementation",
      short: "OEM Upgrades & Service Bulletins",
      tag: "Service bulletins · Retrofit · RAM",
      menu: "Modifications, upgrades and lifecycle extension.",
      summary:
        "Nexvia works in close collaboration with clients to assess, engineer, and implement modifications, upgrades, and reliability improvements for major rotating equipment. We support the execution of OEM recommendations, service bulletins, technical advisories, and lifecycle extension programs to ensure equipment remains safe, reliable, and compliant with the latest manufacturer requirements.",
      groups: [
        {
          title: "Our services include",
          items: [
            "Review and evaluation of OEM service bulletins and technical recommendations.",
            "Engineering studies and feasibility assessments for retrofit and upgrade projects.",
            "Preparation of technical specifications, scope of work, and implementation plans.",
            "Procurement and installation of upgraded components and control systems.",
            "Testing, commissioning, and performance validation following modifications.",
            "Obsolescence management and modernization of legacy systems.",
            "Reliability, availability, and maintainability (RAM) improvement initiatives.",
            "Support for turbines, compressors, generators, pumps, and auxiliary systems.",
          ],
        },
      ],
    },
  ],

  /* Training programs offered through the training center. */
  programs: [
    {
      id: "reliability",
      title: "Reliability Engineering",
      topics: [
        "Root Cause Analysis (RCA)",
        "Asset Performance Management (APM)",
        "Reliability Centered Maintenance (RCM)",
        "Failure Modes and Effects Analysis (FMEA)",
        "Reliability KPIs & Performance Monitoring",
        "Defect Elimination Programs",
      ],
    },
    {
      id: "condition-monitoring",
      title: "Condition Monitoring",
      topics: [
        "Vibration Monitoring & Analysis",
        "Machinery Diagnostics",
        "Oil Analysis & Tribology",
        "Thermography (Infrared Inspection)",
        "Predictive Analytics",
        "Condition-Based Maintenance (CBM)",
      ],
    },
    {
      id: "turbine-controls",
      title: "Turbine Control Systems",
      topics: [
        "Gas Turbine Control Philosophy",
        "Mark VIe Control System",
        "Turbine Protection Systems",
        "Trip Logic & Voting Systems",
        "Speed Control & Overspeed Protection",
        "Startup, Shutdown & Troubleshooting",
      ],
    },
    {
      id: "compressors",
      title: "Centrifugal Compressor Systems",
      topics: [
        "Compressor Fundamentals",
        "Performance Maps & Operating Curves",
        "Anti-Surge Control Systems",
        "Recycle Valve Operation & Tuning",
        "Surge Detection & Prevention",
        "Compressor Protection Logic",
        "Compressor Control & Troubleshooting",
        "Compressor Performance Monitoring",
      ],
    },
    {
      id: "instrumentation-training",
      title: "Instrumentation",
      topics: [
        "Instrument Calibration",
        "Control Valves & Positioners",
        "Pressure, Temperature, Flow & Level Instrumentation",
        "SIS / ESD Systems",
        "Fieldbus & Communication Protocols",
        "Instrument Troubleshooting",
      ],
    },
    {
      id: "maintenance-excellence",
      title: "Maintenance Excellence",
      topics: [
        "Preventive Maintenance (PM)",
        "Predictive Maintenance (PdM)",
        "Work Management & Planning",
        "Maintenance Best Practices",
        "Risk-Based Maintenance (RBM)",
        "Shutdown & Turnaround Management",
      ],
    },
    {
      id: "electrical-systems",
      title: "Electrical Systems",
      topics: [
        "Power Generation Fundamentals",
        "Motor Control Centers (MCC)",
        "Protection Relays",
        "Generators & Excitation Systems",
        "Switchgear Operations",
        "Electrical Troubleshooting & Safety",
      ],
    },
    {
      id: "turbine-mechanical",
      title: "Turbine Mechanical Systems",
      topics: [
        "Gas Turbine Fundamentals",
        "Turbine Mechanical Components",
        "Bearings & Lubrication Systems",
        "Couplings & Rotating Equipment",
        "Compressor & Combustion Systems",
        "Maintenance & Overhaul Practices",
      ],
    },
    {
      id: "ot-cybersecurity",
      title: "OT Cybersecurity",
      topics: [
        "ICS/SCADA Security",
        "DCS & PLC Cybersecurity",
        "IEC 62443 Compliance",
        "Industrial Network Security",
        "Critical Infrastructure Protection",
      ],
    },
  ],

  /* "Why choose Nexvia Group?": one row per reason. */
  values: [
    {
      id: "technical-excellence",
      title: "Technical Excellence",
      intro:
        "Our team comprises experienced engineers, supervisors, specialists, and technicians with extensive expertise in Mechanical, Electrical, Instrumentation, Control Systems, Construction, Procurement, and Operational Technology (OT) Cybersecurity.",
      items: [],
    },
    {
      id: "integrated-services",
      title: "Integrated Multi-Disciplinary Services",
      intro: "We offer a single-source solution covering:",
      items: [
        "Mechanical Services",
        "Electrical Services",
        "Instrumentation & Control Systems",
        "Rotating Equipment & Reliability Engineering",
        "Power Generation Systems",
        "Civil & Construction Services",
        "Piping & Fabrication",
        "Procurement & Supply Chain Solutions",
        "Renewable Energy Solutions",
        "OT Cybersecurity & Industrial Network Security",
      ],
      note: "This integrated approach minimizes project interfaces, reduces downtime, improves coordination, and ensures efficient project execution.",
    },
    {
      id: "reliability-performance",
      title: "Reliability & Asset Performance",
      intro:
        "Our solutions focus on maximizing equipment availability and operational efficiency through:",
      items: [
        "Reliability Engineering",
        "Predictive Maintenance",
        "Condition Monitoring",
        "Vibration Analysis",
        "Asset Integrity Management",
        "Root Cause Failure Analysis (RCFA)",
        "Reliability-Centered Maintenance (RCM)",
      ],
    },
    {
      id: "specialized-expertise",
      title: "Specialized Industrial Expertise",
      intro: "Nexvia Group possesses specialized expertise in:",
      items: [
        "Gas Turbine Control Systems",
        "Centrifugal Gas Compressor Control Systems",
        "Anti-Surge Protection Systems",
        "Turbo-Generators",
        "DCS, PLC, SCADA & ESD Systems",
        "Machinery Protection Systems",
        "LV, MV & HV Power Systems",
        "Renewable Energy & Solar Solutions",
        "Industrial Automation & Digitalization",
      ],
    },
    {
      id: "safety-first",
      title: "Safety First Culture",
      intro:
        "Safety is embedded in everything we do. We are committed to maintaining the highest standards of:",
      items: [
        "HSE Compliance",
        "Risk Management",
        "Operational Integrity",
        "Personnel Safety",
        "Environmental Responsibility",
      ],
    },
    {
      id: "operational-agility",
      title: "Operational Agility",
      intro:
        "We understand the importance of rapid response and operational continuity. Our teams can be mobilized quickly to support:",
      items: [
        "Emergency Maintenance",
        "Shutdowns & Turnarounds",
        "Plant Startups",
        "Commissioning Activities",
        "Reliability Improvement Projects",
        "Long-Term Service Agreements",
      ],
    },
    {
      id: "innovation-cybersecurity",
      title: "Innovation & Cybersecurity",
      intro:
        "As industrial operations become increasingly digital, Nexvia Group helps clients secure and modernize critical assets through:",
      items: [
        "OT Cybersecurity Solutions",
        "Industrial Network Security",
        "IEC 62443 Compliance Support",
        "Secure Remote Operations",
        "Digital Asset Monitoring",
        "Smart Maintenance Solutions",
      ],
    },
    {
      id: "quality-focus",
      title: "Quality & Customer Focus",
      intro: "We build long-term relationships by delivering:",
      items: [
        "High-Quality Workmanship",
        "Cost-Effective Solutions",
        "Timely Execution",
        "Transparent Communication",
        "Continuous Improvement",
        "Measurable Results",
      ],
    },
  ],

  /* Starting points offered in the search box before anything is typed. */
  searchSuggestions: [
    "anti-surge",
    "IEC 62443",
    "vibration analysis",
    "solar PV",
    "commissioning",
    "RCM",
  ],
};
