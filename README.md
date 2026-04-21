# Crawsla

Aggregated Tesla used-car listings scraped daily from multiple French and European sources, with a React frontend and a FastAPI backend.

## Sources

| Source | Method |
|---|---|
| [LaCentrale](https://www.lacentrale.fr) | Playwright (headless browser) |
| [Leboncoin](https://www.leboncoin.fr) | Playwright (headless browser) |
| [GMECars](https://www.gmecars.fr) | HTTP + HTML parsing |
| [Mobile.de](https://www.mobile.de) | Playwright (headless browser) |
| [Tesla](https://www.tesla.com/fr_FR/inventory) | tesla-inventory npm package |
| [CapCar](https://www.capcar.fr) | Algolia API |

## Stack

- **Backend** — Python 3.12, FastAPI, SQLAlchemy, SQLite, Playwright
- **Frontend** — React 18, TypeScript, Vite
- **Scraper runner** — Node.js (Tesla), Python (all others)

## Setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
playwright install chromium
```

### Frontend

```bash
cd frontend
npm install
```

### Node scrapers

```bash
cd backend
npm install
```

## Usage

### Start everything

```bash
./dev.sh
```

Opens the backend on `http://localhost:8000` and the frontend on `http://localhost:5173`.

Optionally run a scraper before starting:

```bash
./dev.sh --scrape-first leboncoin
```

### Run scrapers manually

```bash
./scrape.sh <source> [options]

./scrape.sh leboncoin --pages 3
./scrape.sh lacentrale
./scrape.sh gmecars
./scrape.sh mobile-de
./scrape.sh tesla
./scrape.sh tesla --models m3,my
./scrape.sh capcar
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/listings` | List listings with filters and sorting |
| `GET /api/listings/{id}` | Single listing detail |
| `GET /api/listings/{id}/price-history` | Price history for a listing |
| `GET /api/stats` | Total count by source |

Query params for `/api/listings`: `model`, `min_price`, `max_price`, `min_year`, `source`, `sort_by`, `sort_dir`, `limit`, `offset`.
