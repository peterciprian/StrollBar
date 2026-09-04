# S3 CORS Configuration

StrollBar uploads files directly from the browser to the presigned `uploadUrl` returned by the backend. The bucket must therefore allow the browser origin on the storage service itself. `CORS_ORIGINS` in the NestJS backend only applies to API requests and does not configure the bucket.

Apply this policy to the bucket named by `S3_BUCKET_NAME`. Replace or remove origins that are not used by the deployment. Origins must contain only the scheme and host, without a path or trailing slash.

For Backblaze B2, use the bucket CORS rule format from `docs/backblaze-b2-cors.json`:

```json
[
	{
		"corsRuleName": "strollbar-browser-uploads",
		"allowedOrigins": ["https://peterciprian.github.io", "http://localhost:4200", "http://127.0.0.1:4200"],
		"allowedOperations": ["s3_get", "s3_head", "s3_put"],
		"allowedHeaders": ["content-type", "ngsw-bypass", "x-amz-*"],
		"exposeHeaders": ["etag"],
		"maxAgeSeconds": 3600
	}
]
```

In the Backblaze dashboard, open the `strollBar` bucket settings and paste that rule into the CORS rules field. If the preflight still says `No 'Access-Control-Allow-Origin' header`, the CORS rule either was not saved on the same bucket used by the presigned URL, or the origin/header/operation does not match the browser request.

If the Backblaze dashboard only shows presets and the custom option is disabled, use the B2 CLI. The v4 CLI expects the CORS rules as a JSON string:

```powershell
$b2 = "$env:APPDATA\Python\Python312\Scripts\b2.exe"
& $b2 account authorize
& "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe" -c "import os, subprocess, pathlib; b2 = pathlib.Path(os.environ['APPDATA']) / 'Python' / 'Python312' / 'Scripts' / 'b2.exe'; cors = pathlib.Path('docs/backblaze-b2-cors.json').read_text(encoding='utf-8'); raise SystemExit(subprocess.run([str(b2), 'bucket', 'update', 'strollBar', '--cors-rules', cors]).returncode)"
```

The Python wrapper avoids Windows PowerShell stripping JSON quote characters before the B2 CLI receives the `--cors-rules` argument. The command above leaves the current bucket type unchanged; add `allPublic` or `allPrivate` after `strollBar` only if you intentionally want to change it.

For AWS S3-compatible CORS APIs, use this shape from `docs/s3-cors.json`:

```json
[
	{
		"AllowedOrigins": ["https://peterciprian.github.io", "http://localhost:4200", "http://127.0.0.1:4200"],
		"AllowedMethods": ["GET", "PUT", "HEAD"],
		"AllowedHeaders": ["Content-Type", "ngsw-bypass", "x-amz-*", "x-amz-checksum-*"],
		"ExposeHeaders": ["ETag"],
		"MaxAgeSeconds": 3600
	}
]
```

The frontend sends Angular's `ngsw-bypass` header on direct storage uploads so the production service worker does not return a synthetic `504 Gateway Timeout` for the `PUT` request.

For AWS S3, wrap the rule in a `CORSRules` object if your CLI expects the native AWS `put-bucket-cors` shape, then apply it with:

```bash
aws s3api put-bucket-cors --bucket "$S3_BUCKET_NAME" --cors-configuration file://docs/s3-cors.json
```

For Cloudflare R2, configure the equivalent CORS rules for the R2 bucket in the R2 dashboard or with the R2 S3-compatible API. For MinIO, apply the equivalent rule with `mc cors set`.

After applying the policy, retry the upload from the exact frontend origin shown in the browser address bar. A GitHub Pages path such as `/StrollBar/` is not part of the allowed origin; the allowed origin remains `https://peterciprian.github.io`.

The frontend intentionally sends the signed `Content-Type` header with the `PUT`, so removing that header in the browser is not a reliable fix: the presigned URL may require it and the bucket still needs to allow the preflight request.
