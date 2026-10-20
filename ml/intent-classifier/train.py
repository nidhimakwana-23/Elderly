"""
train.py — Train a TF-IDF + Logistic Regression intent classifier.

Usage:
    python train.py

Outputs:
    models/intent_model.joblib
    models/tfidf_vectorizer.joblib

Paths are resolved relative to this script file, regardless of the
working directory from which the script is executed.
"""

import sys
import os
import pathlib

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR   = pathlib.Path(__file__).resolve().parent
DATA_PATH    = SCRIPT_DIR / "data" / "intents.csv"
MODELS_DIR   = SCRIPT_DIR / "models"
MODEL_PATH   = MODELS_DIR / "intent_model.joblib"
VECTORIZER_PATH = MODELS_DIR / "tfidf_vectorizer.joblib"

# Ensure models directory exists
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── Imports ───────────────────────────────────────────────────────────────────
try:
    import pandas as pd
    from sklearn.model_selection import train_test_split
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, classification_report
    import joblib
except ImportError as e:
    print(f"[ERROR] Missing dependency: {e}", file=sys.stderr)
    print("Run:  pip install -r requirements.txt", file=sys.stderr)
    sys.exit(1)


def load_data(path: pathlib.Path) -> pd.DataFrame:
    """Load and validate the intent CSV file."""
    if not path.exists():
        print(f"[ERROR] Dataset not found: {path}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(path)

    # Validate required columns
    required_columns = {"text", "intent"}
    missing = required_columns - set(df.columns)
    if missing:
        print(f"[ERROR] CSV is missing columns: {missing}", file=sys.stderr)
        sys.exit(1)

    # Drop rows with missing text or intent
    before = len(df)
    df = df.dropna(subset=["text", "intent"])
    df["text"]   = df["text"].str.strip()
    df["intent"] = df["intent"].str.strip()
    df = df[(df["text"] != "") & (df["intent"] != "")]
    after = len(df)

    if before != after:
        print(f"[INFO]  Removed {before - after} empty/invalid rows.", file=sys.stderr)

    if len(df) == 0:
        print("[ERROR] Dataset is empty after cleaning.", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO]  Loaded {len(df)} examples across {df['intent'].nunique()} intents.")
    print(f"[INFO]  Intents: {sorted(df['intent'].unique())}")
    return df


def train(df: pd.DataFrame):
    """Train the TF-IDF + Logistic Regression pipeline."""
    X = df["text"].values
    y = df["intent"].values

    # Reproducible split — 20 % held out for evaluation
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"[INFO]  Training set: {len(X_train)} examples")
    print(f"[INFO]  Test set    : {len(X_test)} examples")

    # ── Vectorizer ────────────────────────────────────────────────────────────
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),   # unigrams + bigrams
        max_features=5000,
        sublinear_tf=True,    # apply 1 + log(tf) instead of raw tf
        strip_accents="unicode",
        analyzer="word",
        token_pattern=r"\w{2,}",
        min_df=1,
    )

    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec  = vectorizer.transform(X_test)

    # ── Classifier ────────────────────────────────────────────────────────────
    classifier = LogisticRegression(
        max_iter=1000,
        random_state=42,
        solver="lbfgs",
        C=5.0,
    )

    classifier.fit(X_train_vec, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred = classifier.predict(X_test_vec)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n[RESULT] Test accuracy : {acc * 100:.2f}%")
    print("\n[RESULT] Classification Report:")
    print(classification_report(y_test, y_pred))

    # ── Save artifacts ────────────────────────────────────────────────────────
    joblib.dump(classifier, MODEL_PATH)
    joblib.dump(vectorizer, VECTORIZER_PATH)

    print(f"[INFO]  Classifier saved -> {MODEL_PATH}")
    print(f"[INFO]  Vectorizer saved -> {VECTORIZER_PATH}")
    print("\n[DONE] Training complete.")


if __name__ == "__main__":
    df = load_data(DATA_PATH)
    train(df)
