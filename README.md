☕ KawaLink

Connecting Uganda's coffee community, from farm to buyer.

KawaLink is a lightweight, mobile-first web app that helps Ugandan coffee farmers, cooperatives, suppliers, buyers, and stakeholders find each other and trade directly. Users can paste an informal message (like a WhatsApp text) and let AI turn it into a clean, structured listing.

Built for Hacktoberfest 2026 in Nakawa at Makerere University Business School (MUBS) by a team of five, using Gemma 4 in Google AI Studio.

"AI belongs to everyone."

The Problem

Uganda's coffee sector has plenty of supply and demand, but connecting the two is hard:

Farmers often lack visibility into fair prices and rely on middlemen.
Buyers struggle to find quality coffee in a specific region.
Suppliers (inputs, equipment, seedlings) have no direct channel to farmers.
Information is scattered across WhatsApp groups, phone calls, and word of mouth.
Many users have mid-range phones, costly data, and unstable internet.
The Solution

KawaLink gives the coffee community one simple place to post, discover, and connect, designed around how people in Uganda actually trade: phone calls, WhatsApp, and mobile money.

Features (MVP)
#	Feature	Description
1	Role and profile	Choose a role (Farmer, Cooperative, Supplier, Buyer, Stakeholder) and create a simple profile.
2	AI listing builder	Paste an informal message, and Gemma 4 extracts a structured listing for you to review before posting.
3	Listings board	Browse and filter by region, variety, grade, and Selling/Buying.
4	Express interest	Contact details stay hidden until a user clicks "Express interest."

Fallback: if the AI call fails, users can post with a manual form.

Example

Input

I have 300kg kiboko in Masaka, ready in 2 weeks, 4500 per kg

Structured output

json
{
  "type": "selling",
  "poster_role": null,
  "variety": "Robusta",
  "grade": "kiboko",
  "quantity_kg": 300,
  "price_ugx_per_kg": 4500,
  "region": "Central",
  "district": "Masaka",
  "contact": null,
  "notes": "Ready in 2 weeks.",
  "missing_fields": ["poster_role", "contact"]
}
Listing Schema
Field	Type	Notes
type	selling / buying / service_or_supply / info_or_question	Kind of post
poster_role	string or null	farmer, cooperative, supplier, buyer, stakeholder
variety	Robusta / Arabica / null	Coffee variety
grade	string or null	e.g. kiboko, FAQ, parchment, green_bean
quantity_kg	number or null	Quantity in kilograms
price_ugx_per_kg	number or null	Price in UGX per kg
region	Central / Western / Eastern / Northern / null	Region of Uganda
district	string or null	e.g. Masaka, Mbarara, Mbale, Kasese, Arua
contact	string or null	Normalised to +256 format; hidden until "Express interest"
notes	string or null	Short extra details
missing_fields	string[]	Fields the AI could not find
Tech Stack
Frontend: plain HTML, CSS, and vanilla JavaScript (no build step)
AI: Gemma 4 via Google AI Studio, isolated in a single function so the model can be swapped
Design: prototyped in Google Stitch, then refined in AI Studio
Storage: localStorage with mock data (no backend in the MVP)
Design Principles
Mobile-first: works at 360px width with no horizontal scrolling.
Low bandwidth: minimal images, light assets, few dependencies.
Readable outdoors: high contrast (WCAG AA) and touch targets of at least 44px.
Earthy and friendly: coffee browns, fresh greens, and warm creams, with CSS variables and named colours.
Translation-ready: short, plain English copy that can be translated into Luganda, Runyankole, Swahili, and more.
Getting Started

No installation or build step is needed.

bash
# 1. Clone the repository
git clone https://github.com/<your-org>/kawalink.git
cd kawalink

# 2. Open the app
# Double-click index.html, or serve it locally:
python3 -m http.server 8000
# then visit http://localhost:8000
Connecting the AI
Get an API key from Google AI Studio.
Add it where the extraction function expects it (see the comments in the AI function in script.js).
Never commit your API key. For anything beyond a demo, call the model from a small backend instead of the browser.
Project Structure
kawalink/
├── index.html      # App layout and screens
├── style.css       # Styles, with CSS variables
├── script.js       # App logic, filters, and the isolated AI extraction function
├── data/
│   └── mock-listings.json   # Sample listings
└── README.md

Adjust this to match your final file layout.

Acceptance Tests
 Pasting the example message produces: Robusta, kiboko, 300 kg, Masaka, 4,500 UGX/kg.
 Filtering by region and variety shows only matching listings.
 Contact details stay hidden until "Express interest" is clicked.
 If the AI call fails, the manual form still lets the user post.
 The page works at 360px width with no horizontal scrolling.
Known Limitations
Uses mock data and localStorage, so there are no shared accounts or real-time sync yet.
No payments or verification. Users should agree price and quality before sending money.
AI extraction can make mistakes, so users review every listing before posting.
Roadmap
 Real backend and authentication
 Match suggestions (buyers and sellers by region and variety)
 Regional price transparency board
 Community Q&A and advisory (pests, disease, quality)
 Local-language support
 Mobile money integration
 Cooperative and verified-seller profiles
Team

Built by a team of five at Hacktoberfest 2026, MUBS Nakawa.

Name	Role
Name	Prompt and AI lead
Name	Frontend
Name	Frontend and UX
Name	Data and content
Name	Pitch and integration
Contributing

Contributions are welcome, especially during Hacktoberfest!

Fork the repo
Create a branch: git checkout -b feature/your-feature
Commit your changes: git commit -m "Add your feature"
Push the branch: git push origin feature/your-feature
Open a pull request

Please keep code simple, readable, and mobile-friendly.

License

This project is licensed under the MIT License. See LICENSE for details.

Acknowledgements
Makerere University Business School (MUBS) and the Web3 Club
Major League Hacking (MLH)
Google AI Studio and Gemma
Uganda's coffee farmers and traders, whom this project hopes to serve
