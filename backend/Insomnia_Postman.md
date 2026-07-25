# Testes manuais da API

## Health check

```
GET http://localhost:3333/api/health
```

## Listar empresas

```
GET http://localhost:3333/api/companies
```

## Conversar com a IA

```
POST http://localhost:3333/api/chat
Content-Type: application/json

{
  "companySlug": "technova",
  "question": "Voces entregam em Curitiba?"
}
```

Trocar `companySlug` para `clinica-sorriso` demonstra a persona mudando
sem nenhuma alteracao no codigo.

## Casos de erro esperados

| Corpo enviado | Status |
|---|---|
| `{ "question": "" }` | 400 |
| `{ "companySlug": "xyz", "question": "oi" }` | 404 |
