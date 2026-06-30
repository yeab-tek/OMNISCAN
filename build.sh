#!/usr/bin/env bash
set -e
pip install --upgrade pip
pip install --only-binary=:all: pydantic-core==2.18.2 || pip install pydantic-core==2.18.2
pip install -r requirements.txt
