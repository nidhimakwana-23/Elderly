"""
predict.py — Classify the intent of a natural-language question.

Usage:
    python predict.py "Did mom take her medicine today?"

Stdout (JSON only):
    {"intent": "medicine_today", "confidence": 0.94}

If confidence is below CONFIDENCE_THRESHOLD the intent is returned as "unknown".

Stderr:
    Diagnostic / error messages (never mixed into stdout so Node.js can parse safely).

Exit codes:
    0 — success (JSON printed to stdout)
    1 — failure (error printed to stderr)
"""

import sys
import os
import json
import pathlib

# ── Confidence threshold ──────────────────────────────────────────────────────
# Adjust this value after validation testing.  A question scoring below this
# threshold will be classified as "unknown" instead of a low-confidence intent.
CONFIDENCE_THRESHOLD = 0.70

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR       = pathlib.Path(__file__).resolve().parent
MODEL_PATH       = SCRIPT_DIR / "models" / "intent_model.joblib"
VECTORIZER_PATH  = SCRIPT_DIR / "models" / "tfidf_vectorizer.joblib"


def load_artifacts():
    """Load the trained vectorizer and classifier from disk."""
    try:
        import joblib
    except ImportError:
        print("[ERROR] joblib is not installed.  Run: pip install joblib", file=sys.stderr)
        sys.exit(1)

    if not MODEL_PATH.exists():
        print(f"[ERROR] Model not found: {MODEL_PATH}", file=sys.stderr)
        print("[ERROR] Run train.py first to generate the model files.", file=sys.stderr)
        sys.exit(1)

    if not VECTORIZER_PATH.exists():
        print(f"[ERROR] Vectorizer not found: {VECTORIZER_PATH}", file=sys.stderr)
        print("[ERROR] Run train.py first to generate the model files.", file=sys.stderr)
        sys.exit(1)

    vectorizer = joblib.load(VECTORIZER_PATH)
    classifier = joblib.load(MODEL_PATH)
    return vectorizer, classifier


def predict(question: str) -> dict:
    """Return a dict with 'intent' and 'confidence' keys."""
    vectorizer, classifier = load_artifacts()

    # Transform the question into TF-IDF feature space
    X = vectorizer.transform([question])

    # Get the predicted class and its probability
    predicted_intent = classifier.predict(X)[0]
    probabilities    = classifier.predict_proba(X)[0]
    confidence       = float(max(probabilities))

    # Apply unknown-intent threshold
    if confidence < CONFIDENCE_THRESHOLD:
        return {"intent": "unknown", "confidence": round(confidence, 4)}

    return {"intent": predicted_intent, "confidence": round(confidence, 4)}


def main():
    if len(sys.argv) != 2:
        print("[ERROR] Usage: python predict.py \"<question>\"", file=sys.stderr)
        sys.exit(1)

    question = sys.argv[1].strip()
    if not question:
        print("[ERROR] Question must not be empty.", file=sys.stderr)
        sys.exit(1)

    try:
        result = predict(question)
        # ── IMPORTANT: Only JSON goes to stdout ──────────────────────────────
        print(json.dumps(result))
    except Exception as exc:
        print(f"[ERROR] Prediction failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
