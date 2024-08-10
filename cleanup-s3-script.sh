echo 'Bucket and files to keep:'
echo $BUCKET_NAME
echo $FILES_TO_KEEP

# Defina suas variáveis
BUCKET_NAME="$BUCKET_NAME"
FILES_TO_KEEP="$FILES_TO_KEEP" # Número de arquivos que você quer manter

echo $(aws s3api list-objects-v2 --bucket filesbackups --output text | sort -k3)

FILES=$(aws s3api list-objects-v2 --bucket "$BUCKET_NAME" --output text | sort -k3 )

# Contar o número de arquivos no bucket
FILE_COUNT=$(echo "$FILES" | wc -l)

echo "$FILE_COUNT arquivos encontrados no bucket $BUCKET_NAME."

# Verifique se o número de arquivos é maior que o número de arquivos a manter
if [ "$FILE_COUNT" -gt "$FILES_TO_KEEP" ]; then
  # Calcule o número de arquivos a excluir
  FILES_TO_DELETE=$((FILE_COUNT - FILES_TO_KEEP))

  echo "Excluindo $FILES_TO_DELETE arquivos mais antigos."

  # Obtenha os arquivos mais antigos e os exclua
  echo "$FILES" | head -n "$FILES_TO_DELETE" | awk '{print $3}' | while read -r FILE; do
    echo "Excluindo $FILE do bucket $BUCKET_NAME"
    aws s3 rm "s3://$BUCKET_NAME/$FILE"
  done

  echo "Limpeza concluída. Mantidos os últimos $FILES_TO_KEEP arquivos."
else
  echo "Nenhum arquivo excluído. O bucket contém $FILE_COUNT arquivos, que é menos ou igual a $FILES_TO_KEEP."
fi