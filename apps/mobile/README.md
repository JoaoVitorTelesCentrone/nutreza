# Nutreza Paciente

Aplicativo Expo/React Native conectado ao mesmo Supabase da aplicação web.

## Ambiente local

Copie `.env.example` para `.env.local` e informe a URL e a chave pública do Supabase. Em dispositivo físico, a URL deve usar o IP da máquina na rede, não `127.0.0.1`.

```powershell
pnpm dev:mobile
```

Conta demo após executar `pnpm seed:demo` na raiz:

- E-mail: `paciente@nutreza.local`
- Senha: `PacienteNutreza2026!`

## Qualidade

```powershell
pnpm --filter @nutreza/mobile lint
pnpm --filter @nutreza/mobile typecheck
pnpm doctor:mobile
pnpm build:mobile
```
