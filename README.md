# Crawsla

Aggregated Tesla used-car listings scraped from multiple French and European marketplaces. React frontend, FastAPI backend, SQLite storage.

## Features

- Listings page with sidebar filters (model, price range, year) and sort (price, mileage, year, crawl date)
- Infinite scroll with debounced filter updates
- Detail page with photo carousel and per-listing price history chart
- Trends page with average price evolution per model over time
- Price change tracking — new history entry recorded on each price update
- Tesla referral code automatically appended to all Tesla listing URLs

## Sources

| Source | Method |
|---|---|
| [Leboncoin](https://www.leboncoin.fr) | Playwright — intercepts internal JSON API (Datadome protected) |
| [GMECars](https://www.gmecars.fr) | HTTP + HTML parsing (no browser needed) |
| [CapCar](https://www.capcar.fr) | Algolia API (no browser needed) |
| [Tesla](https://www.tesla.com/fr_FR/inventory) | `tesla-inventory` npm package — fetches new and used inventory |

## Stack

- **Backend** — Python 3.12, FastAPI, SQLAlchemy, SQLite, Playwright
- **Frontend** — React 18, TypeScript, Vite 7
- **Tesla scraper** — Node.js (`tesla-inventory` npm package)

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

### Node scrapers (Tesla)

```bash
cd backend
npm install
```

## Usage

### Start dev servers

```bash
./dev.sh
```

Backend runs on `http://localhost:8000`, frontend on `http://localhost:5173`.

Optionally scrape before starting:

```bash
./dev.sh --scrape-first leboncoin
```

### Run scrapers

```bash
./scrape.sh <source> [options]
```

| Command | Description |
|---|---|
| `./scrape.sh leboncoin` | Scrape Leboncoin (1 page) |
| `./scrape.sh leboncoin --pages 3` | Scrape multiple pages |
| `./scrape.sh gmecars` | Scrape GMECars |
| `./scrape.sh capcar` | Scrape CapCar via Algolia |
| `./scrape.sh capcar --pages 10` | Scrape up to 10 pages (50 results/page) |
| `./scrape.sh tesla` | Fetch all Tesla models (new + used) |
| `./scrape.sh tesla --models m3,my` | Fetch specific models only |

Add `--debug` to any Playwright-based scraper to open a visible browser window, save a screenshot, and dump captured API payloads to `backend/debug/`.

### Reset the database

```bash
rm backend/crawsla.db
```

The schema is recreated automatically on the next scraper or server start.

## API

| Endpoint | Description |
|---|---|
| `GET /api/listings` | Paginated listing search with filters |
| `GET /api/listings/{id}` | Single listing detail |
| `GET /api/listings/{id}/photos` | Photo URLs for a listing |
| `GET /api/listings/{id}/price-history` | Price history points |
| `GET /api/trends` | Average price per model per day |
| `GET /api/stats` | Total count and breakdown by source |

### `/api/listings` query params

| Param | Type | Description |
|---|---|---|
| `model` | string | Filter by model (e.g. `Model 3`, `Model Y`) |
| `min_price` / `max_price` | int | Price range in € |
| `min_year` / `max_year` | int | Registration year range |
| `source` | string | Filter by source (e.g. `tesla`, `leboncoin`) |
| `sort_by` | string | `scraped_at`, `price`, `mileage_km`, `year` |
| `sort_dir` | string | `asc` or `desc` |
| `limit` / `offset` | int | Pagination (default limit: 50, max: 1000) |
