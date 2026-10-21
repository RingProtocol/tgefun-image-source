# TGE.FUN Image Source

Long-term image archive for TGE.FUN after the Pinata gateway is retired.

Images are stored as `images/<CID>.<extension>`. `cid-map.json` maps every available IPFS CID to its exact filename, allowing the frontend to use a single configurable base URL without changing database records.

## Regenerate

```bash
node export-images.mjs /absolute/path/to/a/complete/backup
```

The exporter deduplicates by CID and stops if the same CID unexpectedly resolves to different file content.
