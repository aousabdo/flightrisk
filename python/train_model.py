"""
Train a Gradient Boosting model on the employee data and export
the full tree structure as JSON for client-side prediction in JavaScript.
"""
import json
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, roc_auc_score

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', 'src', 'data')

# Features used for prediction
NUMERIC_FEATURES = [
    'Age', 'DailyRate', 'DistanceFromHome', 'HourlyRate',
    'MonthlyIncome', 'MonthlyRate', 'NumCompaniesWorked',
    'PercentSalaryHike', 'TotalWorkingYears', 'TrainingTimesLastYear',
    'YearsAtCompany', 'YearsInCurrentRole', 'YearsSinceLastPromotion',
    'YearsWithCurrManager'
]

CATEGORICAL_FEATURES = [
    'BusinessTravel', 'Department', 'Education', 'EducationField',
    'EnvironmentSatisfaction', 'Gender', 'JobInvolvement', 'JobLevel',
    'JobRole', 'JobSatisfaction', 'MaritalStatus', 'OverTime',
    'PerformanceRating', 'RelationshipSatisfaction', 'StockOptionLevel',
    'WorkLifeBalance'
]


def export_tree(tree, feature_names):
    """Recursively export a sklearn decision tree to a JSON-serializable dict."""
    tree_ = tree.tree_

    def recurse(node_id):
        if tree_.children_left[node_id] == -1:  # leaf
            return {'v': round(float(tree_.value[node_id][0, 0]), 6)}

        feat_idx = tree_.feature[node_id]
        threshold = tree_.threshold[node_id]

        return {
            'f': int(feat_idx),  # feature index
            't': round(float(threshold), 6),  # threshold
            'l': recurse(tree_.children_left[node_id]),   # left (<=)
            'r': recurse(tree_.children_right[node_id]),   # right (>)
        }

    return recurse(0)


def main():
    # Load the employee data
    with open(os.path.join(DATA_DIR, 'employees.json')) as f:
        employees = json.load(f)

    df = pd.DataFrame(employees)
    print(f"Loaded {len(df)} employees")

    # Target: use original Attrition column
    df['target'] = (df['Attrition'] == 'Yes').astype(int)
    print(f"Class distribution: {df['target'].value_counts().to_dict()}")

    # Encode categorical features with LabelEncoder (ordinal encoding)
    # This works well with tree-based models and produces compact JSON
    encoders = {}
    cat_mappings = {}
    for col in CATEGORICAL_FEATURES:
        le = LabelEncoder()
        df[col + '_enc'] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        cat_mappings[col] = {label: int(idx) for idx, label in enumerate(le.classes_)}

    feature_cols = NUMERIC_FEATURES + [c + '_enc' for c in CATEGORICAL_FEATURES]
    X = df[feature_cols].astype(float).fillna(0)
    y = df['target']

    # Train Gradient Boosting Classifier
    model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        min_samples_split=20,
        min_samples_leaf=10,
        subsample=0.8,
        max_features='sqrt',
        random_state=42,
    )

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_acc = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
    cv_auc = cross_val_score(model, X, y, cv=cv, scoring='roc_auc')
    print(f"\nCV Accuracy: {cv_acc.mean():.4f} (+/- {cv_acc.std():.4f})")
    print(f"CV ROC-AUC:  {cv_auc.mean():.4f} (+/- {cv_auc.std():.4f})")

    # Fit on full data
    model.fit(X, y)

    y_pred = model.predict(X)
    y_prob = model.predict_proba(X)[:, 1]
    print(f"\nFull-data ROC-AUC: {roc_auc_score(y, y_prob):.4f}")
    print("\nClassification Report (full data):")
    print(classification_report(y, y_pred, target_names=['Stay', 'Leave']))

    # Feature importance
    importances = model.feature_importances_
    feat_imp = sorted(zip(feature_cols, importances), key=lambda x: -x[1])
    print("\nTop 15 Feature Importances:")
    for feat, imp in feat_imp[:15]:
        clean_name = feat.replace('_enc', '')
        print(f"  {clean_name:30s} {imp:.4f}")

    # Export all trees as JSON
    trees = []
    for estimator_arr in model.estimators_:
        tree = estimator_arr[0]  # GradientBoosting stores trees in arrays
        trees.append(export_tree(tree, feature_cols))

    model_export = {
        'model_type': 'gradient_boosting',
        'n_estimators': model.n_estimators,
        'learning_rate': model.learning_rate,
        'init_value': round(float(model.init_.class_prior_[1]), 6),  # log-odds prior
        'trees': trees,
        'feature_names': feature_cols,
        'numeric_features': NUMERIC_FEATURES,
        'categorical_features': CATEGORICAL_FEATURES,
        'categorical_mappings': cat_mappings,
        'accuracy': round(float(cv_acc.mean()), 4),
        'roc_auc': round(float(cv_auc.mean()), 4),
    }

    # Fix init_value: GradientBoosting uses log-odds as init
    # The init predictor for binary classification uses log(p/(1-p))
    p = y.mean()
    log_odds = np.log(p / (1 - p))
    model_export['init_value'] = round(float(log_odds), 6)

    out_path = os.path.join(DATA_DIR, 'model_weights.json')
    with open(out_path, 'w') as f:
        json.dump(model_export, f)

    file_size = os.path.getsize(out_path)
    print(f"\nExported model to {out_path}")
    print(f"  Trees: {len(trees)}")
    print(f"  Features: {len(feature_cols)}")
    print(f"  File size: {file_size / 1024:.1f} KB")

    # Verify JS prediction matches Python
    # Pick a few samples and compute predictions manually
    print("\nVerification (Python predict vs manual tree traversal):")
    for idx in [0, 100, 500, 1000]:
        if idx >= len(df):
            continue
        row = X.iloc[idx].values
        py_prob = model.predict_proba(X.iloc[[idx]])[0, 1]

        # Manual traversal
        raw_pred = log_odds
        for tree_json in trees:
            node = tree_json
            while 'f' in node:
                if row[node['f']] <= node['t']:
                    node = node['l']
                else:
                    node = node['r']
            raw_pred += model.learning_rate * node['v']
        manual_prob = 1.0 / (1.0 + np.exp(-raw_pred))

        print(f"  Employee {idx}: Python={py_prob:.6f}, Manual={manual_prob:.6f}, Match={abs(py_prob - manual_prob) < 0.001}")


if __name__ == '__main__':
    main()
