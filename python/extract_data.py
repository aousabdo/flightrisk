"""
Extract R .rds data files to JSON for the React frontend.
Run once to generate src/data/*.json
"""
import json
import os
import sys
import pandas as pd
import pyreadr
import numpy as np

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, '..', '..', 'flightrisk', 'data')
OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'src', 'data')

os.makedirs(OUTPUT_DIR, exist_ok=True)


def load_rds(filename):
    path = os.path.join(DATA_DIR, filename)
    result = pyreadr.read_r(path)
    return result[None]  # pyreadr returns dict with None key for single objects


def calculate_attrition_cost(row):
    """Port of R calculate_attrition_cost function"""
    salary = row['MonthlyIncome'] * 12
    net_revenue = (row['MonthlyRate'] - row['MonthlyIncome']) * 12

    separation_cost = 500
    vacancy_cost = 10000
    acquisition_cost = 4900
    placement_cost = 3500
    workdays_per_year = 240
    workdays_position_open = 40
    workdays_onboarding = 60
    onboarding_efficiency = 0.50

    direct_cost = separation_cost + vacancy_cost + acquisition_cost + placement_cost
    productivity_cost = (net_revenue / workdays_per_year) * (
        workdays_position_open + workdays_onboarding * onboarding_efficiency
    )
    salary_benefit = (salary / workdays_per_year) * workdays_position_open
    return direct_cost + productivity_cost - salary_benefit


def rescale(values, to_min, to_max):
    """Rescale values to a new range"""
    v_min = values.min()
    v_max = values.max()
    if v_max == v_min:
        return pd.Series([to_min] * len(values))
    return to_min + (values - v_min) * (to_max - to_min) / (v_max - v_min)


def calculate_employee_score(df):
    """Port of R calculate_employee_score function"""
    # Convert categoricals to strings for mapping
    def safe_map(series, mapping, default=1):
        return series.astype(str).map(mapping).fillna(default).astype(float)

    # BusinessTravel score
    bt_map = {'Travel_Frequently': 3, 'Travel_Rarely': 2, 'Non-Travel': 1}
    bt_score = safe_map(df['BusinessTravel'], bt_map)

    # Education score
    edu_map = {'Below College': 1, 'College': 2, 'Bachelor': 2, 'Master': 4, 'Doctor': 6}
    edu_score = safe_map(df['Education'], edu_map)

    # EducationField score
    ef_map = {'Human Resources': 1, 'Life Sciences': 1.5, 'Marketing': 2,
              'Medical': 4, 'Technical Degree': 2, 'Other': 1.5}
    ef_score = safe_map(df['EducationField'], ef_map, 1.5)

    # JobInvolvement score
    ji_map = {'Low': 1, 'Medium': 3, 'High': 5, 'Very High': 5}
    ji_score = safe_map(df['JobInvolvement'], ji_map, 5)

    # JobLevel score
    jl_map = {'1': 1, '2': 2, '3': 4, '4': 5, '5': 7}
    jl_score = safe_map(df['JobLevel'], jl_map, 2)

    # JobRole score
    jr_map = {'Human Resources': 1, 'Sales Executive': 2, 'Manager': 3,
              'Healthcare Representative': 2, 'Laboratory Technician': 2,
              'Manufacturing Director': 4, 'Research Scientist': 3,
              'Research Director': 5, 'Sales Representative': 2}
    jr_score = safe_map(df['JobRole'], jr_map, 2)

    # TotalWorkingYears score
    twy = df['TotalWorkingYears']
    twy_bins = pd.cut(twy, bins=[-1, 5, 10, 15, 20, 30, 100], labels=False)
    twy_label_map = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 4}
    twy_score = twy_bins.map(twy_label_map).astype(float)

    # YearsAtCompany score
    yac = df['YearsAtCompany']
    yac_bins = pd.cut(yac, bins=[-1, 5, 10, 15, 20, 30, 100], labels=False)
    yac_label_map = {0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 4}
    yac_score = yac_bins.map(yac_label_map).astype(float)

    # MonthlyIncome score (normalized)
    income_diff = df['MonthlyRate'] - df['MonthlyIncome']
    mi_score = rescale(income_diff, 0, 100)

    # Attrition cost score
    ac_score = df['attrition_cost'] / 100000 * 1.2

    # Weighted sum
    weights = {
        'bt': 1, 'edu': 1, 'ef': 1, 'ji': 5, 'jl': 2,
        'jr': 2, 'twy': 2, 'yac': 2, 'mi': 1, 'ac': 2
    }
    raw_score = (
        bt_score * weights['bt'] +
        edu_score * weights['edu'] +
        ef_score * weights['ef'] +
        ji_score * weights['ji'] +
        jl_score * weights['jl'] +
        jr_score * weights['jr'] +
        twy_score * weights['twy'] +
        yac_score * weights['yac'] +
        mi_score * weights['mi'] +
        ac_score * weights['ac']
    )
    return rescale(raw_score, 45, 95)


def main():
    print("Loading R data files...")
    train_df = load_rds('train_tbl.rds')
    test_df = load_rds('test_tbl.rds')

    print(f"  train: {train_df.shape}, test: {test_df.shape}")

    # Combine
    df = pd.concat([train_df, test_df], ignore_index=True)
    print(f"  combined: {df.shape}")
    print(f"  columns: {list(df.columns)}")

    # Calculate attrition cost
    df['attrition_cost'] = df.apply(calculate_attrition_cost, axis=1)
    df['attrition_cost'] = rescale(df['attrition_cost'], 5000, 250000)

    # Calculate employee score
    df['employee_score'] = calculate_employee_score(df)

    # Convert factor/categorical columns to strings
    for col in df.select_dtypes(include=['category']).columns:
        df[col] = df[col].astype(str)

    # Clean up columns - keep what the frontend needs
    keep_cols = [
        'EmployeeNumber', 'Name', 'Age', 'Gender', 'MaritalStatus',
        'Department', 'JobRole', 'JobLevel', 'Education', 'EducationField',
        'MonthlyIncome', 'MonthlyRate', 'DailyRate', 'HourlyRate',
        'OverTime', 'BusinessTravel', 'DistanceFromHome',
        'PercentSalaryHike', 'StockOptionLevel',
        'TotalWorkingYears', 'YearsAtCompany', 'YearsInCurrentRole',
        'YearsSinceLastPromotion', 'YearsWithCurrManager',
        'NumCompaniesWorked', 'TrainingTimesLastYear',
        'EnvironmentSatisfaction', 'JobSatisfaction', 'JobInvolvement',
        'RelationshipSatisfaction', 'WorkLifeBalance', 'PerformanceRating',
        'Attrition', 'label', 'prob_of_attrition',
        'personal_development_strategy', 'professional_development_strategy',
        'work_environment_strategy',
        'attrition_cost', 'employee_score'
    ]

    # Only keep columns that exist
    keep_cols = [c for c in keep_cols if c in df.columns]
    df_out = df[keep_cols].copy()

    # Round numeric columns for smaller JSON
    for col in ['prob_of_attrition', 'attrition_cost', 'employee_score']:
        if col in df_out.columns:
            df_out[col] = df_out[col].round(4)

    for col in ['MonthlyIncome', 'MonthlyRate', 'DailyRate', 'HourlyRate']:
        if col in df_out.columns:
            df_out[col] = df_out[col].round(0).astype(int)

    # Replace NaN with None for JSON
    df_out = df_out.where(pd.notnull(df_out), None)

    # Save employees JSON
    employees = df_out.to_dict(orient='records')
    out_path = os.path.join(OUTPUT_DIR, 'employees.json')
    with open(out_path, 'w') as f:
        json.dump(employees, f)
    print(f"  Wrote {len(employees)} employees to {out_path}")
    print(f"  File size: {os.path.getsize(out_path) / 1024:.1f} KB")

    # Extract explanations
    print("\nLoading explanations...")
    expl_df = load_rds('explanations.rds')
    print(f"  explanations shape: {expl_df.shape}")
    print(f"  explanation columns: {list(expl_df.columns)}")

    # Convert to a dict keyed by employee name for easy lookup
    for col in expl_df.select_dtypes(include=['category']).columns:
        expl_df[col] = expl_df[col].astype(str)

    # Group by employee (case column) and extract feature weights
    if 'case' in expl_df.columns:
        group_col = 'case'
    elif 'Name' in expl_df.columns:
        group_col = 'Name'
    else:
        print(f"  WARNING: No grouping column found. Columns: {list(expl_df.columns)}")
        group_col = expl_df.columns[0]

    explanations = {}
    for name, group in expl_df.groupby(group_col):
        features = []
        for _, row in group.iterrows():
            feat = {
                'feature': str(row.get('feature', row.get('feature_desc', ''))),
                'feature_value': str(row.get('feature_value', '')),
                'weight': round(float(row.get('feature_weight', row.get('weight', 0))), 4),
            }
            if 'label' in row:
                feat['label'] = str(row['label'])
            features.append(feat)
        explanations[str(name)] = features

    expl_path = os.path.join(OUTPUT_DIR, 'explanations.json')
    with open(expl_path, 'w') as f:
        json.dump(explanations, f)
    print(f"  Wrote {len(explanations)} explanation sets to {expl_path}")
    print(f"  File size: {os.path.getsize(expl_path) / 1024:.1f} KB")

    # Print summary stats
    print("\n--- Summary ---")
    if 'label' in df_out.columns:
        print(f"  Predicted to leave: {(df_out['label'] == 'Yes').sum()}")
        print(f"  Predicted to stay:  {(df_out['label'] == 'No').sum()}")
    if 'prob_of_attrition' in df_out.columns:
        print(f"  Avg attrition prob: {df_out['prob_of_attrition'].mean():.4f}")
    if 'Department' in df_out.columns:
        print(f"  Departments: {df_out['Department'].unique().tolist()}")
    if 'JobRole' in df_out.columns:
        print(f"  Job Roles: {df_out['JobRole'].unique().tolist()}")


if __name__ == '__main__':
    main()
