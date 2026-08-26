# Investment Tracker

Aplicação para acompanhar investimentos pessoais (ações, FIIs, ETFs, cripto, reserva de emergência), com registro de posições, dividendos, aportes e índices de mercado.

## Stack

- **Backend**: Django + Django REST Framework (`invesmenttracker/`)
- **Frontend**: React + Vite + Tailwind CSS (`frontend/`)

## Rodando o backend

```bash
cd invesmenttracker
python -m venv .venv
source .venv/bin/activate
pip install django djangorestframework django-cors-headers requests yfinance
python manage.py migrate
python manage.py runserver
```

API disponível em `http://localhost:8000/api/`.

## Rodando o frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação disponível em `http://localhost:5173`.

## Funcionalidades

- **Dashboard**: patrimônio total, dividendos e aportes mensais (média 12 meses)
- **Índices**: acompanhamento de BTC, S&P500, Bovespa, IFIX, inflação e índice composto ponderado
- **Dividendos**: histórico de proventos recebidos por ativo
- **Patrimônio**: evolução patrimonial ao longo do tempo
- **Recomendações**: sugestão de alocação de aportes
- **Registros**: histórico de todos os lançamentos (posições, índices, dividendos), com edição e exclusão
- **Registrar Movimentação**: compra, venda ou atualização de posição de um ativo, com controle de quantidade e preço médio
