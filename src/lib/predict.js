/**
 * Client-side Gradient Boosting prediction using exported tree structure.
 * Traverses 200 decision trees in the browser for instant what-if predictions.
 */

let model = null;

export async function loadModel() {
  if (model) return model;
  const resp = await fetch(new URL('../data/model_weights.json', import.meta.url));
  model = await resp.json();
  return model;
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Traverse a single decision tree.
 * Each node is either a leaf {v: value} or a split {f: featureIdx, t: threshold, l: left, r: right}
 */
function traverseTree(node, features) {
  while ('f' in node) {
    if (features[node.f] <= node.t) {
      node = node.l;
    } else {
      node = node.r;
    }
  }
  return node.v;
}

/**
 * Build the feature vector for a single employee, matching the Python training pipeline.
 * @param {Object} employee - Raw employee data object
 * @returns {number[]} Feature vector
 */
function buildFeatureVector(employee) {
  if (!model) throw new Error('Model not loaded');

  const { numeric_features, categorical_features, categorical_mappings } = model;
  const features = [];

  // Numeric features first (same order as training)
  for (const feat of numeric_features) {
    features.push(parseFloat(employee[feat]) || 0);
  }

  // Categorical features (label-encoded, same order as training)
  for (const feat of categorical_features) {
    const mapping = categorical_mappings[feat];
    const val = String(employee[feat]);
    // Use the encoded value if found, otherwise 0
    features.push(mapping[val] !== undefined ? mapping[val] : 0);
  }

  return features;
}

/**
 * Predict attrition probability for an employee using Gradient Boosting.
 * Traverses all 200 decision trees and combines with learning rate.
 * @param {Object} employee - Employee data object
 * @returns {number} Probability of attrition (0-1)
 */
export function predictAttrition(employee) {
  if (!model) throw new Error('Model not loaded. Call loadModel() first.');

  const features = buildFeatureVector(employee);
  const { trees, learning_rate, init_value } = model;

  // Start with the initial log-odds prediction
  let rawPrediction = init_value;

  // Sum contributions from all trees
  for (const tree of trees) {
    rawPrediction += learning_rate * traverseTree(tree, features);
  }

  // Convert log-odds to probability via sigmoid
  return sigmoid(rawPrediction);
}

/**
 * Classify employee as Leave/Stay
 */
export function classifyEmployee(employee, threshold = 0.5) {
  const prob = predictAttrition(employee);
  return {
    label: prob >= threshold ? 'Yes' : 'No',
    probability: prob,
  };
}
