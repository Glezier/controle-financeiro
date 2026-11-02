# CA pública do Supabase

`prod-ca-2021.crt` contém o certificado público Supabase Root 2021 CA.
Ele pode ser versionado: não contém senha, token ou chave privada.

Origem do arquivo:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

Orientação oficial:
https://supabase.com/docs/guides/platform/ssl-enforcement

Para a conexão local com o pooler, acrescente à URL do banco no `.env`:

```text
?sslmode=verify-full&sslrootcert=certs/prod-ca-2021.crt
```

Se a URL já tiver parâmetros, use `&` antes de `sslrootcert`, mantendo
`sslmode=verify-full`. Execute os scripts npm dentro de `backend`, pois o caminho
é relativo ao diretório de execução. Se usar `DIRECT_URL`, configure a CA nela
também quando o servidor exigir esse certificado.

Após alterar o `.env`, reinicie a API. `tsx watch` pode não recarregar mudanças
somente nas variáveis de ambiente. `npm run db:status` deve informar que o esquema
está atualizado. O `.env` continua fora do Git.

O certificado precisa acompanhar o backend no deploy, com `sslrootcert` apontando
para o arquivo disponível no ambiente de execução. A verificação do certificado
e do hostname permanece habilitada.
