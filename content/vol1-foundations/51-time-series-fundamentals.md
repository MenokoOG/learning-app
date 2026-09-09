---
title: "Time Series Fundamentals"
volume: "vol1-foundations"
part: "Part III — ML Fundamentals"
chapter_number: 51
source_pages: "437-446"
---

# Time Series Fundamentals

Time Series Fundamentals
Past performance does predict future results – if you check for stationarity first.
Type: Build Language: Python Prerequisites: Phase 2, Lessons 01-09 Time: ~90 minutes
Learning Objectives
• Decompose a time series into trend, seasonality, and residual components and test for
stationarity
• Implement lag features and rolling statistics to convert a time series into a supervised
learning problem
• Build a walk-forward validation framework that prevents future data from leaking into
training
• Explain why random train/test splits are invalid for time series and demonstrate the
performance gap versus proper temporal splits
The Problem
You have data ordered by time. Daily sales, hourly temperature, per-minute CPU usage,
weekly stock prices. You want to predict the next value, the next week, the next quarter.
You reach for your standard ML toolkit: random train/test split, cross-validation, feature ma-
trix in, prediction out. Every step is wrong.
Time series breaks the assumptions that standard ML relies on. Samples are not independent
– today’s temperature depends on yesterday’s. Random splits leak future information into the
past. Features that look great in backtest fail in production because they rely on patterns that
shift over time.
A model that gets 95% accuracy with random cross-validation might get 55% with proper
time-based evaluation. The difference is not a technicality. It is the difference between a
model that works on paper and one that works in production.
This lesson covers the fundamentals: what makes time data different, how to evaluate models
honestly, and how to turn a time series into features that standard ML models can consume.
The Concept
What Makes Time Series Different
Standard ML assumes i.i.d. – independent and identically distributed. Each sample is drawn
from the same distribution, independently of other samples. Time series violates both:
• Not independent. Today’s stock price depends on yesterday’s. This week’s sales cor-
relate with last week’s.
• Not identically distributed. The distribution shifts over time. Sales in December look
different from sales in March.
AIENGINEERINGFROMSCRATCH.COM 433

TIME SERIES FUNDAMENTALS
These violations are not minor. They change how you build features, how you evaluate models,
and which algorithms work.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/15-time-series
In standard ML, samples are interchangeable. Shuffling them changes nothing. In time series,
order is everything. Shuffling destroys the signal.
Components of a Time Series
Every time series is a combination of:
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/15-time-series
• Trend: The long-term direction. Revenue growing 10% per year. Global temperature
rising.
• Seasonality: Repeating patterns at fixed intervals. Retail sales spike in December. Air
conditioning usage peaks in July.
• Residual: Whatever is left after removing trend and seasonality. If the residual looks
like white noise, the decomposition captured the signal.
Stationarity
A time series is stationary if its statistical properties (mean, variance, autocorrelation) do not
change over time. Most forecasting methods assume stationarity.
Why it matters: A non-stationary series has a mean that drifts. A model trained on data from
January has learned a different mean than what February will show. It will be systematically
wrong.
How to check: Compute rolling mean and rolling standard deviation over windows. If they
drift, the series is non-stationary.
How to fix: Differencing. Instead of modeling the raw values, model the change between
consecutive values:
diff[t] = value[t] - value[t-1]
If one round of differencing does not make the series stationary, apply it again (second-order
differencing). Most real-world series need at most two rounds.
Example:
Original series: [100, 102, 106, 112, 120] First difference: [2, 4, 6, 8] (still trending upward)
Second difference: [2, 2, 2] (constant – stationary)
The original series had a quadratic trend. First differencing turned it into a linear trend.
Second differencing made it flat. In practice, you rarely need more than two rounds.
Formal test: The Augmented Dickey-Fuller (ADF) test is the standard statistical test for
stationarity. The null hypothesis is “the series is non-stationary.” A p-value below 0.05 means
you can reject the null and conclude stationarity. We do not implement ADF from scratch (it
requires asymptotic distribution tables), but the rolling statistics approach in our code gives
a practical visual check.
AIENGINEERINGFROMSCRATCH.COM 434

TIME SERIES FUNDAMENTALS
Autocorrelation
Autocorrelation measures how much a value at time t correlates with the value at time t-k (k
steps in the past). The autocorrelation function (ACF) plots this correlation for each lag k.
ACF tells you: - How far back the series remembers. If ACF drops to zero after lag 5, values
more than 5 steps ago are irrelevant. - Whether seasonality exists. If ACF spikes at lag 12
(monthly data), there is yearly seasonality. - How many lag features to create. Use lags up to
where ACF becomes negligible.
PACF (Partial Autocorrelation Function) removes indirect correlations. If today corre-
lates with 3 days ago only because both correlate with yesterday, PACF at lag 3 will be zero
while ACF at lag 3 will not.
Lag Features: Turning Time Series into Supervised Learning
Standard ML models need a feature matrix X and a target y. Time series gives you a single
column of values. The bridge is lag features.
Take the series [10, 12, 14, 13, 15] and create lag-1 and lag-2 features:
lag_2 lag_1 target
10 12 14
12 14 13
14 13 15
Now you have a standard regression problem. Any ML model (linear regression, random
forest, gradient boosting) can predict the target from the lags.
Additional features you can engineer: - Rolling statistics: mean, std, min, max over the last
k values - Calendar features: day of week, month, is_holiday, is_weekend - Differenced val-
ues: change from previous step - Expanding statistics: cumulative mean, cumulative sum
- Ratio features: current value / rolling mean (how far from recent average) - Interaction
features: lag_1 * day_of_week (weekday effects on momentum)
How many lags? Use the autocorrelation function. If ACF is significant up to lag 10, use at
least 10 lags. If there is weekly seasonality, include lag 7 (and possibly 14). More lags give
the model more history but also more features to fit, increasing the risk of overfitting.
The target alignment trap. When creating lag features, the target must be the value at
time t, and all features must use values at time t-1 or earlier. If you accidentally include the
value at time t as a feature, you have a perfect predictor – and a completely useless model.
This is the most common bug in time series feature engineering.
Walk-Forward Validation
This is the most important concept in this lesson. Standard k-fold cross-validation randomly
assigns samples to train and test. For time series, this leaks future information.
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/02-ml-fundamentals/15-time-series
Walk-forward validation: 1. Train on data up to time t 2. Predict at time t+1 (or t+1 to t+k
for multi-step) 3. Slide the window forward 4. Repeat
Each test fold only contains data that comes after all training data. No future leakage. This
gives you an honest estimate of how the model will perform when deployed.
AIENGINEERINGFROMSCRATCH.COM 435

TIME SERIES FUNDAMENTALS
Expanding window uses all historical data for training (window grows). Sliding window
uses a fixed-size training window (window slides). Use expanding when you believe older
data is still relevant. Use sliding when the world changes and old data hurts.
ARIMA Intuition
ARIMA is the classical time series model. It has three components:
• AR (Autoregressive): Predict from past values. AR(p) uses the last p values.
• I (Integrated): Differencing to achieve stationarity. I(d) applies d rounds of differenc-
ing.
• MA (Moving Average): Predict from past forecast errors. MA(q) uses the last q errors.
ARIMA(p, d, q) combines all three. You choose p, d, q based on ACF/PACF analysis or auto-
mated search (auto-ARIMA).
We will not implement ARIMA from scratch – it requires numerical optimization that is beyond
the scope of this lesson. The key insight is understanding what each component does so you
can interpret ARIMA results and know when to use it.
When to Use What
Approach Best For Handles Seasonality Handles External Features
Lag features Tabular With calendar features Yes
+ ML with many
external
features
ARIMA Single SARIMA variant No (ARIMAX for limited)
univariate
series,
short-term
Exponential Simple Yes (Holt-Winters) No
smoothing trend +
seasonality
Prophet Business Yes (Fourier terms) Limited
forecasting,
holidays
Neural Long Learned Yes
networks sequences,
(LSTM, many series
Transformer)
For most practical problems, lag features + gradient boosting is the strongest starting point.
It handles external features naturally, does not require stationarity, and is easy to debug.
Forecasting Horizons and Strategies
Single-step forecasting predicts one time step ahead. Multi-step forecasting predicts multiple
steps. There are three strategies:
Recursive (iterated): Predict one step ahead, use the prediction as input for the next step.
Simple but errors accumulate – each prediction uses the previous prediction, so mistakes
compound.
AIENGINEERINGFROMSCRATCH.COM 436

TIME SERIES FUNDAMENTALS
Direct: Train a separate model for each horizon. Model-1 predicts t+1, Model-5 predicts
t+5. No error accumulation, but each model has fewer training samples and they do not
share information.
Multi-output: Train one model that outputs all horizons simultaneously. Shares informa-
tion across horizons but requires a model that supports multiple outputs (or a custom loss
function).
For most practical problems, start with recursive for short horizons (1-5 steps) and direct for
longer horizons.
Common Mistakes in Time Series
Mistake Why it happens How to fix
Random train/test Habit from standard ML Use walk-forward or
split temporal split
Using future features Feature at time t included by mistake Audit every feature for
temporal alignment
Overfitting to Model memorizes calendar patterns Hold out a full seasonal
seasonality cycle in the test set
Ignoring scale Revenue doubles but patterns stay Model percentage change
changes instead of absolute
Too many lag features “More history is better” Use ACF to determine
relevant lags
Not differencing “The model will figure it out” Tree models handle trends;
linear models need
stationarity
Interactive figure: f3-series-decompose. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/02-ml-fundamentals/15-time-series
Build It
The code in code/time_series.py implements the core building blocks from scratch.
Lag Feature Creator
def make_lag_features(series, n_lags):
n = len(series)
X = np.full((n, n_lags), np.nan)
for lag in range(1, n_lags + 1):
X[lag:, lag - 1] = series[:-lag]
valid = ~np.isnan(X).any(axis=1)
return X[valid], series[valid]
This converts a 1D series into a feature matrix where each row has the last n_lags values as
features, and the current value as the target.
AIENGINEERINGFROMSCRATCH.COM 437

TIME SERIES FUNDAMENTALS
Walk-Forward Cross-Validation
def walk_forward_split(n_samples, n_splits=5, min_train=50):
assert min_train < n_samples, "min_train must be less than n_samples"
step = max(1, (n_samples - min_train) // n_splits)
for i in range(n_splits):
train_end = min_train + i * step
test_end = min(train_end + step, n_samples)
if train_end >= n_samples:
break
yield slice(0, train_end), slice(train_end, test_end)
Each split ensures training data comes strictly before test data. The training window expands
with each fold.
Simple Autoregressive Model
A pure AR model is just linear regression on lag features:
class SimpleAR:
def __init__(self, n_lags=5):
self.n_lags = n_lags
self.weights = None
self.bias = None
def fit(self, series):
X, y = make_lag_features(series, self.n_lags)
# Solve via normal equations
X_b = np.column_stack([np.ones(len(X)), X])
theta = np.linalg.lstsq(X_b, y, rcond=None)[0]
self.bias = theta[0]
self.weights = theta[1:]
return self
This is conceptually identical to linear regression from Lesson 02, but applied to time-lagged
versions of the same variable.
Stationarity Check
The code computes rolling statistics to visually and numerically assess stationarity:
def check_stationarity(series, window=50):
rolling_mean = np.array([
series[max(0, i - window):i].mean()
for i in range(1, len(series) + 1)
])
rolling_std = np.array([
series[max(0, i - window):i].std()
for i in range(1, len(series) + 1)
])
return rolling_mean, rolling_std
If the rolling mean drifts or the rolling std changes, the series is non-stationary. Apply differ-
encing and check again.
The code also checks stationarity by comparing the first half and second half of the series. If
the means differ by more than half a standard deviation or the variance ratio exceeds 2x, the
AIENGINEERINGFROMSCRATCH.COM 438

TIME SERIES FUNDAMENTALS
series is flagged as non-stationary.
Autocorrelation
def autocorrelation(series, max_lag=20):
n = len(series)
mean = series.mean()
var = series.var()
acf = np.zeros(max_lag + 1)
for k in range(max_lag + 1):
cov = np.mean((series[:n-k] - mean) * (series[k:] - mean))
acf[k] = cov / var if var > 0 else 0
return acf
Use It
With sklearn, you use lag features directly with any regressor:
from sklearn.linear_model import Ridge
from sklearn.ensemble import GradientBoostingRegressor
X, y = make_lag_features(series, n_lags=10)
for train_idx, test_idx in walk_forward_split(len(X)):
model = Ridge(alpha=1.0)
model.fit(X[train_idx], y[train_idx])
predictions = model.predict(X[test_idx])
For ARIMA, use statsmodels:
from statsmodels.tsa.arima.model import ARIMA
model = ARIMA(train_series, order=(5, 1, 2))
fitted = model.fit()
forecast = fitted.forecast(steps=30)
The code in time_series.py demonstrates both approaches and compares them using walk-
forward validation.
sklearn TimeSeriesSplit
sklearn provides TimeSeriesSplit which implements walk-forward validation:
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)
for train_index, test_index in tscv.split(X):
X_train, X_test = X[train_index], X[test_index]
y_train, y_test = y[train_index], y[test_index]
model.fit(X_train, y_train)
score = model.score(X_test, y_test)
This is equivalent to our from-scratch walk_forward_split but integrated into sklearn’s cross-
validation framework. You can use it with cross_val_score:
AIENGINEERINGFROMSCRATCH.COM 439

TIME SERIES FUNDAMENTALS
from sklearn.model_selection import cross_val_score
scores = cross_val_score(model, X, y, cv=TimeSeriesSplit(n_splits=5))
print(f"Mean score: {scores.mean():.4f} +/- {scores.std():.4f}")
Evaluation Metrics
Time series forecasting uses regression metrics, but with time-aware context:
• MAE (Mean Absolute Error): Average of |y_true - y_pred|. Easy to interpret in original
units. “On average, predictions are off by 3.2 degrees.”
• RMSE (Root Mean Squared Error): Square root of mean squared error. Penalizes
large errors more than MAE. Use when big errors are worse than many small errors.
• MAPE (Mean Absolute Percentage Error): Average of |error / true_value| * 100.
Scale-independent, useful for comparing across different series. But undefined when
true values are zero.
• Naive baseline comparison: Always compare against simple baselines. The seasonal
naive baseline predicts the value from one period ago (yesterday, last week). If your
model cannot beat naive, something is wrong.
Rolling Features
The code demonstrates adding rolling statistics (mean, std, min, max over windows of 7 and
14 days) to lag features. These give the model information about recent trends and volatility
that lag features alone do not capture.
For example, if the rolling mean is rising, it suggests an upward trend. If the rolling std is
increasing, it suggests growing volatility. These are the kinds of patterns that tree-based
models can learn from but linear models cannot.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/02-ml-fundamentals/15-time-series
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/02-ml-fundamentals/15-time-series/code
1. Stationarity experiment. Generate a series with a linear trend. Check stationarity with
rolling statistics. Apply first differencing. Check again. How many rounds of differencing
does it take for a quadratic trend?
2. Lag selection. Compute ACF on a seasonal series (period=7). Which lags have the
highest autocorrelation? Create lag features using only those lags (not consecutive lags).
Does accuracy improve compared to using lags 1 through 7?
3. Walk-forward vs random split. Train a Ridge regression on lag features. Evaluate
with random 80/20 split and with walk-forward validation. How much does the random
split overestimate performance?
4. Feature engineering. Add rolling mean (window=7), rolling std (window=7), and day-
of-week features to the lag features. Compare accuracy with and without these extras
using walk-forward validation.
AIENGINEERINGFROMSCRATCH.COM 440

TIME SERIES FUNDAMENTALS
5. Multi-step forecasting. Modify the AR model to predict 5 steps ahead instead of 1.
Compare two strategies: (a) predict one step, use the prediction as input for the next
step (recursive), and (b) train separate models for each horizon (direct). Which is more
accurate?
Key Terms
Term What people say What it actually means
Stationarity “The stats don’t change over A series whose mean, variance, and
time” autocorrelation structure are constant over
time
Differencing “Subtract consecutive values” Computing y[t] - y[t-1] to remove trends
and achieve stationarity
Autocorrelatio“nHow a series correlates with The correlation between a time series and a
(ACF) itself” lagged copy of itself, as a function of the lag
Partial auto- “Direct correlation only” Autocorrelation at lag k after removing the
correlation effect of all shorter lags
(PACF)
Lag “Past values as inputs” Using y[t-1], y[t-2], …, y[t-k] as features to
features predict y[t]
Walk- “Time-respecting Evaluation where training data always
forward cross-validation” precedes test data chronologically
validation
ARIMA “The classic time series model” AutoRegressive Integrated Moving
Average: combines past values (AR),
differencing (I), and past errors (MA)
Seasonality “Repeating calendar patterns” Regular, predictable cycles in a time series
tied to calendar periods (daily, weekly,
yearly)
Trend “The long-term direction” A persistent increase or decrease in the
series level over time
Expanding “Use all history” Walk-forward validation where the training
window set grows with each fold
Sliding “Fixed-size history” Walk-forward validation where the training
window set is a fixed-length window that slides
forward
Further Reading
• Hyndman and Athanasopoulos, Forecasting: Principles and Practice (3rd ed.) – the best
free textbook on time series forecasting
• scikit-learn Time Series Split – sklearn’s walk-forward splitter
• statsmodels ARIMA docs – ARIMA implementation with diagnostics
• Makridakis et al., The M5 Competition (2022) – large-scale forecasting competition show-
ing ML methods vs statistical methods
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/02-ml-fundamentals/15-time-series
AIENGINEERINGFROMSCRATCH.COM 441

TIME SERIES FUNDAMENTALS
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/02-ml-fundamentals/15-time-series/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/02-ml-fundamentals/15-time-series
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 442