# S3 CORS Configuration

StrollBar uploads files directly from the browser to the presigned `uploadUrl` returned by the backend. The bucket must therefore allow the browser origin on the storage service itself. `CORS_ORIGINS` in the NestJS backend only applies to API requests and does not configure the bucket.

Apply this policy to the bucket named by `S3_BUCKET_NAME`. Replace or remove origins that are not used by the deployment. Origins must contain only the scheme and host, without a path or trailing slash.

```json
[
	{
		"AllowedOrigins": ["https://peterciprian.github.io", "http://localhost:4200", "http://127.0.0.1:4200"],
		"AllowedMethods": ["GET", "PUT", "HEAD"],
		"AllowedHeaders": ["Content-Type", "x-amz-*", "x-amz-checksum-*"],
		"ExposeHeaders": ["ETag"],
		"MaxAgeSeconds": 3600
	}
]
```

For AWS S3, apply it with:

```bash
aws s3api put-bucket-cors --bucket "$S3_BUCKET_NAME" --cors-configuration file://docs/s3-cors.json
```

For Cloudflare R2, configure the equivalent CORS rules for the R2 bucket in the R2 dashboard or with the R2 S3-compatible API. For MinIO, apply the equivalent rule with `mc cors set`.

After applying the policy, retry the upload from the exact frontend origin shown in the browser address bar. A GitHub Pages path such as `/StrollBar/` is not part of the allowed origin; the allowed origin remains `https://peterciprian.github.io`.

The frontend intentionally sends the signed `Content-Type` header with the `PUT`, so removing that header in the browser is not a reliable fix: the presigned URL may require it and the bucket still needs to allow the preflight request.
