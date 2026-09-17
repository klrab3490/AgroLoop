#!/usr/bin/env bash
set -e

# Auto-detect JAVA_HOME if not already set or invalid
if [ -z "$JAVA_HOME" ] || [ ! -x "$JAVA_HOME/bin/java" ]; then
    if [ "$(uname -s)" = "Darwin" ]; then
        for jvm in /Library/Java/JavaVirtualMachines/*/Contents/Home /opt/homebrew/opt/openjdk* /usr/local/opt/openjdk*; do
            if [ -x "$jvm/bin/java" ]; then
                export JAVA_HOME="$jvm"
                export PATH="$JAVA_HOME/bin:$PATH"
                break
            fi
        done
    fi
fi

echo "Starting AgroLoop (macOS / Linux)..."
./mvnw spring-boot:run
