# 💧 Water Manager API

API RESTful para controle de hidratação diária, construída com **NestJS**, **PostgreSQL** e **TypeScript**.

Permite registrar consumo de água, definir metas de hidratação e gerar relatórios de consumo por período. 

Esse projeto foi mais para praticar consultas SQL manuais

---

## Stack Tecnológica

| Camada         | Tecnologia                   | Versão    |
| -------------- | ---------------------------- | --------- |
| Runtime        | Node.js                      | 18+       |
| Framework      | NestJS                       | 11.x      |
| Linguagem      | TypeScript                   | 5.7       |
| Banco de Dados | PostgreSQL                   | 15+       |
| Driver DB      | pg (node-postgres)           | 8.22      |
| Validação      | class-validator              | 0.15      |
| Transformação  | class-transformer            | 0.5       |
| Container      | Docker (PostgreSQL)          | —         |

---

## Arquitetura

O projeto segue a **arquitetura modular do NestJS**, onde cada domínio é isolado em seu próprio módulo com controller, service e DTOs.

```
water-manager-api/
├── src/
│   ├── database/                   # Módulo de banco de dados
│   │   ├── migrations/             # Scripts SQL de migração
│   │   │   ├── 001_initial.sql     # Schema inicial (users, hydration_goals, water_entries)
│   │   │   └── 002_water_entries_uuid.sql  # Migração: id → UUID
│   │   ├── database.module.ts
│   │   └── database.service.ts     # Pool de conexão (pg.Pool)
│   │
│   ├── water-entries/              # Módulo de registros de água
│   │   ├── dto/
│   │   │   └── create-water-entry.dto.ts
│   │   ├── water-entries.controller.ts
│   │   ├── water-entries.module.ts
│   │   └── water-entries.service.ts
│   │
│   ├── hydration-goals/            # Módulo de metas de hidratação
│   │   ├── dto/
│   │   │   ├── create-hydration-goal.dto.ts
│   │   │   └── update-hydration-goal.dto.ts
│   │   ├── hydration-goals.controller.ts
│   │   ├── hydration-goals.module.ts
│   │   └── hydration-goals.service.ts
│   │
│   ├── reports/                    # Módulo de relatórios
│   │   ├── dto/
│   │   │   └── report-query.dto.ts
│   │   ├── reports.controller.ts
│   │   ├── reports.module.ts
│   │   └── reports.service.ts
│   │
│   ├── app.module.ts               # Módulo raiz
│   ├── app.controller.ts
│   ├── app.service.ts
│   └── main.ts                     # Bootstrap da aplicação
│
├── frontend/
│   └── index.html                  # Interface web (HTML + Tailwind CSS)
│
├── .env                            # Variáveis de ambiente
├── package.json
└── tsconfig.json
```

---

## Banco de Dados

### Diagrama ER

```mermaid
erDiagram
    users {
        INTEGER id PK
        VARCHAR name
        VARCHAR email UK
        VARCHAR password_hash
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    water_entries {
        UUID id PK
        INTEGER user_id FK
        INTEGER amount_ml
        TIMESTAMPTZ consumed_at
        TIMESTAMPTZ created_at
    }

    hydration_goals {
        INTEGER id PK
        INTEGER user_id FK
        INTEGER daily_amount_ml
        DATE starts_at
        DATE ends_at
    }

    users ||--o{ water_entries : "registra"
    users ||--o{ hydration_goals : "define"
```

### Tabelas

#### `users`

| Coluna          | Tipo           | Restrições                        |
| --------------- | -------------- | --------------------------------- |
| `id`            | `INTEGER`      | PK, GENERATED ALWAYS AS IDENTITY  |
| `name`          | `VARCHAR(100)` | NOT NULL                          |
| `email`         | `VARCHAR(150)` | NOT NULL, UNIQUE                  |
| `password_hash` | `VARCHAR(255)` | NOT NULL                          |
| `created_at`    | `TIMESTAMPTZ`  | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at`    | `TIMESTAMPTZ`  | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

#### `water_entries`

| Coluna        | Tipo          | Restrições                        |
| ------------- | ------------- | --------------------------------- |
| `id`          | `UUID`        | PK, DEFAULT `gen_random_uuid()`   |
| `user_id`     | `INTEGER`     | NOT NULL, FK → `users.id` ON DELETE CASCADE |
| `amount_ml`   | `INTEGER`     | NOT NULL, CHECK (`> 0`)           |
| `consumed_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `created_at`  | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**Índices:** `(user_id, consumed_at)` — otimiza consultas por período.

#### `hydration_goals`

| Coluna           | Tipo      | Restrições                        |
| ---------------- | --------- | --------------------------------- |
| `id`             | `INTEGER` | PK, GENERATED ALWAYS AS IDENTITY  |
| `user_id`        | `INTEGER` | NOT NULL, FK → `users.id` ON DELETE CASCADE |
| `daily_amount_ml`| `INTEGER` | NOT NULL, CHECK (`> 0`)           |
| `starts_at`      | `DATE`    | NOT NULL, DEFAULT CURRENT_DATE    |
| `ends_at`        | `DATE`    | NULL, CHECK (`>= starts_at`)      |

**Índices:** `(user_id, starts_at DESC)` — otimiza busca da meta ativa.

### Migrações

As migrações ficam em `src/database/migrations/` e são executadas manualmente:

```bash
# Via Docker
Get-Content src/database/migrations/001_initial.sql | docker exec -i water-manager-postgres psql -U postgres -d water_manager
```

| Arquivo                        | Descrição                              |
| ------------------------------ | -------------------------------------- |
| `001_initial.sql`              | Schema inicial com as 3 tabelas        |
| `002_water_entries_uuid.sql`   | Altera `water_entries.id` para UUID    |

---

## Configuração do Ambiente

### Variáveis de Ambiente (`.env`)

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/water_manager
```

### Pré-requisitos

- Node.js 18+
- Docker (para o PostgreSQL)

### Setup

```bash
# 1. Subir o PostgreSQL
docker run -d \
  --name water-manager-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=water_manager \
  -p 5433:5432 \
  postgres:15

# 2. Instalar dependências
cd water-manager-api
npm install

# 3. Executar migrações
Get-Content src/database/migrations/001_initial.sql | docker exec -i water-manager-postgres psql -U postgres -d water_manager
Get-Content src/database/migrations/002_water_entries_uuid.sql | docker exec -i water-manager-postgres psql -U postgres -d water_manager

# 4. Iniciar em modo de desenvolvimento
npm run start:dev
```

A API estará disponível em `http://localhost:3000/api`.

---

## Endpoints da API

Todos os endpoints utilizam o prefixo `/api`.

### Water Entries

| Método | Rota                        | Descrição                         |
| ------ | --------------------------- | --------------------------------- |
| `POST` | `/api/water-entries`        | Registrar consumo de água         |
| `GET`  | `/api/water-entries/today`  | Listar registros do dia           |
| `GET`  | `/api/water-entries/today/total` | Total consumido hoje         |

#### `POST /api/water-entries`

```json
// Request Body
{
  "amountMl": 300
}

// Response 201
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "user_id": 1,
  "amount_ml": 300,
  "consumed_at": "2026-07-20T23:30:00.000Z",
  "created_at": "2026-07-20T23:30:00.000Z"
}
```

#### `GET /api/water-entries/today/total`

```json
// Response 200
{
  "totalMl": 1800
}
```

---

### Hydration Goals

| Método  | Rota                             | Descrição                    |
| ------- | -------------------------------- | ---------------------------- |
| `POST`  | `/api/hydration-goals`           | Criar meta de hidratação     |
| `GET`   | `/api/hydration-goals/current`   | Meta ativa do usuário        |
| `PATCH` | `/api/hydration-goals/:id`       | Atualizar uma meta           |
| `GET`   | `/api/hydration-goals/progress`  | Progresso do dia vs meta     |

#### `POST /api/hydration-goals`

```json
// Request Body
{
  "dailyAmountMl": 3000,
  "startsAt": "2026-07-01",   // opcional
  "endsAt": "2026-12-31"      // opcional
}

// Response 201
{
  "id": 1,
  "user_id": 1,
  "daily_amount_ml": 3000,
  "starts_at": "2026-07-01",
  "ends_at": "2026-12-31"
}
```

#### `GET /api/hydration-goals/progress`

```json
// Response 200
{
  "goal": {
    "id": 1,
    "dailyAmountMl": 3000,
    "startsAt": "2026-07-01",
    "endsAt": null
  },
  "today": {
    "consumedMl": 1800,
    "remainingMl": 1200,
    "percentage": 60
  }
}
```

---

### Reports

| Método | Rota                   | Descrição                        |
| ------ | ---------------------- | -------------------------------- |
| `GET`  | `/api/reports/summary` | Resumo de consumo por período    |
| `GET`  | `/api/reports/daily`   | Consumo diário detalhado         |

Ambos recebem os query params `startDate` e `endDate` (formato ISO: `YYYY-MM-DD`).

#### `GET /api/reports/summary?startDate=2026-07-01&endDate=2026-07-20`

```json
// Response 200
{
  "totalMl": 45000,
  "totalEntries": 120,
  "averageMlPerDay": 2250,
  "startDate": "2026-07-01",
  "endDate": "2026-07-20"
}
```

#### `GET /api/reports/daily?startDate=2026-07-18&endDate=2026-07-20`

```json
// Response 200
[
  { "date": "2026-07-18", "totalMl": 2500, "entries": 8 },
  { "date": "2026-07-19", "totalMl": 1800, "entries": 5 },
  { "date": "2026-07-20", "totalMl": 2200, "entries": 7 }
]
```

---

## Validação

A API utiliza **ValidationPipe** global com as seguintes configurações:

| Opção                    | Valor  | Descrição                                      |
| ------------------------ | ------ | ---------------------------------------------- |
| `whitelist`              | `true` | Remove propriedades não declaradas no DTO       |
| `forbidNonWhitelisted`   | `true` | Retorna erro 400 se houver campos desconhecidos |
| `transform`              | `true` | Converte tipos automaticamente                  |

Erros de validação retornam status `400` com detalhes:

```json
{
  "statusCode": 400,
  "message": ["amountMl must not be less than 1"],
  "error": "Bad Request"
}
```

---

## Conexão com o Banco

O `DatabaseService` gerencia o pool de conexões via `pg.Pool`:

- Conecta automaticamente no `onModuleInit` do NestJS
- Utiliza a variável `DATABASE_URL` para a connection string
- Expõe o método genérico `query<T>(text, params)` para queries tipadas

---

## Frontend

O frontend é uma SPA em **HTML + JavaScript + Tailwind CSS** (CDN), localizado em `frontend/index.html`.

Funcionalidades:
- Anel de progresso circular com a porcentagem diária
- Botões rápidos para adicionar água (100, 200, 300, 500 ml)
- Listagem dos registros do dia
- Gerenciamento de metas de hidratação
- Relatórios com seleção de período e gráfico de barras

Para usar, basta abrir `frontend/index.html` no navegador com o backend rodando.

---

## Scripts Disponíveis

```bash
npm run start:dev       # Desenvolvimento com hot-reload
npm run start           # Produção (sem watch)
npm run build           # Build para produção
npm run lint            # Linting com ESLint
npm run format          # Formatação com Prettier
npm run test            # Testes unitários
npm run test:e2e        # Testes end-to-end
```

---

## Licença

UNLICENSED — Projeto privado.
