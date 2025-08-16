#!/usr/bin/env node
import { readdir, stat as fsStat, readFile } from 'node:fs/promises';
import { extname, resolve, join } from 'node:path';
import process from 'node:process';
import exifr from 'exifr';

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.JPG', '.JPEG']);

function parseArgs(argv) {
  const args = { inputs: [], help: false, pretty: false, ndjson: false, geojson: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--pretty') args.pretty = true;
    else if (a === '--ndjson') args.ndjson = true;
    else if (a === '--geojson') args.geojson = true;
    else args.inputs.push(a);
  }
  return args;
}

async function walkDirectory(directoryPath, fileAccumulator) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(entryPath, fileAccumulator);
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name))) {
      fileAccumulator.push(entryPath);
    }
  }
}

async function findAllJpegFiles(inputPaths) {
  const files = [];
  for (const p of inputPaths) {
    const resolved = resolve(p);
    const st = await fsStat(resolved);
    if (st.isDirectory()) {
      await walkDirectory(resolved, files);
    } else if (st.isFile() && SUPPORTED_EXTENSIONS.has(extname(resolved))) {
      files.push(resolved);
    }
  }
  return files;
}

async function extractCoordinatesFromFile(filePath) {
  try {
    const buffer = await readFile(filePath);
    const gps = await exifr.gps(buffer);
    if (!gps || gps.latitude == null || gps.longitude == null) {
      return { file: filePath, hasGPS: false, latitude: null, longitude: null, altitude: null };
    }
    return {
      file: filePath,
      hasGPS: true,
      latitude: gps.latitude,
      longitude: gps.longitude,
      altitude: gps.altitude ?? null,
    };
  } catch (error) {
    return { file: filePath, hasGPS: false, latitude: null, longitude: null, altitude: null, error: String(error) };
  }
}

function printResults(results, { ndjson, pretty }) {
  if (ndjson) {
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r));
    }
    return;
  }
  const json = JSON.stringify(results, null, pretty ? 2 : 0);
  // eslint-disable-next-line no-console
  console.log(json);
}

function toGeoJSON(results) {
  const features = results
    .filter((r) => r && r.hasGPS && r.latitude != null && r.longitude != null)
    .map((r) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [r.longitude, r.latitude],
      },
      properties: {
        file: r.file,
        altitude: r.altitude ?? null,
      },
    }));
  return { type: 'FeatureCollection', features };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    // eslint-disable-next-line no-console
    console.log(`Usage:\n  node scripts/extract-gps.mjs [options] <path ...>\n\nOptions:\n  --ndjson           Output Newline-Delimited JSON (default: JSON array)\n  --geojson          Output GeoJSON FeatureCollection (Points for images with GPS)\n  --pretty           Pretty-print JSON/GeoJSON array\n  -h, --help         Show this help\n\nExamples:\n  node scripts/extract-gps.mjs ./photos\n  node scripts/extract-gps.mjs ./public --ndjson\n  node scripts/extract-gps.mjs ./public --geojson --pretty\n`);
    process.exit(0);
  }

  const inputs = args.inputs.length ? args.inputs : ['.'];
  const files = await findAllJpegFiles(inputs);
  if (files.length === 0) {
    // eslint-disable-next-line no-console
    console.error('No JPEG files found in provided paths.');
    process.exit(2);
  }

  const results = [];
  for (const filePath of files) {
    results.push(await extractCoordinatesFromFile(filePath));
  }

  if (args.geojson) {
    const fc = toGeoJSON(results);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(fc, null, args.pretty ? 2 : 0));
    return;
  }

  printResults(results, { ndjson: args.ndjson, pretty: args.pretty });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


