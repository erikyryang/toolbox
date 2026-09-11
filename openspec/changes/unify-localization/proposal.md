## Why

Textos estão divididos entre traduções de catálogo, condicionais em componentes e mensagens fixas em português nos motores e transporte HTTP. Isso permite que a interface em inglês apresente erros em outro idioma.

## What Changes

- Introduzir catálogo tipado de mensagens de interface e feedback em português e inglês.
- Usar códigos e parâmetros para erros conhecidos, traduzindo-os na apresentação e preservando posições.
- Migrar textos de componentes e mensagens de execução para uma política única de tradução com fallback legível.

## Capabilities

### New Capabilities

- `localized-feedback`: Introduzir catálogo tipado de mensagens de interface e feedback em português e inglês.

### Modified Capabilities

Nenhuma alteração adicional de requisitos existentes fora dos deltas já identificados no design.

## Impact

web/src/lib/i18n e novos módulos de mensagens, componentes, engines/errors, engines, operations/run/types, compression/backend e comunicação de erros do Worker. O backend Go pode manter mensagens legadas: o cliente trata status/códigos e usa fallback localizado sem depender do texto remoto.

Branch: `refactor/typed-localization`. Base: `main@9fc33af`. Esta melhoria terá PR próprio.

