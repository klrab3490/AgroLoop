#!/usr/bin/env bash
# ==============================================================================
# AgroLoop - Environment Setup, Package Verification & Auto-Update Script
# Supports: macOS (Homebrew) and Linux (apt, dnf, pacman)
# ==============================================================================

set -eo pipefail

# Text formatting
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Required minimum versions
MIN_JAVA_VERSION=21
MIN_GIT_VERSION=2

AUTO_YES=false
CHECK_ONLY=false
SKIP_BUILD=false

# Parse flags
for arg in "$@"; do
    case "$arg" in
        -y|--yes)
            AUTO_YES=true
            ;;
        -c|--check-only)
            CHECK_ONLY=true
            ;;
        --skip-build)
            SKIP_BUILD=true
            ;;
        -h|--help)
            echo -e "${BOLD}AgroLoop Setup Script${NC}"
            echo "Usage: ./setup.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -y, --yes          Auto-confirm all installation/upgrade prompts"
            echo "  -c, --check-only   Check environment status without making changes"
            echo "  --skip-build       Skip testing project compilation at the end"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            echo -e "${YELLOW}Unknown option: $arg${NC}"
            ;;
    esac
done

print_header() {
    echo -e "\n${BOLD}${CYAN}======================================================${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}======================================================${NC}"
}

prompt_confirm() {
    local prompt_msg="$1"
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi
    if [ "$CHECK_ONLY" = true ]; then
        return 1
    fi
    read -rp "$(echo -e "${YELLOW}${prompt_msg} [y/N]: ${NC}")" choice
    case "$choice" in
        y|Y|yes|YES) return 0 ;;
        *) return 1 ;;
    esac
}

# ------------------------------------------------------------------------------
# 1. OS & Architecture Detection
# ------------------------------------------------------------------------------
print_header "Step 1: Detecting Operating System"

OS="$(uname -s)"
ARCH="$(uname -m)"
PACKAGE_MANAGER=""

case "$OS" in
    Darwin*)
        OS_NAME="macOS"
        PACKAGE_MANAGER="brew"
        echo -e "${GREEN}✓ Detected OS:${NC} macOS ($ARCH)"
        ;;
    Linux*)
        OS_NAME="Linux"
        if command -v apt-get >/dev/null 2>&1; then
            PACKAGE_MANAGER="apt"
        elif command -v dnf >/dev/null 2>&1; then
            PACKAGE_MANAGER="dnf"
        elif command -v pacman >/dev/null 2>&1; then
            PACKAGE_MANAGER="pacman"
        else
            PACKAGE_MANAGER="unknown"
        fi
        echo -e "${GREEN}✓ Detected OS:${NC} Linux ($ARCH) with package manager: $PACKAGE_MANAGER"
        ;;
    *)
        echo -e "${RED}✗ Unsupported OS: $OS${NC}"
        echo "Please refer to README.md for manual setup."
        exit 1
        ;;
esac

# ------------------------------------------------------------------------------
# 2. Package Manager Verification & Update
# ------------------------------------------------------------------------------
print_header "Step 2: Package Manager Verification"

if [ "$OS_NAME" = "macOS" ]; then
    if command -v brew >/dev/null 2>&1; then
        BREW_VERSION=$(brew --version | head -n 1)
        echo -e "${GREEN}✓ Homebrew is installed:${NC} $BREW_VERSION"
        if [ "$CHECK_ONLY" = false ]; then
            if prompt_confirm "Would you like to run 'brew update' to ensure latest formulas?"; then
                echo "Updating Homebrew formulas..."
                brew update || echo -e "${YELLOW}Warning: Homebrew update finished with warnings.${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}! Homebrew is not installed.${NC}"
        if [ "$CHECK_ONLY" = true ]; then
            echo -e "${RED}✗ Homebrew is required on macOS to install tools.${NC}"
        elif prompt_confirm "Would you like to install Homebrew now?"; then
            echo "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            if [ -f "/opt/homebrew/bin/brew" ]; then
                eval "$(/opt/homebrew/bin/brew shellenv)"
            elif [ -f "/usr/local/bin/brew" ]; then
                eval "$(/usr/local/bin/brew shellenv)"
            fi
        else
            echo -e "${RED}✗ Cannot proceed without Homebrew on macOS.${NC}"
            exit 1
        fi
    fi
elif [ "$OS_NAME" = "Linux" ]; then
    if [ "$CHECK_ONLY" = false ] && [ "$PACKAGE_MANAGER" != "unknown" ]; then
        if prompt_confirm "Would you like to update the package manager repositories?"; then
            case "$PACKAGE_MANAGER" in
                apt) sudo apt-get update ;;
                dnf) sudo dnf check-update || true ;;
                pacman) sudo pacman -Sy ;;
            esac
        fi
    fi
fi

# ------------------------------------------------------------------------------
# 3. Git Check & Install/Update
# ------------------------------------------------------------------------------
print_header "Step 3: Checking Git"

if command -v git >/dev/null 2>&1; then
    GIT_VERSION_STR=$(git --version | awk '{print $3}')
    GIT_MAJOR=$(echo "$GIT_VERSION_STR" | cut -d'.' -f1)
    echo -e "${GREEN}✓ Git installed:${NC} version $GIT_VERSION_STR"
    if [ "$GIT_MAJOR" -lt "$MIN_GIT_VERSION" ]; then
        echo -e "${YELLOW}! Git is older than recommended (v$MIN_GIT_VERSION+).${NC}"
        if prompt_confirm "Would you like to upgrade Git?"; then
            case "$PACKAGE_MANAGER" in
                brew) brew upgrade git ;;
                apt) sudo apt-get --only-upgrade install git ;;
                dnf) sudo dnf upgrade -y git ;;
                pacman) sudo pacman -Syu --noconfirm git ;;
            esac
        fi
    fi
else
    echo -e "${YELLOW}! Git is not installed.${NC}"
    if prompt_confirm "Install Git now?"; then
        case "$PACKAGE_MANAGER" in
            brew) brew install git ;;
            apt) sudo apt-get install -y git ;;
            dnf) sudo dnf install -y git ;;
            pacman) sudo pacman -S --noconfirm git ;;
        esac
    fi
fi

# ------------------------------------------------------------------------------
# 4. Java JDK Check, Install & Auto-Configuration
# ------------------------------------------------------------------------------
print_header "Step 4: Checking Java JDK (Minimum required: Java $MIN_JAVA_VERSION)"

find_local_java() {
    # 1. Check if JAVA_HOME is already pointing to a valid Java 21+
    if [ -n "$JAVA_HOME" ] && [ -x "$JAVA_HOME/bin/java" ]; then
        local raw_ver
        raw_ver=$("$JAVA_HOME/bin/java" -version 2>&1 | awk -F '"' '/version/ {print $2}')
        local major
        major=$(echo "$raw_ver" | awk -F. '{if ($1 == "1") print $2; else print $1}')
        if [ -n "$major" ] && [ "$major" -ge "$MIN_JAVA_VERSION" ]; then
            return 0
        fi
    fi

    # 2. Check macOS /Library/Java/JavaVirtualMachines
    if [ "$OS_NAME" = "macOS" ]; then
        for jvm in /Library/Java/JavaVirtualMachines/*/Contents/Home; do
            if [ -x "$jvm/bin/java" ]; then
                local raw_ver
                raw_ver=$("$jvm/bin/java" -version 2>&1 | awk -F '"' '/version/ {print $2}')
                local major
                major=$(echo "$raw_ver" | awk -F. '{if ($1 == "1") print $2; else print $1}')
                if [ -n "$major" ] && [ "$major" -ge "$MIN_JAVA_VERSION" ]; then
                    export JAVA_HOME="$jvm"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    return 0
                fi
            fi
        done

        # 3. Check Homebrew OpenJDK paths
        for brew_jvm in /opt/homebrew/opt/openjdk* /usr/local/opt/openjdk*; do
            if [ -x "$brew_jvm/bin/java" ]; then
                local raw_ver
                raw_ver=$("$brew_jvm/bin/java" -version 2>&1 | awk -F '"' '/version/ {print $2}')
                local major
                major=$(echo "$raw_ver" | awk -F. '{if ($1 == "1") print $2; else print $1}')
                if [ -n "$major" ] && [ "$major" -ge "$MIN_JAVA_VERSION" ]; then
                    export JAVA_HOME="$brew_jvm"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    return 0
                fi
            fi
        done
    elif [ "$OS_NAME" = "Linux" ]; then
        for jvm in /usr/lib/jvm/* /usr/java/*; do
            if [ -x "$jvm/bin/java" ]; then
                local raw_ver
                raw_ver=$("$jvm/bin/java" -version 2>&1 | awk -F '"' '/version/ {print $2}')
                local major
                major=$(echo "$raw_ver" | awk -F. '{if ($1 == "1") print $2; else print $1}')
                if [ -n "$major" ] && [ "$major" -ge "$MIN_JAVA_VERSION" ]; then
                    export JAVA_HOME="$jvm"
                    export PATH="$JAVA_HOME/bin:$PATH"
                    return 0
                fi
            fi
        done
    fi

    # 4. Fallback to standard PATH
    if command -v java >/dev/null 2>&1; then
        local raw_ver
        raw_ver=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' || true)
        local major
        major=$(echo "$raw_ver" | awk -F. '{if ($1 == "1") print $2; else print $1}')
        if [ -n "$major" ] && [ "$major" -ge "$MIN_JAVA_VERSION" ]; then
            return 0
        fi
    fi

    return 1
}

JAVA_SATISFIED=false

if find_local_java; then
    DETECTED_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
    echo -e "${GREEN}✓ Java $DETECTED_VER found!${NC} (>= $MIN_JAVA_VERSION)"
    if [ -n "$JAVA_HOME" ]; then
        echo -e "  Location: ${CYAN}$JAVA_HOME${NC}"
    fi
    JAVA_SATISFIED=true
else
    if command -v java >/dev/null 2>&1; then
        OLD_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' || echo "unknown")
        echo -e "${YELLOW}! Installed Java ($OLD_VER) is older than required Java $MIN_JAVA_VERSION.${NC}"
    else
        echo -e "${YELLOW}! No working Java installation found.${NC}"
    fi

    if [ "$CHECK_ONLY" = true ]; then
        echo -e "${RED}✗ Java $MIN_JAVA_VERSION+ is required to build and run AgroLoop.${NC}"
    elif prompt_confirm "Would you like to install JDK $MIN_JAVA_VERSION+ now?"; then
        case "$PACKAGE_MANAGER" in
            brew)
                echo "Installing OpenJDK 21 via Homebrew..."
                brew install openjdk@21
                export JAVA_HOME="/opt/homebrew/opt/openjdk@21"
                if [ ! -d "$JAVA_HOME" ]; then
                    export JAVA_HOME="/usr/local/opt/openjdk@21"
                fi
                export PATH="$JAVA_HOME/bin:$PATH"
                ;;
            apt)
                echo "Installing OpenJDK 21 via apt..."
                sudo apt-get install -y openjdk-21-jdk
                export JAVA_HOME="/usr/lib/jvm/java-21-openjdk-amd64"
                export PATH="$JAVA_HOME/bin:$PATH"
                ;;
            dnf)
                echo "Installing OpenJDK 21 via dnf..."
                sudo dnf install -y java-21-openjdk-devel
                ;;
            pacman)
                echo "Installing OpenJDK 21 via pacman..."
                sudo pacman -S --noconfirm jdk21-openjdk
                ;;
        esac

        if find_local_java; then
            NEW_VER=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}')
            echo -e "${GREEN}✓ Successfully installed Java $NEW_VER!${NC}"
            JAVA_SATISFIED=true
        fi
    fi
fi

# Suggest / Offer JAVA_HOME persistence in user shell profile if not yet added
if [ "$JAVA_SATISFIED" = true ] && [ -n "$JAVA_HOME" ]; then
    SHELL_PROFILE=""
    if [ -f "$HOME/.zshrc" ]; then
        SHELL_PROFILE="$HOME/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
        SHELL_PROFILE="$HOME/.bashrc"
    fi

    if [ -n "$SHELL_PROFILE" ] && ! grep -q "JAVA_HOME" "$SHELL_PROFILE" 2>/dev/null; then
        echo -e "\n${BLUE}ℹ Tip:${NC} Your shell profile ($SHELL_PROFILE) does not currently export JAVA_HOME."
        if [ "$CHECK_ONLY" = false ] && prompt_confirm "Add 'export JAVA_HOME=\"$JAVA_HOME\"' to $(basename "$SHELL_PROFILE")?"; then
            echo "" >> "$SHELL_PROFILE"
            echo "# AgroLoop Java configuration" >> "$SHELL_PROFILE"
            echo "export JAVA_HOME=\"$JAVA_HOME\"" >> "$SHELL_PROFILE"
            echo "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" >> "$SHELL_PROFILE"
            echo -e "${GREEN}✓ Added JAVA_HOME to $SHELL_PROFILE.${NC}"
        fi
    fi
fi

# ------------------------------------------------------------------------------
# 5. Maven Check
# ------------------------------------------------------------------------------
print_header "Step 5: Checking Maven / Maven Wrapper"

if [ -f "./mvnw" ]; then
    chmod +x ./mvnw
    echo -e "${GREEN}✓ Project Maven Wrapper (./mvnw) is ready and executable.${NC}"
else
    echo -e "${YELLOW}! Maven wrapper ./mvnw not found.${NC}"
fi

if command -v mvn >/dev/null 2>&1; then
    SYS_MVN=$(mvn --version | head -n 1)
    echo -e "${GREEN}✓ System Maven installed:${NC} $SYS_MVN"
else
    echo -e "${BLUE}ℹ System 'mvn' not found in PATH, but project bundled './mvnw' wrapper will be used.${NC}"
fi

# ------------------------------------------------------------------------------
# 6. Docker & Docker Compose Check
# ------------------------------------------------------------------------------
print_header "Step 6: Checking Docker & Docker Compose"

DOCKER_INSTALLED=false
if command -v docker >/dev/null 2>&1; then
    DOCKER_VER=$(docker --version)
    echo -e "${GREEN}✓ Docker installed:${NC} $DOCKER_VER"
    DOCKER_INSTALLED=true
else
    echo -e "${YELLOW}! Docker is not installed.${NC}"
    if [ "$CHECK_ONLY" = true ]; then
        echo -e "${YELLOW}! Docker is needed to run the PostgreSQL database locally.${NC}"
    elif prompt_confirm "Would you like to install Docker now?"; then
        case "$PACKAGE_MANAGER" in
            brew)
                echo "Installing Docker Desktop cask..."
                brew install --cask docker
                echo -e "${GREEN}✓ Docker Desktop installed. Please launch Docker Desktop from Applications.${NC}"
                ;;
            apt)
                echo "Installing Docker via apt..."
                sudo apt-get install -y docker.io docker-compose-v2
                sudo systemctl enable --now docker || true
                ;;
            dnf)
                echo "Installing Docker via dnf..."
                sudo dnf install -y docker docker-compose
                sudo systemctl enable --now docker || true
                ;;
        esac
    fi
fi

# Check Docker Compose plugin
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    COMPOSE_VER=$(docker compose version)
    echo -e "${GREEN}✓ Docker Compose installed:${NC} $COMPOSE_VER"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_VER=$(docker-compose --version)
    echo -e "${GREEN}✓ Docker Compose installed:${NC} $COMPOSE_VER"
else
    echo -e "${YELLOW}! Docker Compose plugin not found.${NC}"
fi

# Check if Docker daemon is running
if command -v docker >/dev/null 2>&1; then
    if docker info >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Docker daemon is active and running.${NC}"
    else
        echo -e "${YELLOW}! Docker daemon is not currently running.${NC}"
        if [ "$OS_NAME" = "macOS" ]; then
            echo -e "  ${BLUE}Tip:${NC} Launch Docker Desktop by running: ${CYAN}open -a Docker${NC}"
        elif [ "$OS_NAME" = "Linux" ]; then
            echo -e "  ${BLUE}Tip:${NC} Start the Docker service by running: ${CYAN}sudo systemctl start docker${NC}"
        fi
    fi
fi

# ------------------------------------------------------------------------------
# 7. Project Configuration & Permissions
# ------------------------------------------------------------------------------
print_header "Step 7: Verifying Project Configuration"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}! .env file not found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file.${NC}"
    else
        echo -e "${YELLOW}! Neither .env nor .env.example found.${NC}"
    fi
else
    echo -e "${GREEN}✓ .env configuration file exists.${NC}"
fi

# Ensure executable scripts
chmod +x ./run.sh 2>/dev/null || true
echo -e "${GREEN}✓ Script execution permissions verified (run.sh, mvnw).${NC}"

# ------------------------------------------------------------------------------
# 8. Build & Test Verification
# ------------------------------------------------------------------------------
if [ "$SKIP_BUILD" = false ] && [ "$CHECK_ONLY" = false ] && [ "$JAVA_SATISFIED" = true ]; then
    print_header "Step 8: Verifying Project Compilation"
    echo "Running './mvnw test-compile' to verify build health..."
    if ./mvnw test-compile -q; then
        echo -e "${GREEN}✓ Project compiles cleanly!${NC}"
    else
        echo -e "${RED}✗ Project compilation encountered issues. Check Maven output above.${NC}"
    fi
fi

# ------------------------------------------------------------------------------
# 9. Summary & Next Steps
# ------------------------------------------------------------------------------
print_header "Setup & Verification Complete!"

echo -e "${BOLD}Summary Status:${NC}"
echo -e "  • Operating System: ${GREEN}$OS_NAME ($ARCH)${NC}"
[ "$JAVA_SATISFIED" = true ] \
    && echo -e "  • Java JDK:         ${GREEN}Ready ($DETECTED_VER)${NC}" \
    || echo -e "  • Java JDK:         ${RED}Needs attention (requires Java 21+)${NC}"

command -v git >/dev/null 2>&1 \
    && echo -e "  • Git:              ${GREEN}Ready ($(git --version | awk '{print $3}'))${NC}" \
    || echo -e "  • Git:              ${RED}Not installed${NC}"

[ "$DOCKER_INSTALLED" = true ] \
    && echo -e "  • Docker:           ${GREEN}Installed${NC}" \
    || echo -e "  • Docker:           ${YELLOW}Not installed (needed for PostgreSQL container)${NC}"

echo -e "\n${BOLD}Quick Start Guide:${NC}"
echo -e "  1. Start the PostgreSQL database:     ${CYAN}docker compose up -d postgres${NC}"
echo -e "  2. Start the AgroLoop application:     ${CYAN}./run.sh${NC}"
echo -e "  3. Start all services via Docker:      ${CYAN}docker compose up -d${NC}"
echo -e "  4. Open Web Frontend at:               ${CYAN}http://localhost:3000${NC}"
echo -e "  5. Open API Backend / Swagger at:      ${CYAN}http://localhost:8080/swagger-ui.html${NC}"
echo ""
