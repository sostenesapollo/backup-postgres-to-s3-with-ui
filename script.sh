curl 'https://whatsapp-api-production-38c5.up.railway.app/api/v1/message' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'cache-control: no-cache' \
  -H 'content-type: application/json' \
  -H 'origin: https://pedegas.com' \
  -H 'pragma: no-cache' \
  -H 'priority: u=1, i' \
  -H 'referer: https://pedegas.com/' \
  -H 'sec-ch-ua: "Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'sec-gpc: 1' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36' \
  --data-raw '{"chat":"apollogas2","message":{"type":"text","text":"✅ Backup realizado com sucesso.\n\n*File:*\n\n*$file*\n\nDevice:\n\n*$device*"},"phone":"5599988284904"}'

# Create immich dump file
docker exec -t immich_postgres pg_dumpall --clean --if-exists --username=postgres | gzip > "/home/sostenes/immich-dump.tar.gz"

# Upload immich file to s3
curl --location 'http://localhost:8080/files' \
--header 'Content-Type: application/json' \
--header 'User-Agent: insomnia/8.6.1' \
--data '{
	"filePath": "/home/sostenes/immich-dump.tar.gz",
    "bucket": "immichbackups",
    "key": "immich-dump.tar.gz"
}'

# Remove local File
rm -rf /home/sostenes/immich-dump.tar.gz