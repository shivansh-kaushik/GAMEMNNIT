"""
confidence_cone_sim.py
Phase 3: Confidence Cone Decision Suppression Analysis

Scenario: A user arrives at a junction with two possible turns.
The system must decide whether to give a confident direction or abstain.

Key concept: if the Confidence Cone angular width (2 * sigma_theta) 
exceeds the angular separation between the two candidate turns,
the system ABSTAINS (correct behaviour under uncertainty).

We count:
  - True Abstentions  : cone wide + directions ambiguous → abstain (CORRECT)
  - False Directions  : cone wide + directions ambiguous → wrong direction (DANGEROUS)
  - Correct Guidance  : cone narrow + directions clear   → right direction (CORRECT)
"""
import numpy as np
import json
import math
import os

N_TRIALS = 500

# Junction geometry: two candidate paths diverge at JUNCTION_ANGLE degrees apart
JUNCTION_ANGLE_DEG = 45.0  # typical T-junction / fork angle

# Cone angular width = 2 * sigma_theta where sigma_theta is derived from sigma_p
# sigma_theta (degrees) ≈ arctan(sigma_p / distance_to_junction) * 180/pi
DISTANCE_TO_JUNCTION = 15.0  # metres ahead

def sigma_to_cone_width(sigma_p_meters, distance=DISTANCE_TO_JUNCTION):
    """Convert positional uncertainty to Confidence Cone angular half-width (degrees)."""
    theta = math.degrees(math.atan(sigma_p_meters / distance))
    return 2 * theta  # full cone width

def simulate_junction_decision(sigma_p, n_trials):
    """
    For each trial:
    - Generate a noisy heading estimate (true = 0°, noise = sigma_p mapped to angular noise)
    - Compute cone width
    - If cone width > junction angle: ABSTAIN (uncertain)
    - If cone width <= junction angle: COMMIT to a direction
    - Check if committed direction is correct (within ±JUNCTION_ANGLE/2 of truth)
    """
    cone_widths = []
    abstentions = 0
    correct_commits = 0
    wrong_commits = 0

    angular_sigma = math.degrees(math.atan(sigma_p / DISTANCE_TO_JUNCTION))

    for _ in range(n_trials):
        # True bearing to correct turn = 0°. Noisy estimate:
        noisy_heading = np.random.normal(0, angular_sigma)
        cone_width = sigma_to_cone_width(sigma_p)
        cone_widths.append(cone_width)

        if cone_width > JUNCTION_ANGLE_DEG:
            # System abstains: cone is too wide to distinguish turns
            abstentions += 1
        else:
            # System commits: which turn does the noisy heading favour?
            # Two options: 0° (correct) and JUNCTION_ANGLE_DEG (wrong)
            dist_correct = abs(noisy_heading - 0)
            dist_wrong   = abs(noisy_heading - JUNCTION_ANGLE_DEG)
            if dist_correct < dist_wrong:
                correct_commits += 1
            else:
                wrong_commits += 1

    total = n_trials
    return {
        'abstention_rate': round(abstentions / total, 3),
        'correct_commit_rate': round(correct_commits / total, 3),
        'wrong_commit_rate': round(wrong_commits / total, 3),
        'mean_cone_width_deg': round(float(np.mean(cone_widths)), 2),
        'dangerous_wrong_directions': wrong_commits
    }

results = {
    'parameters': {
        'N': N_TRIALS,
        'junction_angle_deg': JUNCTION_ANGLE_DEG,
        'distance_to_junction_m': DISTANCE_TO_JUNCTION
    },
    'conditions': {}
}

sigmas = [3.0, 7.0, 12.0, 20.0]
labels = ['Low (3m)', 'Medium (7m)', 'High (12m)', 'Severe (20m)']

print("Phase 3: Confidence Cone Decision Suppression Simulation")
print(f"Junction angle: {JUNCTION_ANGLE_DEG}°, Distance: {DISTANCE_TO_JUNCTION}m\n")

for sigma, label in zip(sigmas, labels):
    r = simulate_junction_decision(sigma, N_TRIALS)
    results['conditions'][label] = r
    cone_w = sigma_to_cone_width(sigma)
    abstains = 'YES' if cone_w > JUNCTION_ANGLE_DEG else 'NO'
    print(f"sigma={sigma}m | Cone={cone_w:.1f}° | Abstain={abstains}")
    print(f"  Abstention rate  : {r['abstention_rate']*100:.1f}%")
    print(f"  Correct commits  : {r['correct_commit_rate']*100:.1f}%")
    print(f"  Wrong directions : {r['wrong_commit_rate']*100:.1f}%  <- dangerous\n")

os.makedirs('docs', exist_ok=True)
with open('docs/cone_results.json', 'w') as f:
    json.dump(results, f, indent=4)

print("Wrote docs/cone_results.json")
