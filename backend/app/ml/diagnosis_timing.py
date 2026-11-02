"""Request-local duration capture; never stores photos or personal identifiers."""
from contextlib import contextmanager
from contextvars import ContextVar
from functools import wraps
from time import perf_counter

_current: ContextVar[dict[str, float] | None] = ContextVar("diagnosis_timings", default=None)

@contextmanager
def capture_timings():
    timings: dict[str, float] = {}
    token = _current.set(timings)
    try:
        yield timings
    finally:
        _current.reset(token)

@contextmanager
def measure_stage(name: str):
    timings = _current.get()
    if timings is None:
        yield
        return
    start = perf_counter()
    try:
        yield
    finally:
        timings[name] = timings.get(name, 0.0) + (perf_counter() - start) * 1000

def timed_stage(name: str):
    def decorate(function):
        @wraps(function)
        def wrapped(*args, **kwargs):
            with measure_stage(name):
                return function(*args, **kwargs)
        return wrapped
    return decorate
