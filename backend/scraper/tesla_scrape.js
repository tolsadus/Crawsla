'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const createTeslaInventory = require('tesla-inventory')
const { Pool } = require('pg')

const MODELS = ['m3', 'my', 'ms', 'mx']
const CONDITIONS = ['new', 'used']
const MODEL_NAMES = { m3: 'Model 3', my: 'Model Y', ms: 'Model S', mx: 'Model X' }

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const fetcher = url => fetch(url).then(res => res.text())
const teslaInventory = createTeslaInventory(fetcher)

function compositorImage(model, optionCodeList) {
  if (!optionCodeList) return null
  const params = new URLSearchParams({
    context: 'design_studio_2',
    options: optionCodeList,
    view: 'STUD_3QTR',
    model,
    size: 800,
    bkba_opt: 2,
    crop: '1400,850,300,175',
  })
  return `https://static-assets.tesla.com/configurator/compositor?${params}`
}

function listingUrl(model, vin, condition) {
  return `https://www.tesla.com/fr_FR/${model}/order/${vin}?titleStatus=${condition}&referral=maxime716843`
}

function parseItem(item, model, condition) {
  const vin = item.VIN
  if (!vin) return null

  const price = item.InventoryPrice ?? item.Price ?? item.PurchasePrice ?? null
  const modelName = MODEL_NAMES[model] ?? model
  const trim = item.TrimName ?? null
  const titleParts = ['Tesla', modelName]
  if (trim) titleParts.push(trim)

  const odometer = item.Odometer
  const mileageKm = typeof odometer === 'number' && odometer > 0 ? Math.round(odometer) : 0

  return {
    source: 'tesla',
    external_id: vin,
    title: titleParts.join(' '),
    make: 'Tesla',
    model: modelName,
    version: trim,
    price_eur: typeof price === 'number' ? Math.round(price) : null,
    year: item.Year ?? null,
    mileage_km: mileageKm,
    fuel: 'Électrique',
    gearbox: 'Automatique',
    location: item.MetroName ?? null,
    url: listingUrl(model, vin, condition),
    image_url: compositorImage(model, item.OptionCodeList ?? null),
    _photos: (item.VehiclePhotos || []).map(p => p.imageUrl).filter(Boolean),
  }
}

async function upsertPhotos(client, listingId, photos) {
  if (!photos || photos.length === 0) return
  await client.query('DELETE FROM listing_photos WHERE listing_id = $1', [listingId])
  for (let i = 0; i < photos.length; i++) {
    await client.query(
      'INSERT INTO listing_photos (listing_id, url, sort_order) VALUES ($1, $2, $3)',
      [listingId, photos[i], i]
    )
  }
}

async function upsertListings(listings) {
  const client = await pool.connect()
  const now = new Date().toISOString()

  try {
    await client.query('BEGIN')

    for (const row of listings) {
      const priorRes = await client.query(
        'SELECT id, price_eur FROM listings WHERE source = $1 AND external_id = $2',
        [row.source, row.external_id]
      )
      const prior = priorRes.rows[0] ?? null

      const upsertRes = await client.query(
        `INSERT INTO listings
          (source, external_id, title, make, model, version, price_eur, year, mileage_km,
           fuel, gearbox, location, url, image_url, scraped_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (source, external_id) DO UPDATE SET
           title      = EXCLUDED.title,
           price_eur  = EXCLUDED.price_eur,
           year       = EXCLUDED.year,
           mileage_km = EXCLUDED.mileage_km,
           fuel       = EXCLUDED.fuel,
           gearbox    = EXCLUDED.gearbox,
           location   = EXCLUDED.location,
           url        = EXCLUDED.url,
           image_url  = EXCLUDED.image_url,
           scraped_at = EXCLUDED.scraped_at
         RETURNING id`,
        [
          row.source, row.external_id, row.title, row.make, row.model, row.version,
          row.price_eur, row.year, row.mileage_km, row.fuel, row.gearbox,
          row.location, row.url, row.image_url, now,
        ]
      )

      const id = upsertRes.rows[0].id
      await upsertPhotos(client, id, row._photos)

      const priceChanged = !prior || prior.price_eur !== row.price_eur
      if (priceChanged) {
        await client.query(
          'INSERT INTO price_history (listing_id, price_eur, recorded_at) VALUES ($1, $2, $3)',
          [id, row.price_eur, now]
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

async function main() {
  const args = process.argv.slice(2)
  const models = args.length ? args : MODELS
  let total = 0

  for (const model of models) {
    for (const condition of CONDITIONS) {
      console.log(`[tesla] fetching ${model}/${condition}…`)
      try {
        const results = await teslaInventory('fr', { model, condition })
        console.log(`  -> ${results.length} results`)

        const listings = results.map(item => parseItem(item, model, condition)).filter(Boolean)
        await upsertListings(listings)
        total += listings.length
        console.log(`  -> upserted ${listings.length} listings`)
      } catch (err) {
        console.error(`  ! failed for ${model}/${condition}: ${err.message}`)
      }
    }
  }

  await pool.end()
  console.log(`\nDone. Total upserted: ${total}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
