import numpy as np
from config import Config
from optimization.constraints import predict_temperature, is_feasible

def test_prediction_shape():
    cfg = Config()
    predicted = predict_temperature(np.array([10., 10., 10.]), np.full(5, 22.),
                                    np.full(5, 5.), cfg)
    assert predicted.shape == (5,)

def test_optimizer_solution_feasibility():
    cfg = Config()
    temp = np.full(5, 22.0)
    heat = np.array([5.2, 9.5, 13.8, 6.4, 5.0])
    prev = np.array([10.0, 10.0, 10.0])
    # A feasible point should satisfy the explicit check.
    assert is_feasible(np.array([12.0, 12.0, 12.0]), temp, heat, prev, cfg)
