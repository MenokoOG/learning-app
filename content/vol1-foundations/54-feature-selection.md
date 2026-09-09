---
title: "Feature Selection"
volume: "vol1-foundations"
part: "Part III — ML Fundamentals"
chapter_number: 54
source_pages: "468-478"
---

# Feature Selection

Feature Selection
More features is not better. The right features is better.
Type: Build Language: Python Prerequisites: Phase 2, Lessons 01-09, 08 (feature engi-
neering) Time: ~75 minutes
Learning Objectives
• Implement filter methods (variance threshold, mutual information, chi-squared) and
wrapper methods (RFE, forward selection) from scratch
• Explain why mutual information captures nonlinear feature-target relationships that cor-
relation misses
• Compare L1 regularization (embedded selection) with RFE (wrapper selection) and eval-
uate their computational tradeoffs
• Build a feature selection pipeline that combines multiple methods and demonstrate im-
proved generalization on held-out data
The Problem
You have 500 features. Your model trains slowly, overfits constantly, and nobody can explain
what it learned. You add more features hoping to improve performance. It gets worse.
This is the curse of dimensionality in action. As the number of features grows, the volume of
the feature space explodes. Data points become sparse. Distances between points converge.
The model needs exponentially more data to find real patterns. Noise features drown out
signal features. Overfitting becomes the default.
Feature selection is the antidote. Strip away the noise. Remove the redundancy. Keep the
features that carry actual information about the target. The result: faster training, better
generalization, and models you can actually explain.
The goal is not to use all available information. It is to use the right information.
The Concept
Three Categories of Feature Selection
Every feature selection method falls into one of three categories:
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/18-feature-selection
Filter methods score each feature independently using a statistical measure. They do not
use a model. Fast, but they miss feature interactions.
Wrapper methods train a model to evaluate feature subsets. They use model performance
as the score. Better results, but expensive because they retrain the model many times.
AIENGINEERINGFROMSCRATCH.COM 464

FEATURE SELECTION
Embedded methods select features as part of model training. L1 regularization drives
weights to zero. Decision trees split on the most useful features. Selection happens during
fitting, not as a separate step.
Variance Threshold
The simplest filter. If a feature barely varies across samples, it carries almost no information.
Consider a feature that is 0.0 for 999 out of 1000 samples. Its variance is near zero. No model
can use it to distinguish between classes. Remove it.
variance(x) = mean((x - mean(x))^2)
Set a threshold (e.g., 0.01). Drop every feature with variance below it. This removes constant
or near-constant features without looking at the target variable at all.
When to use it: as a preprocessing step before other methods. It catches obviously useless
features at near-zero cost.
Limitation: a feature can have high variance and still be pure noise. Variance threshold is
necessary but not sufficient.
Mutual Information
Mutual information measures how much knowing the value of feature X reduces uncertainty
about target Y.
I(X; Y) = sum_x sum_y p(x, y) * log(p(x, y) / (p(x) * p(y)))
If X and Y are independent, p(x, y) = p(x) * p(y), so the log term is zero and I(X; Y) = 0. The
more X tells you about Y, the higher the mutual information.
Key advantage over correlation: mutual information captures nonlinear relationships. A fea-
ture might have zero correlation with the target but high mutual information because the
relationship is quadratic or periodic.
For continuous features, discretize into bins first (histogram-based estimation). The number
of bins affects the estimate – too few bins lose information, too many bins add noise. A common
choice: sqrt(n) bins or Sturges’ rule (1 + log2(n)).
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/18-feature-selection
Recursive Feature Elimination (RFE)
RFE is a wrapper method. It uses a model’s own feature importance to iteratively prune:
1. Train the model with all features
2. Rank features by importance (coefficients for linear models, impurity reduction for trees)
3. Remove the least important feature(s)
4. Repeat until the desired number of features remains
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/18-feature-selection
RFE considers feature interactions because the model sees all remaining features together.
Removing one feature changes the importance of others. This makes it more thorough than
filter methods.
AIENGINEERINGFROMSCRATCH.COM 465

FEATURE SELECTION
The cost: you train the model N - target times. With 500 features and a target of 10, that
is 490 training runs. For expensive models, this is slow. You can speed it up by removing
multiple features per step (e.g., remove the bottom 10% each round).
L1 (Lasso) Regularization
L1 regularization adds the absolute value of weights to the loss function:
loss = prediction_error + alpha * sum(|w_i|)
The alpha parameter controls how aggressively features are pruned. Higher alpha means
more weights go to exactly zero.
Why exactly zero? The L1 penalty creates a diamond-shaped constraint region in weight space.
The optimal solution tends to land at a corner of this diamond, where one or more weights are
zero. L2 regularization (ridge) creates a circular constraint where weights shrink but rarely
hit zero.
This is embedded feature selection: the model learns during training which features to ignore.
Features with zero weight are effectively removed.
Advantages: single training run, handles correlated features (picks one and zeros the others),
built into most linear model implementations.
Limitation: only works for linear models. Cannot capture nonlinear feature importance.
Tree-Based Feature Importance
Decision trees and their ensembles (random forests, gradient boosting) naturally rank fea-
tures. Every split reduces impurity (Gini or entropy for classification, variance for regression).
Features that produce larger impurity reductions are more important.
For a random forest with T trees:
importance(feature_j) = (1/T) * sum over all trees of
sum over all nodes splitting on feature_j of
(n_samples * impurity_decrease)
This gives a normalized importance score for each feature. It handles nonlinear relationships
and feature interactions automatically.
Caution: tree-based importance is biased toward features with many unique values (high
cardinality). A random ID column will appear important because it perfectly splits every
sample. Use permutation importance as a sanity check.
Permutation Importance
A model-agnostic method:
1. Train the model and record baseline performance on validation data
2. For each feature: shuffle its values randomly, measure the drop in performance
3. The bigger the drop, the more important the feature
If shuffling a feature does not hurt performance, the model does not depend on it. If perfor-
mance collapses, that feature is critical.
Permutation importance avoids the cardinality bias of tree-based importance. But it is slow:
one full evaluation per feature, repeated multiple times for stability.
AIENGINEERINGFROMSCRATCH.COM 466

FEATURE SELECTION
Comparison Table
Method Type Speed Nonlinear Feature Interactions
Variance Filter Very fast No No
threshold
Mutual Filter Fast Yes No
information
Correlation Filter Fast No No
filter
RFE Wrapper Slow Depends on Yes
model
L1 / Lasso Embedded Fast No (linear) No
Tree Embedded Medium Yes Yes
importance
Permutation Model- Slow Yes Yes
importance agnostic
Decision Flowchart
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/18-feature-selection
Interactive figure: f3-feature-prune. This one moves. Watch it animate and drag its con-
trols in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases/02-
ml-fundamentals/18-feature-selection
Build It
Step 1: Generate synthetic data with known feature structure
import numpy as np
def make_feature_selection_data(n_samples=500, seed=42):
rng = np.random.RandomState(seed)
x1 = rng.randn(n_samples)
x2 = rng.randn(n_samples)
x3 = rng.randn(n_samples)
x4 = x1 + 0.1 * rng.randn(n_samples)
x5 = x2 + 0.1 * rng.randn(n_samples)
informative = np.column_stack([x1, x2, x3, x4, x5])
correlated = np.column_stack([
x1 * 0.9 + 0.1 * rng.randn(n_samples),
x2 * 0.8 + 0.2 * rng.randn(n_samples),
x3 * 0.7 + 0.3 * rng.randn(n_samples),
x1 * 0.5 + x2 * 0.5 + 0.1 * rng.randn(n_samples),
x2 * 0.6 + x3 * 0.4 + 0.1 * rng.randn(n_samples),
])
AIENGINEERINGFROMSCRATCH.COM 467

FEATURE SELECTION
noise = rng.randn(n_samples, 10) * 0.5
X = np.hstack([informative, correlated, noise])
y = (2 * x1 - 1.5 * x2 + x3 + 0.5 * rng.randn(n_samples) > 0).astype(int)
feature_names = (
[f"info_{i}" for i in range(5)]
+ [f"corr_{i}" for i in range(5)]
+ [f"noise_{i}" for i in range(10)]
)
return X, y, feature_names
We know the ground truth: features 0-4 are informative (plus 3 and 4 are correlated copies of
0 and 1), features 5-9 are correlated with informative features, features 10-19 are pure noise.
A good selection method should rank 0-4 highest and 10-19 lowest.
Step 2: Variance threshold
def variance_threshold(X, threshold=0.01):
variances = np.var(X, axis=0)
mask = variances > threshold
return mask, variances
Step 3: Mutual information (discrete)
def discretize(x, n_bins=10):
min_val, max_val = x.min(), x.max()
if max_val == min_val:
return np.zeros_like(x, dtype=int)
bin_edges = np.linspace(min_val, max_val, n_bins + 1)
binned = np.digitize(x, bin_edges[1:-1])
return binned
def mutual_information(X, y, n_bins=10):
n_samples, n_features = X.shape
mi_scores = np.zeros(n_features)
y_vals, y_counts = np.unique(y, return_counts=True)
p_y = y_counts / n_samples
for f in range(n_features):
x_binned = discretize(X[:, f], n_bins)
x_vals, x_counts = np.unique(x_binned, return_counts=True)
p_x = dict(zip(x_vals, x_counts / n_samples))
mi = 0.0
for xv in x_vals:
for yi, yv in enumerate(y_vals):
joint_mask = (x_binned == xv) & (y == yv)
p_xy = np.sum(joint_mask) / n_samples
if p_xy > 0:
mi += p_xy * np.log(p_xy / (p_x[xv] * p_y[yi]))
AIENGINEERINGFROMSCRATCH.COM 468

FEATURE SELECTION
mi_scores[f] = mi
return mi_scores
Step 4: Recursive Feature Elimination
def simple_logistic_importance(X, y, lr=0.1, epochs=100):
n_samples, n_features = X.shape
w = np.zeros(n_features)
b = 0.0
for _ in range(epochs):
z = X @ w + b
pred = 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))
error = pred - y
w -= lr * (X.T @ error) / n_samples
b -= lr * np.mean(error)
return w, b
def rfe(X, y, n_features_to_select=5, lr=0.1, epochs=100):
n_total = X.shape[1]
remaining = list(range(n_total))
rankings = np.ones(n_total, dtype=int)
rank = n_total
while len(remaining) > n_features_to_select:
X_subset = X[:, remaining]
w, _ = simple_logistic_importance(X_subset, y, lr, epochs)
importances = np.abs(w)
least_idx = np.argmin(importances)
original_idx = remaining[least_idx]
rankings[original_idx] = rank
rank -= 1
remaining.pop(least_idx)
for idx in remaining:
rankings[idx] = 1
selected_mask = rankings == 1
return selected_mask, rankings
Step 5: L1 feature selection
def soft_threshold(w, alpha):
return np.sign(w) * np.maximum(np.abs(w) - alpha, 0)
def l1_feature_selection(X, y, alpha=0.1, lr=0.01, epochs=500):
n_samples, n_features = X.shape
w = np.zeros(n_features)
b = 0.0
AIENGINEERINGFROMSCRATCH.COM 469

FEATURE SELECTION
for _ in range(epochs):
z = X @ w + b
pred = 1.0 / (1.0 + np.exp(-np.clip(z, -500, 500)))
error = pred - y
gradient_w = (X.T @ error) / n_samples
gradient_b = np.mean(error)
w -= lr * gradient_w
w = soft_threshold(w, lr * alpha)
b -= lr * gradient_b
selected_mask = np.abs(w) > 1e-6
return selected_mask, w
Step 6: Tree-based importance (simple decision tree)
def gini_impurity(y):
if len(y) == 0:
return 0.0
classes, counts = np.unique(y, return_counts=True)
probs = counts / len(y)
return 1.0 - np.sum(probs ** 2)
def best_split(X, y, feature_idx):
values = np.unique(X[:, feature_idx])
if len(values) <= 1:
return None, -1.0
best_threshold = None
best_gain = -1.0
parent_gini = gini_impurity(y)
n = len(y)
for i in range(len(values) - 1):
threshold = (values[i] + values[i + 1]) / 2.0
left_mask = X[:, feature_idx] <= threshold
right_mask = ~left_mask
n_left = np.sum(left_mask)
n_right = np.sum(right_mask)
if n_left == 0 or n_right == 0:
continue
gain = parent_gini - (n_left / n) * gini_impurity(y[left_mask]) - (n_right / n) * gini_impurity(y[right_mask])
if gain > best_gain:
best_gain = gain
best_threshold = threshold
return best_threshold, best_gain
AIENGINEERINGFROMSCRATCH.COM 470

FEATURE SELECTION
def tree_importance(X, y, n_trees=50, max_depth=5, seed=42):
rng = np.random.RandomState(seed)
n_samples, n_features = X.shape
importances = np.zeros(n_features)
for _ in range(n_trees):
sample_idx = rng.choice(n_samples, size=n_samples, replace=True)
feature_subset = rng.choice(n_features, size=max(1, int(np.sqrt(n_features))), replace=False)
X_boot = X[sample_idx]
y_boot = y[sample_idx]
tree_imp = _build_tree_importance(X_boot, y_boot, feature_subset, max_depth)
importances += tree_imp
total = importances.sum()
if total > 0:
importances /= total
return importances
def _build_tree_importance(X, y, feature_subset, max_depth, depth=0):
n_features = X.shape[1]
importances = np.zeros(n_features)
if depth >= max_depth or len(np.unique(y)) <= 1 or len(y) < 4:
return importances
best_feature = None
best_threshold = None
best_gain = -1.0
for f in feature_subset:
threshold, gain = best_split(X, y, f)
if gain > best_gain:
best_gain = gain
best_feature = f
best_threshold = threshold
if best_feature is None or best_gain <= 0:
return importances
importances[best_feature] += best_gain * len(y)
left_mask = X[:, best_feature] <= best_threshold
right_mask = ~left_mask
importances += _build_tree_importance(X[left_mask], y[left_mask], feature_subset, max_depth, depth + 1)
importances += _build_tree_importance(X[right_mask], y[right_mask], feature_subset, max_depth, depth + 1)
return importances
AIENGINEERINGFROMSCRATCH.COM 471

FEATURE SELECTION
Step 7: Run all methods and compare
The code file runs all five methods on the same synthetic dataset and prints a comparison
table showing which features each method selects.
Use It
With scikit-learn, feature selection is built into the pipeline:
from sklearn.feature_selection import (
VarianceThreshold,
mutual_info_classif,
RFE,
SelectFromModel,
)
from sklearn.linear_model import Lasso, LogisticRegression
from sklearn.ensemble import RandomForestClassifier
vt = VarianceThreshold(threshold=0.01)
X_filtered = vt.fit_transform(X)
mi_scores = mutual_info_classif(X, y)
top_k = np.argsort(mi_scores)[-10:]
rfe_selector = RFE(LogisticRegression(), n_features_to_select=10)
rfe_selector.fit(X, y)
X_rfe = rfe_selector.transform(X)
lasso_selector = SelectFromModel(Lasso(alpha=0.01))
lasso_selector.fit(X, y)
X_lasso = lasso_selector.transform(X)
rf = RandomForestClassifier(n_estimators=100)
rf.fit(X, y)
importances = rf.feature_importances_
The from-scratch implementations show exactly what happens inside each method. Variance
threshold is just computing var(X, axis=0) and applying a mask. Mutual information is
counting joint and marginal frequencies in a contingency table. RFE is a loop that trains,
ranks, and prunes. L1 is gradient descent with a soft-thresholding step. Tree importance
accumulates impurity reductions across splits. No magic – just statistics and loops.
The sklearn versions add robustness (e.g., mutual_info_classif uses k-NN density estimation
instead of binning), speed (C implementations), and pipeline integration.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/02-ml-fundamentals/18-feature-selection
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/02-ml-fundamentals/18-feature-selection/code
AIENGINEERINGFROMSCRATCH.COM 472

FEATURE SELECTION
1. Forward selection: implement the opposite of RFE. Start with zero features. At each
step, add the feature that improves model performance the most. Stop when adding
features no longer helps. Compare the selected features against RFE results. Which is
faster? Which gives better results?
2. Stability selection: run L1 feature selection 50 times, each time on a random 80%
subsample of the data, with slightly different alpha values. Count how often each feature
is selected. Features selected in > 80% of runs are “stable.” Compare stable features
against single-run L1 selection. Which is more reliable?
3. Multicollinearity detection: compute the correlation matrix for all features. Imple-
ment a function that, given a correlation threshold (e.g., 0.9), removes one feature from
each highly-correlated pair (keeping the one with higher mutual information with the
target). Test on the synthetic dataset and verify it removes the redundant correlated
features.
4. Feature selection pipeline: chain variance threshold, mutual information filter, and
RFE into a single pipeline. First remove near-zero-variance features, then keep the
top 50% by mutual information, then run RFE on the survivors. Compare this pipeline
against running RFE alone on all features. Is the pipeline faster? Is it equally accurate?
5. Permutation importance from scratch: implement permutation importance. For
each feature, shuffle its values 10 times, measure the average drop in F1 score. Com-
pare the ranking against tree-based importance. Find cases where they disagree and
explain why (hint: correlated features).
Key Terms
Term What people say What it actually means
Filter “Score features independently” A feature selection approach that ranks
method features using a statistical measure without
training a model, evaluating each feature in
isolation
Wrapper “Use the model to pick A feature selection approach that evaluates
method features” feature subsets by training a model and
using its performance as the selection
criterion
Embedded “The model selects features Feature selection that happens as part of
method during training” model fitting, such as L1 regularization
driving weights to zero
Mutual “How much one variable tells A measure of the reduction in uncertainty
information you about another” about Y given knowledge of X, capturing
both linear and nonlinear dependencies
Recursive “Train, rank, prune, repeat” An iterative wrapper method that trains a
Feature model, removes the least important
Elimination feature(s), and repeats until a target count
is reached
L1 / Lasso “Penalty that kills features” Adding the sum of absolute weight values
regulariza- to the loss function, which drives
tion unimportant feature weights to exactly zero
AIENGINEERINGFROMSCRATCH.COM 473

FEATURE SELECTION
Term What people say What it actually means
Variance “Remove constant features” Dropping features whose variance across
threshold samples falls below a specified threshold,
filtering out features that carry no
information
Feature “Which features matter most” A score indicating how much each feature
importance contributes to model predictions, computed
from split gains (trees) or coefficient
magnitudes (linear)
Permutation “Shuffle and measure the Evaluating feature importance by randomly
importance damage” shuffling each feature’s values and
measuring the resulting drop in model
performance
Curse of “Too many features, not enough The phenomenon where adding features
dimension- data” increases the volume of the feature space
ality exponentially, making data sparse and
distances meaningless
Further Reading
• An Introduction to Variable and Feature Selection (Guyon & Elisseeff, 2003) – the foun-
dational survey on feature selection methods, still widely referenced
• scikit-learn Feature Selection Guide – practical reference for filter, wrapper, and embed-
ded methods with code examples
• Stability Selection (Meinshausen & Buhlmann, 2010) – combines subsampling with fea-
ture selection for robust, reproducible results
• Beware Default Random Forest Importances (Strobl et al., 2007) – demonstrates the
cardinality bias in tree-based importance and proposes conditional importance as an
alternative
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/02-ml-fundamentals/18-feature-selection
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/02-ml-fundamentals/18-feature-selection/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/02-ml-fundamentals/18-feature-selection
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 474