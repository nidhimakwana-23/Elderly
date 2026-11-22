"""Pytest fixtures and environment setup."""

import sys
from pathlib import Path

import pytest

# Ensure src is on sys.path
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from synthetic_data import create_synthetic_corpus, generate_synthetic_sequence


@pytest.fixture
def sample_standing_sequence():
    seq, entry = generate_synthetic_sequence("standing_walk", "seq_stand_01")
    return seq, entry


@pytest.fixture
def sample_fall_sequence():
    seq, entry = generate_synthetic_sequence("fall_forward", "seq_fall_01")
    return seq, entry


@pytest.fixture
def synthetic_corpus():
    return create_synthetic_corpus()
