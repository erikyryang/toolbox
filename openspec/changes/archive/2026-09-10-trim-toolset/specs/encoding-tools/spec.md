## REMOVED Requirements

### Requirement: Hex
**Reason**: A operação não está no catálogo. O motor `hex.ts` e seus testes foram removidos em `30cfe67`, e a entrada correspondente saiu de `encoding-catalog.ts`.
**Migration**: Nenhuma. Não há dado nem preferência guardada; a rota `/hex` deixou de ser gerada e responde 404 como qualquer slug inexistente.

### Requirement: URL e percent-encoding
**Reason**: A operação não está no catálogo. O motor `url.ts` permanece no repositório sem rota que o alcance e é removido pelas tarefas desta change.
**Migration**: Nenhuma. `encodeURIComponent` e `decodeURIComponent` do próprio navegador cobrem o caso.

### Requirement: HTML entities
**Reason**: A operação não está no catálogo. O motor `html-entities.ts` permanece sem rota e é removido pelas tarefas desta change.
**Migration**: Nenhuma.

### Requirement: Decodificação de JWT
**Reason**: A operação não está no catálogo. O motor `jwt.ts` e seus testes foram removidos em `30cfe67`.
**Migration**: Nenhuma. A decodificação de um JWT continua possível pela operação Base64 URL-safe, aplicada a cada segmento do token.

### Requirement: Unicode escape
**Reason**: A operação não está no catálogo. O motor `unicode-escape.ts` foi removido em `30cfe67`.
**Migration**: Nenhuma.

### Requirement: Punycode
**Reason**: A operação não está no catálogo. O motor `punycode-idna.ts` permanece sem rota e é removido pelas tarefas desta change, junto com a dependência `punycode` do `package.json`.
**Migration**: Nenhuma.

### Requirement: Unix timestamp
**Reason**: A operação não está no catálogo. O motor `timestamp.ts` permanece sem rota e é removido pelas tarefas desta change.
**Migration**: Nenhuma.

### Requirement: Query string
**Reason**: A operação não está no catálogo. O motor `query-string.ts` foi removido em `30cfe67`.
**Migration**: Nenhuma. `URLSearchParams` do próprio navegador cobre o caso.

### Requirement: Conversão de charset UTF-8 e Latin-1
**Reason**: A operação não está no catálogo. O motor `charset.ts` foi removido em `30cfe67`.
**Migration**: Nenhuma.

### Requirement: Conversão PEM e DER
**Reason**: A operação não está no catálogo. O motor `pem-der.ts` permanece sem rota e é removido pelas tarefas desta change.
**Migration**: Nenhuma. A conversão continua possível pela operação Base64 padrão, aplicada ao corpo entre as linhas `-----BEGIN-----` e `-----END-----`.

### Requirement: Parser ASN.1
**Reason**: A operação não está no catálogo. O motor `asn1.ts` permanece sem rota e é removido pelas tarefas desta change.
**Migration**: Nenhuma.
