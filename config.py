"""Central configuration and illustrative data-center parameters."""
from dataclasses import dataclass
import numpy as np

@dataclass(frozen=True)
class Config:
    n_racks: int = 5
    n_cooling_units: int = 3
    dt_hours: float = 5.0 / 60.0
    duration_hours: float = 8.0
    ambient_c: float = 30.0
    min_temp_c: float = 18.0
    max_temp_c: float = 27.0
    initial_temp_c: float = 22.0
    cooling_max_kw: tuple = (25.0, 25.0, 25.0)
    ramp_limit_kw_per_step: tuple = (25.0, 25.0, 25.0)
    cop0: tuple = (5.5, 5.4, 5.5)
    cop_slope: tuple = (0.025, 0.024, 0.025)
    # Effective rack-zone thermal capacitance, kWh/°C
    thermal_capacitance: tuple = (0.55, 0.60, 0.65, 0.58, 0.55)
    # Effective heat transfer to ambient, kW/°C
    heat_loss_coefficient: tuple = (0.22, 0.24, 0.25, 0.23, 0.22)
    idle_power_kw: tuple = (2.0, 2.0, 3.0, 2.0, 2.0)
    max_power_kw: tuple = (10.0, 12.0, 15.0, 10.0, 12.0)

    @property
    def steps(self) -> int:
        return int(round(self.duration_hours / self.dt_hours))

    @property
    def cooling_max(self) -> np.ndarray:
        return np.asarray(self.cooling_max_kw, dtype=float)

    @property
    def ramp_limit(self) -> np.ndarray:
        return np.asarray(self.ramp_limit_kw_per_step, dtype=float)

    @property
    def A(self) -> np.ndarray:
        # Effective cooling distribution coefficients for three thermal zones.
        # Unit 1 mainly serves racks 1-2, unit 2 serves rack 3, and unit 3
        # mainly serves racks 4-5. Coefficients are calibrated model gains,
        # not literal airflow fractions.
        return np.array([
            [0.40, 0.00, 0.00],
            [0.45, 0.00, 0.00],
            [0.03, 0.65, 0.03],
            [0.00, 0.00, 0.45],
            [0.00, 0.00, 0.40],
        ], dtype=float)

    @property
    def C(self) -> np.ndarray:
        return np.asarray(self.thermal_capacitance, dtype=float)

    @property
    def K(self) -> np.ndarray:
        return np.asarray(self.heat_loss_coefficient, dtype=float)

    @property
    def idle(self) -> np.ndarray:
        return np.asarray(self.idle_power_kw, dtype=float)

    @property
    def pmax(self) -> np.ndarray:
        return np.asarray(self.max_power_kw, dtype=float)

    @property
    def cop0_array(self) -> np.ndarray:
        return np.asarray(self.cop0, dtype=float)

    @property
    def cop_slope_array(self) -> np.ndarray:
        return np.asarray(self.cop_slope, dtype=float)
