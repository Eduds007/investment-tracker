#!/bin/bash

################################################################################
#  SCRIPT PARA INICIAR BACKEND + FRONTEND NO LINUX
################################################################################

set -e  # Sair se algum comando falhar

clear
echo ""
echo "====================================================="
echo "   INICIANDO APLICAÇÃO DE INVESTIMENTOS"
echo "====================================================="
echo ""

# Mostrar ajuda se solicitado
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Uso: $0 [OPÇÕES]"
    echo ""
    echo "Opções:"
    echo "  --verbose, -v    Exibir saída detalhada de instalação"
    echo "  --help, -h       Exibir esta mensagem de ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0                   # Iniciar normalmente"
    echo "  $0 --verbose         # Iniciar com output detalhado"
    echo ""
    exit 0
fi

echo ""

# Definir cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obter o diretório raiz do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar argumentos
VERBOSE=false
if [[ "$1" == "--verbose" ]] || [[ "$1" == "-v" ]]; then
    VERBOSE=true
fi

# Função para exibir erro
show_error() {
    echo -e "${RED}[ERRO] $1${NC}"
    exit 1
}

# Função para exibir sucesso
show_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

# Função para exibir info
show_info() {
    echo -e "${YELLOW}[INFO] $1${NC}"
}

# Função para exibir ação em progresso
show_progress() {
    echo -e "${BLUE}[...] $1${NC}"
}

# Função para exibir debug (apenas se verbose)
show_debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[DEBUG] $1${NC}"
    fi
}

# ===================================================
# 0. Verificar e instalar dependências do sistema
# ===================================================
echo "[0/7] Verificando dependências do sistema..."

# Função para instalar pacote se não existir
install_if_missing() {
    local cmd=$1
    local package=$2
    local install_cmd=$3
    
    if ! command -v "$cmd" &> /dev/null; then
        show_progress "Instalando $package..."
        eval "$install_cmd" || show_error "Falha ao instalar $package"
        show_success "$package instalado"
    fi
}

# Detectar gerenciador de pacotes
if command -v apt-get &> /dev/null; then
    # Debian/Ubuntu
    show_progress "Sistema detectado: Debian/Ubuntu"
    INSTALL_CMD="sudo apt-get update && sudo apt-get install -y"
elif command -v yum &> /dev/null; then
    # Red Hat/CentOS
    show_progress "Sistema detectado: Red Hat/CentOS"
    INSTALL_CMD="sudo yum install -y"
elif command -v pacman &> /dev/null; then
    # Arch
    show_progress "Sistema detectado: Arch Linux"
    INSTALL_CMD="sudo pacman -S --noconfirm"
elif command -v brew &> /dev/null; then
    # macOS (embora script seja para Linux)
    show_progress "Sistema detectado: macOS"
    INSTALL_CMD="brew install"
else
    show_info "Gerenciador de pacotes não detectado. Pulando instalação de dependências do sistema."
fi

# Verificar e instalar Python3
if ! command -v python3 &> /dev/null; then
    show_progress "Instalando Python3..."
    eval "$INSTALL_CMD python3 python3-venv" || show_error "Falha ao instalar Python3"
    show_success "Python3 instalado"
fi

# Verificar e instalar pip
if ! command -v pip3 &> /dev/null; then
    show_progress "Instalando pip3..."
    eval "$INSTALL_CMD python3-pip" || show_error "Falha ao instalar pip3"
    show_success "pip3 instalado"
fi

# Verificar e instalar Node.js/npm
if ! command -v npm &> /dev/null; then
    show_progress "Instalando Node.js e npm..."
    if [ -n "$INSTALL_CMD" ]; then
        eval "$INSTALL_CMD nodejs npm" || show_error "Falha ao instalar Node.js/npm"
        show_success "Node.js e npm instalados"
    else
        show_error "npm não encontrado e não foi possível detectar o gerenciador de pacotes!"
    fi
fi

show_success "Dependências do sistema verificadas"
echo ""

# ===================================================
# 1. Verificar Python
# ===================================================
echo "[1/7] Verificando Python..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
show_success "Python $PYTHON_VERSION encontrado"
echo ""

# ===================================================
# 2. Criar e ativar virtual environment
# ===================================================
echo "[2/7] Configurando ambiente virtual do Backend..."
cd "$SCRIPT_DIR/invesmenttracker"

if [ ! -d ".venv" ]; then
    show_progress "Criando ambiente virtual..."
    python3 -m venv .venv
    show_success "Ambiente virtual criado"
fi

source .venv/bin/activate
show_success "Ambiente virtual ativado"
echo ""

# ===================================================
# 3. Instalar dependências Python
# ===================================================
echo "[3/7] Instalando dependências do Backend..."

# Atualizar pip
show_debug "Atualizando pip, setuptools e wheel..."
pip install -q --upgrade pip setuptools wheel 2>&1 | tail -n +2 || true

# Verificar se requirements.txt existe
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    show_progress "Instalando pacotes do requirements.txt..."
    pip install -q -r "$SCRIPT_DIR/requirements.txt" 2>&1 | tail -n +2 || {
        show_error "Falha ao instalar dependências do requirements.txt"
    }
    show_debug "requirements.txt instalado com sucesso"
else
    show_info "requirements.txt não encontrado, instalando pacotes padrão..."
    
    # Lista de dependências essenciais do Django
    PYTHON_PACKAGES=(
        "django>=4.2"
        "djangorestframework>=3.14"
        "django-cors-headers>=4.0"
    )
    
    show_progress "Instalando pacotes Python..."
    for package in "${PYTHON_PACKAGES[@]}"; do
        show_debug "Instalando $package..."
        pip install -q "$package" 2>&1 || {
            show_error "Falha ao instalar $package"
        }
    done
fi

show_success "Dependências do Backend instaladas com sucesso"
echo ""

# ===================================================
# 4. Aplicar migrations
# ===================================================
echo "[4/7] Aplicando migrações do banco de dados..."
cd "$SCRIPT_DIR/invesmenttracker"
source .venv/bin/activate

# Remover banco de dados antigo se existir (opcional - comentar se quiser manter dados)
# if [ -f "db.sqlite3" ]; then
#     rm -f db.sqlite3
# fi

python3 manage.py migrate
show_success "Banco de dados atualizado com sucesso"
echo ""

# ===================================================
# 5. Instalar dependências Frontend
# ===================================================
echo "[5/7] Instalando dependências do Frontend..."
cd "$SCRIPT_DIR/frontend"

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    show_error "package.json não encontrado em $SCRIPT_DIR/frontend"
fi

# Limpar node_modules corrompidos se necessário (opcional)
# if [ -d "node_modules" ] && [ ! -f "node_modules/.package-lock.json" ]; then
#     show_progress "Limpando node_modules corrompidos..."
#     rm -rf node_modules package-lock.json
# fi

show_progress "Instalando dependências npm..."
if [ "$VERBOSE" = true ]; then
    npm install --legacy-peer-deps
else
    npm install --legacy-peer-deps 2>&1 | grep -E "(added|up to date|npm warn)" || true
fi
show_success "Dependências do Frontend instaladas com sucesso"
echo ""

# ===================================================
# 6. Verificar integridade dos ambientes
# ===================================================
echo "[6/7] Verificando integridade dos ambientes..."
cd "$SCRIPT_DIR/invesmenttracker"
source .venv/bin/activate

show_progress "Verificando Python packages..."
python3 -c "import django; import rest_framework; import corsheaders" 2>/dev/null || show_error "Falha ao importar dependências Python"
show_success "Python packages verificados"

cd "$SCRIPT_DIR/frontend"
show_progress "Verificando npm packages..."
if [ ! -d "node_modules" ]; then
    show_error "node_modules não encontrado após instalação"
fi
show_success "npm packages verificados"
echo ""

# ===================================================
# 7. Iniciar servidores
# ===================================================
echo "[7/7] Iniciando servidores..."
echo ""
show_success "Preparado para iniciar!"
echo ""

# Voltar para raiz
cd "$SCRIPT_DIR"

# Criar arquivo de controle para encerramento limpo
PIDS_FILE="/tmp/investment_tracker_pids.txt"
> "$PIDS_FILE"  # Limpar arquivo

# Função para cleanup ao sair
cleanup() {
    echo ""
    echo -e "${YELLOW}[INFO] Encerrando servidores...${NC}"
    
    # Matar processos em background
    if [ -f "$PIDS_FILE" ]; then
        while read -r PID; do
            if kill -0 "$PID" 2>/dev/null; then
                kill "$PID" 2>/dev/null || true
            fi
        done < "$PIDS_FILE"
        rm -f "$PIDS_FILE"
    fi
    
    echo -e "${GREEN}[OK] Servidores encerrados${NC}"
    exit 0
}

# Configurar trap para Ctrl+C
trap cleanup SIGINT SIGTERM

# Ativar venv para backend
source "$SCRIPT_DIR/invesmenttracker/.venv/bin/activate"

# Iniciar Django em background
echo "Iniciando Backend - Django (porta 8000)..."
cd "$SCRIPT_DIR/invesmenttracker"
python3 manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1 &
DJANGO_PID=$!
echo "$DJANGO_PID" >> "$PIDS_FILE"
show_success "Backend iniciado (PID: $DJANGO_PID)"

# Esperar Django iniciar
sleep 3

# Iniciar React em background
echo "Iniciando Frontend - React (porta 5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/vite.log 2>&1 &
VITE_PID=$!
echo "$VITE_PID" >> "$PIDS_FILE"
show_success "Frontend iniciado (PID: $VITE_PID)"

echo ""
echo "====================================================="
echo "   APLICAÇÃO INICIADA COM SUCESSO!"
echo "====================================================="
echo ""
echo "Acesse nos endereços:"
echo "   - Dashboard:  ${GREEN}http://localhost:5173${NC}"
echo "   - API:        ${GREEN}http://localhost:8000/api${NC}"
echo "   - Admin:      ${GREEN}http://localhost:8000/admin${NC}"
echo ""
echo "Logs:"
echo "   - Backend:    tail -f /tmp/django.log"
echo "   - Frontend:   tail -f /tmp/vite.log"
echo ""
echo "Pressione Ctrl+C para encerrar todos os servidores"
echo "====================================================="
echo ""

# Manter script rodando
wait
