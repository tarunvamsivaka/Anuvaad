"""
app/compat.py — Runtime compatibility shims for external dependencies.
"""

import sys
import types

# Upstream compatibility shim for razorpay SDK when setuptools >= 82 (which removed pkg_resources).
if "pkg_resources" not in sys.modules:
    try:
        import pkg_resources  # noqa: F401
    except ImportError:

        class _DummyDist:
            version = "1.4.2"

        class _PkgResources(types.ModuleType):
            DistributionNotFound = Exception

            @staticmethod
            def require(*args, **kwargs):
                return [_DummyDist()]

        sys.modules["pkg_resources"] = _PkgResources("pkg_resources")
