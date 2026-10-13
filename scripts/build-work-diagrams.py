"""Create labelled explanatory diagrams for documented product workflows.

These diagrams are authored illustrations, never reconstructed product screens.
"""
import html
import json
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "content/work/case-studies.json"
FLOWS = {
    "personal-loan-marketplace": ["Customer lending intent", "Common application", "Eligibility-based routing", "Bank / NBFC review", "Status, payouts and feedback"],
    "eduloans-policy-workflow": ["Applicant intake", "KAM verification", "Lender gates and scoring", "Explainable matching tiers", "Document checks and human fallback"],
    "lender-integration-operations": ["Partner commercial and policy contract", "Normalised eligibility and KYC", "Application-status exchange", "Payout and reconciliation", "MIS and partner review"],
    "lending-mcp-feedback": ["Client requests evaluation", "Callable lender-policy tool", "Deterministic rule evaluation", "Result returned to the interface", "Reviewed outcome feedback"],
    "kuberx-launch": ["Acquisition instrumentation", "First meaningful app action", "Activation and cohort analysis", "Targeted onboarding journeys", "Acquisition economics review"],
    "silkroute-marketplace": ["Catalogue and discovery", "Negotiation and price matching", "Trade and compliance checks", "Payment and operations", "Shipment and transaction completion"],
    "trade-payments-erp": ["Trade and finance records", "Compliance and shipping documents", "Payment workflows", "Ledger reconciliation", "Settlement and complaint handling"],
    "ondc-credit-infrastructure": ["SME credit requirements", "Adapt agricultural risk primitives", "Ecosystem collaboration", "Partner information exchange", "Lender evaluation"],
    "upaj-farmer-experience": ["Farmer tasks and needs", "Farm monitoring and mandi utility", "Notifications and useful content", "Repeat engagement", "D14 and D30 measurement"],
    "farm-os-iot-gis": ["Indoor sensors / outdoor parcels", "IoT readings and GIS signals", "Farm monitoring view", "Conditions and crop context", "Operational next actions"],
    "crop-health-ai": ["Farmer image capture", "Compression and reconnect", "Crop-health diagnosis", "Agronomist-grounded guidance", "Farmer advisory and action"],
    "rainfall-grid-insurance": ["Satellite and station data", "Terrain and historical context", "Higher-resolution rainfall grid", "Validation with domain partners", "Insurance risk use cases"],
    "upaj-international": ["Local farm and lender needs", "Portuguese / Bahasa interfaces", "Weather, soil and units", "Environmental and credit workflows", "Regional partner delivery"],
    "agri-input-institutional-commerce": ["Agricultural supply and demand", "Input catalogue and stores", "Commerce and distribution", "Institution-specific workflows", "Field and programme delivery"],
    "urbankhet-covid-pivot": ["Changed supply and delivery constraints", "Rebuild sourcing and routes", "Decentralised delivery partners", "Operating SOPs and coordination", "Continuity and waste control"],
    "water-farmers-aquaponics": ["Aquaponics farm inputs", "Growing and farm operations", "Harvest procedures", "Packing and quality routines", "Supply-chain coordination"],
    "covid-resource-database": ["Ground volunteer updates", "Live resource availability", "Beds, oxygen and medicine records", "Volunteer coordination", "Resource information for patients"],
    "moneylion-wow-strategy": ["Recurring member-value hypothesis", "Credit and merchant benefit concepts", "Visible realised-value measures", "Repeated-use cohort definition", "Proposed pilot and economics gates"],
}


def diagram(study, steps):
    bits = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 780" role="img">',
            f'<title>{html.escape(study["title"])} — explanatory workflow</title>',
            '<rect width="1400" height="780" fill="#fff"/>',
            '<text x="64" y="68" font-family="Arial,sans-serif" font-size="19" letter-spacing="2" fill="#555">DOCUMENTED FLOW / AUTHORED ILLUSTRATION</text>']
    title_lines = textwrap.wrap(study["title"], width=64)
    for i, line in enumerate(title_lines[:2]):
        bits.append(f'<text x="64" y="{126 + i * 42}" font-family="Arial,sans-serif" font-size="34" fill="#111">{html.escape(line)}</text>')
    colours = ["#fa772c", "#2357e8", "#f0cce1", "#c6e982", "#ffe558"]
    positions = [(64, 236), (488, 236), (912, 236), (64, 480), (488, 480)]
    for i, (step, (x, y)) in enumerate(zip(steps, positions)):
        bits.append(f'<rect x="{x}" y="{y}" width="380" height="176" rx="4" fill="#fff" stroke="#111" stroke-width="1.5"/>')
        bits.append(f'<rect x="{x}" y="{y}" width="380" height="9" fill="{colours[i]}"/>')
        bits.append(f'<text x="{x+24}" y="{y+46}" font-family="Arial,sans-serif" font-size="19" fill="#666">0{i+1}</text>')
        for j, line in enumerate(textwrap.wrap(step, width=26)):
            bits.append(f'<text x="{x+24}" y="{y+85+j*30}" font-family="Arial,sans-serif" font-size="24" fill="#111">{html.escape(line)}</text>')
        if i in (0, 1, 3):
            bits.append(f'<path d="M{x+391} {y+88}h22m-6-6 6 6-6 6" fill="none" stroke="#111" stroke-width="2"/>')
    bits.append('<text x="912" y="527" font-family="Arial,sans-serif" font-size="22" fill="#111">Read alongside the case study.</text>')
    bits.append('<text x="912" y="563" font-family="Arial,sans-serif" font-size="18" fill="#555">This is a product explanation,</text><text x="912" y="591" font-family="Arial,sans-serif" font-size="18" fill="#555">rather than a captured interface.</text>')
    bits.append('<line x1="64" x2="1336" y1="715" y2="715" stroke="#ddd"/><text x="64" y="753" font-family="Arial,sans-serif" font-size="17" fill="#666">PRIYAM SAMEER / MY WORK</text></svg>')
    return "\n".join(bits)


def build():
    data = json.loads(DATA.read_text())
    target = ROOT / "public/work/workflows"
    target.mkdir(parents=True, exist_ok=True)
    for study in data["caseStudies"]:
        steps = FLOWS.get(study["id"])
        if not steps:
            continue
        filename = f"{study['slug']}.svg"
        (target / filename).write_text(diagram(study, steps))
        media = {"id": "workflow-diagram", "kind": "image", "src": f"/work/workflows/{filename}",
                 "alt": "Documented workflow: " + " → ".join(steps),
                 "caption": "An authored explanation of the workflow described in this case study. This is a diagram, not a captured product screen.", "width": 1400, "height": 780}
        if study["id"] in ("lending-mcp-feedback", "moneylion-wow-strategy"):
            media["caption"] += " It includes architecture or validation directions whose production deployment is not established."
        study["media"] = [m for m in study["media"] if m["id"] != media["id"]] + [media]
        if not study.get("heroMediaId"):
            study["heroMediaId"] = media["id"]
        elif study["heroMediaId"] != media["id"]:
            section = next((s for s in study["sections"] if s["id"] == "build"), None)
            if section:
                section["mediaIds"] = list(dict.fromkeys(section.get("mediaIds", []) + [media["id"]]))
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print("Built source-grounded workflow illustrations")


if __name__ == "__main__":
    build()
