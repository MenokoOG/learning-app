---
title: "Activation Functions"
volume: "vol2-deep-learning"
part: "Part I — Deep Learning Core"
chapter_number: 6
source_pages: "34-44"
---

# Activation Functions

Activation Functions
Without nonlinearity, your 100-layer network is a fancy matrix multiply. Activations
are the gates that let neural networks think in curves.
Type: Build Languages: Python Prerequisites: Lesson 03.03 (Backpropagation) Time:
~75 minutes
Learning Objectives
• Implement sigmoid, tanh, ReLU, Leaky ReLU, GELU, Swish, and softmax with their
derivatives from scratch
• Diagnose the vanishing gradient problem by measuring activation magnitudes through
10+ layers with different activations
• Detect dead neurons in a ReLU network and explain why GELU avoids this failure mode
• Select the correct activation function for a given architecture (transformer, CNN, RNN,
output layer)
The Problem
Stack two linear transformations: y = W2(W1x + b1) + b2. Expand it: y = W2W1x + W2b1 +
b2. That’s just y = Ax + c – a single linear transformation. No matter how many linear layers
you stack, the result collapses to one matrix multiply. Your 100-layer network has the same
representational power as a single layer.
This is not a theoretical curiosity. It means a deep linear network literally cannot learn XOR,
cannot classify a spiral dataset, cannot recognize a face. Without activation functions, depth
is an illusion.
Activation functions break the linearity. They warp the output of each layer through a non-
linear function, giving the network the ability to bend decision boundaries, approximate arbi-
trary functions, and actually learn. But pick the wrong activation and your gradients vanish
to zero (sigmoid in deep networks), explode to infinity (unbounded activations without care-
ful initialization), or your neurons die permanently (ReLU with large negative biases). The
choice of activation function directly determines whether your network learns at all.
The Concept
Why Nonlinearity Is Necessary
Matrix multiplication is composable. Multiplying a vector by matrix A then matrix B is identi-
cal to multiplying by AB. This means stacking ten linear layers is mathematically equivalent
to one linear layer with one big matrix. All those parameters, all that depth – wasted. You
need something to break the chain. That’s what activation functions do.
Here is the proof. A linear layer computes f(x) = Wx + b. Stack two:
AIENGINEERINGFROMSCRATCH.COM 30

ACTIVATION FUNCTIONS
Layer 1: h = W1 * x + b1
Layer 2: y = W2 * h + b2
Substitute:
y = W2 * (W1 * x + b1) + b2
y = (W2 * W1) * x + (W2 * b1 + b2)
y = A * x + c
One layer. Insert a nonlinear activation g() between layers:
h = g(W1 * x + b1)
y = W2 * h + b2
Now the substitution breaks. W2 * g(W1 * x + b1) + b2 cannot be reduced to a single linear
transformation. The network can represent nonlinear functions. Each additional layer with
an activation adds representational capacity.
Sigmoid
The original activation function for neural networks.
sigmoid(x) = 1 / (1 + e^(-x))
Output range: (0, 1). Smooth, differentiable, maps any real number to a probability-like value.
The derivative:
sigmoid'(x) = sigmoid(x) * (1 - sigmoid(x))
The maximum value of this derivative is 0.25, occurring at x = 0. In backpropagation, gradi-
ents multiply through layers. Ten layers of sigmoid means the gradient gets multiplied by at
most 0.25 ten times:
0.25^10 = 0.000000953674
Less than one millionth of the original signal. This is the vanishing gradient problem. Gra-
dients in early layers become so small that weights barely update. The network appears to
learn – loss decreases in later layers – but the first layers are frozen. Deep sigmoid networks
simply do not train.
Additional problem: sigmoid outputs are always positive (0 to 1), which means gradients on
weights are always the same sign. This causes zig-zagging during gradient descent.
Tanh
The centered version of sigmoid.
tanh(x) = (e^x - e^(-x)) / (e^x + e^(-x))
Output range: (-1, 1). Zero-centered, which eliminates the zig-zag problem.
The derivative:
tanh'(x) = 1 - tanh(x)^2
Maximum derivative is 1.0 at x = 0 – four times better than sigmoid. But the vanishing
gradient problem still exists. For large positive or negative inputs, the derivative approaches
zero. Ten layers still crush the gradient, just less aggressively.
AIENGINEERINGFROMSCRATCH.COM 31

ACTIVATION FUNCTIONS
ReLU: The Breakthrough
Rectified Linear Unit. Popularized for deep learning by Nair and Hinton in 2010 (the function
itself dates to Fukushima’s 1969 work), it changed everything.
relu(x) = max(0, x)
Output range: [0, infinity). The derivative is trivially simple:
relu'(x) = 1 if x > 0
0 if x <= 0
No vanishing gradient for positive inputs. The gradient is exactly 1, passed straight through.
This is why deep networks became trainable – ReLU preserves gradient magnitude across
layers.
But there is a failure mode: the dead neuron problem. If a neuron’s weighted input is always
negative (due to a large negative bias or unfortunate weight initialization), its output is always
zero, its gradient is always zero, and it never updates. It is permanently dead. In practice,
10-40% of neurons in a ReLU network can die during training.
Leaky ReLU
The simplest fix for dead neurons.
leaky_relu(x) = x if x > 0
alpha * x if x <= 0
Where alpha is a small constant, typically 0.01. The negative side has a small slope instead
of zero, so dead neurons still get a gradient signal and can recover.
GELU: The Modern Default
Gaussian Error Linear Unit. Introduced by Hendrycks and Gimpel in 2016. Default activation
in BERT, GPT, and most modern transformers.
gelu(x) = x * Phi(x)
Where Phi(x) is the cumulative distribution function of the standard normal distribution. The
approximation used in practice:
gelu(x) ~= 0.5 * x * (1 + tanh(sqrt(2/pi) * (x + 0.044715 * x^3)))
GELU is smooth everywhere, allows small negative values (unlike ReLU which hard-clips to
zero), and has a probabilistic interpretation: it weights each input by how likely it is to be
positive under a Gaussian distribution. This smooth gating outperforms ReLU in transformer
architectures because it provides better gradient flow and avoids the dead neuron problem
entirely.
Swish / SiLU
Self-gated activation discovered by Ramachandran et al. in 2017 through automated search.
swish(x) = x * sigmoid(x)
Swish is formally x * sigmoid(x). Google discovered it through automated search over activa-
tion function space – a neural network designing parts of neural networks.
Like GELU, it is smooth, non-monotonic, and allows small negative values. The difference
is subtle: Swish uses sigmoid for gating while GELU uses the Gaussian CDF. In practice,
AIENGINEERINGFROMSCRATCH.COM 32

ACTIVATION FUNCTIONS
performance is nearly identical. Swish is used in EfficientNet and some vision models. GELU
dominates in language models.
Softmax: The Output Activation
Not used in hidden layers. Softmax converts a vector of raw scores (logits) into a probability
distribution.
softmax(x_i) = e^(x_i) / sum(e^(x_j) for all j)
Every output is between 0 and 1. All outputs sum to 1. This makes it the standard final
activation for multi-class classification. The largest logit gets the highest probability, but
unlike argmax, softmax is differentiable and preserves information about relative confidence.
Comparison of Shapes
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/03-deep-learning-core/04-activation-functions
Gradient Flow Comparison
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/03-deep-learning-core/04-activation-functions
Which Activation When
Diagram. Rendered live in the web edition: https://aiengineeringfromscratch.com/lesson.ht
ml?path=phases/03-deep-learning-core/04-activation-functions
Interactive figure: softmax-temperature. This one moves. Watch it animate and drag its
controls in the web edition: https://aiengineeringfromscratch.com/lesson.html?path=phases
/03-deep-learning-core/04-activation-functions
Build It
Step 1: Implement All Activation Functions with Derivatives
Each function takes a single float and returns a float. Each derivative function takes the same
input and returns the gradient.
import math
def sigmoid(x):
x = max(-500, min(500, x))
return 1.0 / (1.0 + math.exp(-x))
def sigmoid_derivative(x):
s = sigmoid(x)
return s * (1 - s)
def tanh_act(x):
return math.tanh(x)
def tanh_derivative(x):
AIENGINEERINGFROMSCRATCH.COM 33

ACTIVATION FUNCTIONS
t = math.tanh(x)
return 1 - t * t
def relu(x):
return max(0.0, x)
def relu_derivative(x):
return 1.0 if x > 0 else 0.0
def leaky_relu(x, alpha=0.01):
return x if x > 0 else alpha * x
def leaky_relu_derivative(x, alpha=0.01):
return 1.0 if x > 0 else alpha
def gelu(x):
return 0.5 * x * (1 + math.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))
def gelu_derivative(x):
phi = 0.5 * (1 + math.erf(x / math.sqrt(2)))
pdf = math.exp(-0.5 * x * x) / math.sqrt(2 * math.pi)
return phi + x * pdf
def swish(x):
return x * sigmoid(x)
def swish_derivative(x):
s = sigmoid(x)
return s + x * s * (1 - s)
def softmax(xs):
max_x = max(xs)
exps = [math.exp(x - max_x) for x in xs]
total = sum(exps)
return [e / total for e in exps]
Step 2: Visualize Where Gradients Die
Compute the gradient at 100 evenly-spaced points from -5 to 5. Print a text histogram showing
where each activation’s gradient is near-zero.
def gradient_scan(name, derivative_fn, start=-5, end=5, n=100):
step = (end - start) / n
near_zero = 0
healthy = 0
for i in range(n):
x = start + i * step
g = derivative_fn(x)
if abs(g) < 0.01:
near_zero += 1
else:
healthy += 1
pct_dead = near_zero / n * 100
print(f"{name:15s}: {healthy:3d} healthy, {near_zero:3d} near-zero ({pct_dead:.0f}% dead zone)")
AIENGINEERINGFROMSCRATCH.COM 34

ACTIVATION FUNCTIONS
gradient_scan("Sigmoid", sigmoid_derivative)
gradient_scan("Tanh", tanh_derivative)
gradient_scan("ReLU", relu_derivative)
gradient_scan("Leaky ReLU", leaky_relu_derivative)
gradient_scan("GELU", gelu_derivative)
gradient_scan("Swish", swish_derivative)
Step 3: Vanishing Gradient Experiment
Forward-pass a signal through N layers using sigmoid vs ReLU. Measure how the activation
magnitude changes.
import random
def vanishing_gradient_experiment(activation_fn, name, n_layers=10, n_inputs=5):
random.seed(42)
values = [random.gauss(0, 1) for _ in range(n_inputs)]
print(f"\n{name} through {n_layers} layers:")
for layer in range(n_layers):
weights = [random.gauss(0, 1) for _ in range(n_inputs)]
z = sum(w * v for w, v in zip(weights, values))
activated = activation_fn(z)
magnitude = abs(activated)
bar = "#" * int(magnitude * 20)
print(f" Layer {layer+1:2d}: magnitude = {magnitude:.6f} {bar}")
values = [activated] * n_inputs
vanishing_gradient_experiment(sigmoid, "Sigmoid")
vanishing_gradient_experiment(relu, "ReLU")
vanishing_gradient_experiment(gelu, "GELU")
Step 4: Dead Neuron Detector
Create a ReLU network, pass random inputs through it, count how many neurons never fire.
def dead_neuron_detector(n_inputs=5, hidden_size=20, n_samples=1000):
random.seed(0)
weights = [[random.gauss(0, 1) for _ in range(n_inputs)] for _ in range(hidden_size)]
biases = [random.gauss(0, 1) for _ in range(hidden_size)]
fire_counts = [0] * hidden_size
for _ in range(n_samples):
inputs = [random.gauss(0, 1) for _ in range(n_inputs)]
for neuron_idx in range(hidden_size):
z = sum(w * x for w, x in zip(weights[neuron_idx], inputs)) + biases[neuron_idx]
if relu(z) > 0:
fire_counts[neuron_idx] += 1
dead = sum(1 for c in fire_counts if c == 0)
rarely_fire = sum(1 for c in fire_counts if 0 < c < n_samples * 0.05)
healthy = hidden_size - dead - rarely_fire
AIENGINEERINGFROMSCRATCH.COM 35

ACTIVATION FUNCTIONS
print(f"\nDead Neuron Report ({hidden_size} neurons, {n_samples} samples):")
print(f" Dead (never fired): {dead}")
print(f" Barely alive (<5%): {rarely_fire}")
print(f" Healthy: {healthy}")
print(f" Dead neuron rate: {dead/hidden_size*100:.1f}%")
for i, c in enumerate(fire_counts):
status = "DEAD" if c == 0 else "WEAK" if c < n_samples * 0.05 else "OK"
bar = "#" * (c * 40 // n_samples)
print(f" Neuron {i:2d}: {c:4d}/{n_samples} fires [{status:4s}] {bar}")
dead_neuron_detector()
Step 5: Training Comparison – Sigmoid vs ReLU vs GELU
Train the same two-layer network on the circle dataset (points inside a circle = class 1, outside
= class 0) with three different activations. Compare convergence speed.
def make_circle_data(n=200, seed=42):
random.seed(seed)
data = []
for _ in range(n):
x = random.uniform(-2, 2)
y = random.uniform(-2, 2)
label = 1.0 if x * x + y * y < 1.5 else 0.0
data.append(([x, y], label))
return data
class ActivationNetwork:
def __init__(self, activation_fn, activation_deriv, hidden_size=8, lr=0.1):
random.seed(0)
self.act = activation_fn
self.act_d = activation_deriv
self.lr = lr
self.hidden_size = hidden_size
self.w1 = [[random.gauss(0, 0.5) for _ in range(2)] for _ in range(hidden_size)]
self.b1 = [0.0] * hidden_size
self.w2 = [random.gauss(0, 0.5) for _ in range(hidden_size)]
self.b2 = 0.0
def forward(self, x):
self.x = x
self.z1 = []
self.h = []
for i in range(self.hidden_size):
z = self.w1[i][0] * x[0] + self.w1[i][1] * x[1] + self.b1[i]
self.z1.append(z)
self.h.append(self.act(z))
self.z2 = sum(self.w2[i] * self.h[i] for i in range(self.hidden_size)) + self.b2
self.out = sigmoid(self.z2)
return self.out
AIENGINEERINGFROMSCRATCH.COM 36

ACTIVATION FUNCTIONS
def backward(self, target):
error = self.out - target
d_out = error * self.out * (1 - self.out)
for i in range(self.hidden_size):
d_h = d_out * self.w2[i] * self.act_d(self.z1[i])
self.w2[i] -= self.lr * d_out * self.h[i]
for j in range(2):
self.w1[i][j] -= self.lr * d_h * self.x[j]
self.b1[i] -= self.lr * d_h
self.b2 -= self.lr * d_out
def train(self, data, epochs=200):
losses = []
for epoch in range(epochs):
total_loss = 0
correct = 0
for x, y in data:
pred = self.forward(x)
self.backward(y)
total_loss += (pred - y) ** 2
if (pred >= 0.5) == (y >= 0.5):
correct += 1
avg_loss = total_loss / len(data)
accuracy = correct / len(data) * 100
losses.append(avg_loss)
if epoch % 50 == 0 or epoch == epochs - 1:
print(f" Epoch {epoch:3d}: loss={avg_loss:.4f}, accuracy={accuracy:.1f}%")
return losses
data = make_circle_data()
configs = [
("Sigmoid", sigmoid, sigmoid_derivative),
("ReLU", relu, relu_derivative),
("GELU", gelu, gelu_derivative),
]
results = {}
for name, act_fn, act_d_fn in configs:
print(f"\n=== Training with {name} ===")
net = ActivationNetwork(act_fn, act_d_fn, hidden_size=8, lr=0.1)
losses = net.train(data, epochs=200)
results[name] = losses
print("\n=== Final Loss Comparison ===")
for name, losses in results.items():
print(f" {name:10s}: start={losses[0]:.4f} -> end={losses[-1]:.4f} (improvement: {(1 - losses[-1]/losses[0])*100:.1f}%)")
AIENGINEERINGFROMSCRATCH.COM 37

ACTIVATION FUNCTIONS
Use It
PyTorch provides all of these as both functional and module forms:
import torch
import torch.nn as nn
import torch.nn.functional as F
x = torch.randn(4, 10)
relu_out = F.relu(x)
gelu_out = F.gelu(x)
sigmoid_out = torch.sigmoid(x)
swish_out = F.silu(x)
logits = torch.randn(4, 5)
probs = F.softmax(logits, dim=1)
model = nn.Sequential(
nn.Linear(10, 64),
nn.GELU(),
nn.Linear(64, 32),
nn.GELU(),
nn.Linear(32, 5),
)
Hidden layers in a transformer: GELU. Hidden layers in a CNN: ReLU. Output layer for clas-
sification: softmax. Output layer for regression: none (linear). Output layer for probabilities:
sigmoid. That’s it. Start with these defaults. Change them only when you have evidence.
RNNs and LSTMs use tanh for hidden state and sigmoid for gates, but if you’re building from
scratch today, you’re probably not using RNNs. If neurons are dying in your ReLU network,
switch to GELU. Don’t reach for Leaky ReLU unless you have a specific reason – GELU solves
the dead neuron problem and gives better gradient flow.
This chapter ships an artifact. The course version of this lesson produces a reusable
prompt or agent skill. It lives in the repository, ready to install: https://github.com/rohitg00/ai-
engineering-from-scratch/tree/main/phases/03-deep-learning-core/04-activation-functions
Exercises
Starter code and the lesson’s working implementation: https://github.com/rohitg00/ai-engi
neering-from-scratch/tree/main/phases/03-deep-learning-core/04-activation-functions/code
1. Implement Parametric ReLU (PReLU) where the negative slope alpha is a learnable pa-
rameter. Train it on the circle dataset and compare to fixed Leaky ReLU.
2. Run the vanishing gradient experiment with 50 layers instead of 10. Plot the magnitude
at each layer for sigmoid, tanh, ReLU, and GELU. At which layer does each activation’s
signal effectively reach zero?
3. Implement the ELU (Exponential Linear Unit): elu(x) = x if x > 0, alpha * (e^x - 1) if x
<= 0. Compare its dead neuron rate to ReLU on the same network.
4. Build a “gradient health monitor” that runs during training: at each epoch, compute the
average gradient magnitude at each layer. Print a warning when any layer’s gradient
AIENGINEERINGFROMSCRATCH.COM 38

ACTIVATION FUNCTIONS
drops below 0.001 or exceeds 100.
5. Modify the training comparison to use the XOR dataset from Lesson 01 instead of circles.
Which activation converges fastest on XOR? Why does this differ from the circle results?
Key Terms
Term What people say What it actually means
Activation “The nonlinear part” A function applied to each neuron’s output
function that breaks linearity, enabling the network
to learn nonlinear mappings
Vanishing “Gradients disappear in deep Gradients shrink exponentially through
gradient networks” layers when the activation’s derivative is
less than 1, making early layers untrainable
Exploding “Gradients blow up” Gradients grow exponentially through
gradient layers when the effective multiplier
exceeds 1, causing unstable training
Dead “A neuron that stopped A ReLU neuron whose input is permanently
neuron learning” negative, producing zero output and zero
gradient
Sigmoid “Squishes values to 0-1” The logistic function 1/(1+e^-x),
historically important but causes vanishing
gradients in deep networks
ReLU “Clips negatives to zero” max(0, x) – the activation that made deep
learning practical by preserving gradient
magnitude
GELU “The transformer activation” Gaussian Error Linear Unit, a smooth
activation that weights inputs by their
probability of being positive
Swish/SiLU “Self-gated ReLU” x * sigmoid(x), discovered through
automated search, used in EfficientNet
Softmax “Turns scores into Normalizes a vector of logits into a
probabilities” probability distribution where all values are
in (0,1) and sum to 1
Leaky “ReLU that doesn’t die” max(alpha*x, x) where alpha is small (0.01),
ReLU preventing dead neurons by allowing small
negative gradients
Saturation “The flat part of sigmoid” Regions where an activation’s derivative
approaches zero, blocking gradient flow
Logit “The raw score before softmax” The unnormalized output of the final layer
before applying softmax or sigmoid
Further Reading
• Nair & Hinton, “Rectified Linear Units Improve Restricted Boltzmann Machines” (2010)
– the paper that introduced ReLU and enabled training of deep networks
• Hendrycks & Gimpel, “Gaussian Error Linear Units (GELUs)” (2016) – introduced the
activation function that became the default for transformers
• Ramachandran et al., “Searching for Activation Functions” (2017) – used automated
search to discover Swish, showing that activation design can be automated
AIENGINEERINGFROMSCRATCH.COM 39

ACTIVATION FUNCTIONS
• Glorot & Bengio, “Understanding the difficulty of training deep feedforward neural net-
works” (2010) – the paper that diagnosed vanishing/exploding gradients and proposed
Xavier initialization
• Goodfellow, Bengio, Courville, “Deep Learning” Chapter 6.3 (https://www.deeplearningbook.org/)
– rigorous treatment of hidden units and activation functions
Continue online. The living edition of this chapter has more than the page can hold:
• Animated, interactive figures and the web text: https://aiengineeringfromscratch.com/l
esson.html?path=phases/03-deep-learning-core/04-activation-functions
• Runnable code for every step: https://github.com/rohitg00/ai-engineering-from-scratc
h/tree/main/phases/03-deep-learning-core/04-activation-functions/code
• The chapter quiz, graded in the browser: https://aiengineeringfromscratch.com/lesson.
html?path=phases/03-deep-learning-core/04-activation-functions
The repository moves faster than any printing. When the book and the repo disagree, trust
the repo.
AIENGINEERINGFROMSCRATCH.COM 40